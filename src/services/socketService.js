import { io } from 'socket.io-client';

// Create socket connection to server
// In development, use localhost. In production, use the Vercel deployment URL
const SOCKET_URL = import.meta.env.PROD 
  ? window.location.origin 
  : 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  path: import.meta.env.PROD ? '/api/socket' : undefined,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: true,
  transports: ['websocket', 'polling']
});

// Socket event listeners
export const setupSocketListeners = (callbacks) => {
  // Handle game state updates
  socket.on('gameState', (gameState) => {
    if (callbacks.onGameStateUpdate) {
      callbacks.onGameStateUpdate(gameState);
    }
  });

  // Handle player count updates
  socket.on('playerCount', (count) => {
    if (callbacks.onPlayerCountUpdate) {
      callbacks.onPlayerCountUpdate(count);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (callbacks.onDisconnect) {
      callbacks.onDisconnect();
    }
  });

  // Handle reconnection
  socket.on('connect', () => {
    if (callbacks.onConnect) {
      callbacks.onConnect();
    }
  });

  // Make sure we handle connection errors
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    if (callbacks.onDisconnect) {
      callbacks.onDisconnect();
    }
  });

  return () => {
    socket.off('gameState');
    socket.off('playerCount');
    socket.off('disconnect');
    socket.off('connect');
    socket.off('connect_error');
  };
};

// Emit click event to server
export const emitClick = () => {
  if (socket.connected) {
    socket.emit('click');
  }
};

// Emit player name to server
export const setPlayerName = (name) => {
  if (socket.connected) {
    socket.emit('setPlayerName', name);
  } else {
    // Store name to send once connected
    socket.once('connect', () => {
      socket.emit('setPlayerName', name);
    });
  }
};