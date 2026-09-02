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
    edited: obj.edited ?? false,
    createdAt: obj.createdAt,
  };
}

// Strips the staff-only fields off a chat payload before it goes to the
// student's room — same split emitChatMessage applies to a new message.
function toStudentChatPayload(payload) {
  const studentPayload = { ...payload };
  delete studentPayload.senderId;
  if (studentPayload.sender === 'admin') delete studentPayload.department;
  return studentPayload;
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

  io.to(`student:${studentId}`).emit('chat:new-message', toStudentChatPayload(payload));
  io.to('staff').emit('chat:new-message', payload);
}

// Emits after an EXISTING chat message changes in place — an edit (new
// text + `edited`), a soft-delete (`deleted`), or a pin toggle. Same
// student/staff room split as emitChatMessage; listeners replace the
// message by `_id` rather than appending. Called only after the change is
// persisted.
function emitChatMessageUpdated(message, studentId) {
  if (!io) return;

  const payload = buildChatMessagePayload(message, studentId);

  io.to(`student:${studentId}`).emit('chat:message-updated', toStudentChatPayload(payload));
  io.to('staff').emit('chat:message-updated', payload);
}

// Emits after an admin hard-clears a student's entire Group Chat thread
// (adminChatController.clearStudentChat) so both the student app and every
// staff chat view empty the thread immediately instead of on their next poll.
function emitChatThreadCleared(studentId) {
  if (!io) return;

  const payload = { studentId: studentId.toString() };
  io.to(`student:${studentId}`).emit('chat:thread-cleared', payload);
  io.to('staff').emit('chat:thread-cleared', payload);
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

// Emits after an admin edits a student's own record (name, contact info,
// payment status, pipeline status, etc. — see studentsController.updateStudent)
// so the signed-in student's app reflects the change immediately instead of
// waiting for their next login/getMe. Uses the same student-facing
// toSafeObject(false) shape the app already stores as its AuthUser, so the
// listener can apply the payload directly.
function emitStudentProfileUpdated(student) {
  if (!io) return;

  const payload = student.toSafeObject(false);
  io.to(`student:${student._id}`).emit('student:profile-updated', {
    ...payload,
    id: payload.id.toString(),
  });
}

// Emits after a staff-facing Notification row is created (see
// utils/notify.js) so the Admin Panel's notification bell updates in real
// time instead of waiting for its next 15s poll. Payload is deliberately
// minimal — a ping telling the bell to re-fetch, keeping the server the
// single source of truth for per-account scoping and the unread count.
function emitStaffNotification(notification) {
  if (!io) return;

  io.to('staff').emit('notification:new', {
    _id: notification._id ? notification._id.toString() : null,
    type: notification.type ?? null,
    department: notification.department ?? null,
    createdAt: notification.createdAt ?? new Date().toISOString(),
  });
}

// Emits after a STUDENT-facing Notification row is created (see
// utils/notify.js) so the app's Notifications screen / bell updates in real
// time instead of depending entirely on an Expo push landing (Expo Go, OS
// battery optimizations, denied permissions all break that). Payload is
// deliberately minimal — a ping telling the app to re-fetch, keeping the
// server the single source of truth for the list and unread count. Mirrors
// emitStaffNotification, scoped to the student's own room.
function emitStudentNotification(notification, studentId) {
  if (!io) {
    console.log('[socket] emitStudentNotification skipped — io not initialised');
    return;
  }

  const room = `student:${studentId}`;
  const clients = io.sockets.adapter.rooms.get(room);
  console.log(
    `[socket] emit notification:new -> ${room} (${clients ? clients.size : 0} connected client(s))`
  );

  io.to(room).emit('notification:new', {
    studentId: studentId.toString(),
    _id: notification._id ? notification._id.toString() : null,
    type: notification.type ?? null,
    stage: notification.stage ?? null,
    createdAt: notification.createdAt ?? new Date().toISOString(),
  });
}

function getIO() {
  if (!io) throw new Error('Socket.IO has not been initialized yet');
  return io;
}

module.exports = {
  initSocket,
  getIO,
  emitChatMessage,
  emitChatMessageUpdated,
  emitChatThreadCleared,
  emitProgressUpdate,
  emitStudentProfileUpdated,
  emitStaffNotification,
  emitStudentNotification,
};
