const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

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
    // Unlike the REST API's HTTP CORS (app.js), this deliberately reflects
    // any Origin rather than checking against an allowlist. Origin is a
    // browser-enforced concept — a non-browser client (the mobile app) can
    // send whatever Origin string it likes, so checking it here blocks
    // legitimate traffic (React Native's WebSocket sends the Metro dev
    // server's own address as Origin, e.g. http://192.168.x.x:8081, which
    // will essentially never match a hardcoded allowlist) without adding
    // real protection against a forged one. The actual access control for
    // sockets is the JWT check in authenticateSocket below, unaffected by
    // this.
    cors: {
      origin: true,
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
// succeeded. senderId is always staff-only metadata. `department` is
// staff-only ONLY when an admin set it (internal routing); a department the
// STUDENT themselves tagged is their own choice, so it's kept for the
// student-room copy — same split as studentChatController.getMyChat's
// `delete m.department` (admin-only) vs `delete m.senderId` (always).
function emitChatMessage(message, studentId) {
  if (!io) return;

  const payload = buildChatMessagePayload(message, studentId);

  const studentPayload = { ...payload };
  delete studentPayload.senderId;
  if (studentPayload.sender === 'admin') delete studentPayload.department;

  io.to(`student:${studentId}`).emit('chat:new-message', studentPayload);
  io.to('staff').emit('chat:new-message', payload);
}

// Emits after a journey stage's status is saved — only the affected
// student needs this; the admin who made the change already has the
// result from the PATCH response, so (unlike chat) this doesn't also go
// to the "staff" room.
function emitProgressUpdate(studentId, stage) {
  if (!io) return;

  io.to(`student:${studentId}`).emit('student:progress-updated', {
    studentId: studentId.toString(),
    title: stage.title,
    status: stage.status,
    updatedAt: stage.updatedAt,
  });
}

function getIO() {
  if (!io) throw new Error('Socket.IO has not been initialized yet');
  return io;
}

module.exports = { initSocket, getIO, emitChatMessage, emitProgressUpdate };
