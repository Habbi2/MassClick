import { io } from 'socket.io-client';

// Create socket connection to server
// In development, use localhost. In production, use the external WebSocket server URL
const SOCKET_URL = import.meta.env.PROD 
  ? 'wss://massclick.onrender.com' // Using secure WebSocket protocol
  : 'http://localhost:3001';

// Create socket instance but don't connect immediately
export const socket = io(SOCKET_URL, {
  reconnectionAttempts: 10, // Increased retry attempts
  reconnectionDelay: 1000,
  timeout: 20000, // Increased timeout
  autoConnect: false, // Don't connect automatically
  transports: ['websocket', 'polling'] // Try websocket first, fallback to polling
});

// Function to manually connect and handle connection issues
export const connectSocket = () => {
  console.log(`Attempting to connect to ${SOCKET_URL}...`);
  
  // Try to connect
  socket.connect();
  
  return new Promise((resolve, reject) => {
    // Set a connection timeout
    const connectionTimeout = setTimeout(() => {
      if (!socket.connected) {
        console.warn('Socket connection timed out, trying polling fallback...');
        // If websocket fails, try with polling only
        socket.io.opts.transports = ['polling'];
        socket.connect();
      }
    }, 5000);
    
    socket.on('connect', () => {
      clearTimeout(connectionTimeout);
      console.log('Socket connected successfully!');
      resolve(socket);
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      // We don't reject here to allow reconnection attempts
    });
  });
};

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
  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${reason}`);
    if (callbacks.onDisconnect) {
      callbacks.onDisconnect(reason);
    }
    
    // Attempt to reconnect if the server closed the connection
    if (reason === 'io server disconnect') {
      socket.connect();
    }
  });

  // Handle reconnection
  socket.on('connect', () => {
    console.log('Socket connected/reconnected');
    if (callbacks.onConnect) {
      callbacks.onConnect();
    }
  });

  // Make sure we handle connection errors
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    if (callbacks.onDisconnect) {
      callbacks.onDisconnect(error);
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
  } else {
    console.warn('Socket not connected, click event not sent');
    // Try to reconnect
    socket.connect();
  }
};

// Emit player name to server
export const setPlayerName = (name) => {
  if (socket.connected) {
    socket.emit('setPlayerName', name);
  } else {
    console.log('Socket not connected, queueing setPlayerName event');
    // Store name to send once connected
    socket.once('connect', () => {
      console.log('Socket now connected, sending queued setPlayerName event');
      socket.emit('setPlayerName', name);
    });
  }
};