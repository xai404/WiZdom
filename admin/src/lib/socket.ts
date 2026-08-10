import { io, type Socket } from 'socket.io-client';
import { API_ORIGIN } from '../config/api';

let socket: Socket | null = null;
let currentToken: string | null = null;

// Idempotent — calling this again with the same token (e.g. from a
// component effect that doesn't know whether AuthContext already
// connected) just returns the existing connection instead of opening a
// second one.
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
  socket = io(API_ORIGIN, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

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
