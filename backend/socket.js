const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Same allowlist app.js uses for HTTP CORS — a browser (the Admin Panel)
// must appear here; the mobile app and server-to-server calls send no
// Origin header at all and are always allowed, same as app.js's cors().
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

let io = null;

// Verifies the JWT the same way authMiddleware.protect does, and attaches
// { id, role } to the socket so downstream handlers can room-scope it.
function authenticateSocket(socket, next) {
  const token =
    socket.handshake.auth?.token ||
    (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '') ||
    null;

  if (!token) {
    return next(new Error('Not authorized, no token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    socket.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (error) {
    next(new Error('Not authorized, token invalid or expired'));
  }
}

// Attaches Socket.IO to the existing HTTP server (same port as Express —
// no second server/port). Students join a room scoped to their own id;
// every staff account (super_admin + any employee role) joins a shared
// "staff" room, mirroring blockStudents' any-staff-role access pattern
// used across the admin routes.
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const { id, role } = socket.user;
    if (role === 'student') {
      socket.join(`student:${id}`);
    } else {
      socket.join('staff');
    }
  });

  return io;
}

// Builds the wire payload for a newly saved chat message. Accepts either a
// live Mongoose document or the plain object attachReadStatus() already
// produced (both controllers compute one of those right after
// Message.create) — no extra DB round trip needed to emit.
function buildChatMessagePayload(message, studentId) {
  const obj = typeof message.toObject === 'function' ? message.toObject() : message;
  return {
    _id: obj._id.toString(),
    studentId: studentId.toString(),
    sender: obj.sender,
    senderName: obj.senderName,
    senderRole: obj.senderRole ?? null,
    senderId: obj.senderId ? obj.senderId.toString() : null,
    text: obj.text,
    stage: obj.stage ?? null,
    department: obj.department ?? null,
    replyTo: obj.replyTo ? obj.replyTo.toString() : null,
    readByStudent: obj.readByStudent,
    readByAdmin: obj.readByAdmin,
    fullyRead: obj.fullyRead,
    pinned: obj.pinned,
    deleted: obj.deleted,
    createdAt: obj.createdAt,
  };
}

// Emits a just-saved chat message to the student's own room and to every
// connected staff member, in both directions (admin-sent and
// student-sent) — called only after Message.create() has already
// succeeded. senderId/department are staff-only metadata (see
// studentChatController.getMyChat's `.select('-department')` and its
// `delete m.senderId`), so the student-room copy strips them the same way
// the REST response already does.
function emitChatMessage(message, studentId) {
  if (!io) return;

  const payload = buildChatMessagePayload(message, studentId);

  const studentPayload = { ...payload };
  delete studentPayload.senderId;
  delete studentPayload.department;

  io.to(`student:${studentId}`).emit('chat:new-message', studentPayload);
  io.to('staff').emit('chat:new-message', payload);
}

function getIO() {
  if (!io) throw new Error('Socket.IO has not been initialized yet');
  return io;
}

module.exports = { initSocket, getIO, emitChatMessage };
