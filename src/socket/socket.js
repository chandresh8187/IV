import { io } from 'socket.io-client';

export const socket = io('https://app.ivsquarestructure.com', {
  transports: ['polling', 'websocket'],
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  timeout: 20000,
});
