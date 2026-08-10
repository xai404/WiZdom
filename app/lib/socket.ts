import { io, type Socket } from 'socket.io-client';

import { API_BASE_URL } from '@/constants/config';

let socket: Socket | null = null;
let currentToken: string | null = null;

// Idempotent — a component effect that re-runs (e.g. chat-context reacting
// to a token change) can call this safely without ever opening a second
// connection for the same token.
export function connectSocket(token: string): Socket {
  if (socket && currentToken === token) {
    if (!socket.connected) socket.connect();
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  currentToken = token;
  // 'websocket' only — RN's global WebSocket makes this reliable in both
  // Expo Go and a Development/production build, and skips socket.io's
  // default long-polling-then-upgrade handshake.
  socket = io(API_BASE_URL, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  // Connection-state visibility — cheap and non-functional, but the only
  // way to tell "socket never connected on this device/build" apart from
  // "connected fine, something else is wrong" when debugging a report like
  // "real-time isn't updating". Safe to leave in permanently.
  socket.on('connect', () => console.log('[socket] connected', socket?.id));
  socket.on('disconnect', (reason) => console.log('[socket] disconnected:', reason));
  socket.on('connect_error', (err) => console.log('[socket] connect_error:', err.message));

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  socket = null;
  currentToken = null;
}

export function getSocket(): Socket | null {
  return socket;
}
