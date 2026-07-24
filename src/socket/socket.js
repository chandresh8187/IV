import { io } from 'socket.io-client';
import Config from 'react-native-config';

export const socket = io(Config.SOCKET_URL, {
  transports: ['polling', 'websocket'],
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  timeout: 20000,
});
