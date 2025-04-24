import { io } from 'socket.io-client';

// Create socket connection to server
// Define multiple server URLs to try in case the primary one fails
const SOCKET_URLS = {
  primary: import.meta.env.PROD 
    ? 'wss://massclick.onrender.com' // Primary production WebSocket server
    : 'http://localhost:3001',
  backup: import.meta.env.PROD
    ? 'wss://mass-click-server.herokuapp.com' // Backup production server
    : 'http://localhost:3001',
  fallback: import.meta.env.PROD
    ? 'https://massclick.onrender.com' // HTTP fallback if WSS fails
    : 'http://localhost:3001'
};

// Start with the primary URL
let currentSocketUrl = SOCKET_URLS.primary;

// Add offline mode flag
export let offlineMode = false;

// Create socket instance but don't connect immediately
export const socket = io(currentSocketUrl, {
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 20000,
  autoConnect: false, // Don't connect automatically
  transports: ['websocket', 'polling'] // Try websocket first, fallback to polling
});

// Local game state for offline mode
const offlineGameState = {
  totalClicks: 0,
  activePlayers: 1,
  players: {
    'local-player': {
      id: 'local-player',
      name: 'You',
      clicks: 0
    }
  }
};

// Function to manually connect and handle connection issues
export const connectSocket = () => {
  // For itch.io deployed games, default to offline mode to ensure playability
  if (window.location.hostname.includes('itch.io') || 
      window.location.hostname.includes('itchio')) {
    console.log('Running on itch.io, enabling offline mode automatically');
    offlineMode = true;
    return Promise.resolve({ offline: true });
  }
  
  console.log(`Attempting to connect to ${currentSocketUrl}...`);
  
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
        
        // Set another timeout for the polling attempt
        setTimeout(() => {
          if (!socket.connected) {
            // Try the backup URL if available
            if (currentSocketUrl === SOCKET_URLS.primary) {
              console.warn('Primary server connection failed, trying backup server...');
              socket.disconnect();
              currentSocketUrl = SOCKET_URLS.backup;
              socket.io.uri = currentSocketUrl;
              socket.io.opts.transports = ['websocket', 'polling'];
              socket.connect();
            } 
            // Try HTTP fallback if WSS failed
            else if (currentSocketUrl === SOCKET_URLS.backup) {
              console.warn('Backup server connection failed, trying HTTP fallback...');
              socket.disconnect();
              currentSocketUrl = SOCKET_URLS.fallback;
              socket.io.uri = currentSocketUrl;
              socket.io.opts.transports = ['polling']; // Force polling for HTTP
              socket.connect();
            }
            // If all connection attempts fail, enable offline mode
            else {
              console.warn('All connection attempts failed, switching to offline mode');
              offlineMode = true;
              resolve({ offline: true });
            }
          }
        }, 5000);
      }
    }, 5000);
    
    socket.on('connect', () => {
      clearTimeout(connectionTimeout);
      console.log('Socket connected successfully!');
      offlineMode = false;
      resolve(socket);
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      // Don't reject immediately to allow fallback attempts
    });
  });
};

// Socket event listeners
export const setupSocketListeners = (callbacks) => {
  // If in offline mode, set up local game state updates
  if (offlineMode) {
    console.log('Setting up offline mode event handlers');
    
    // Simulate initial connection
    setTimeout(() => {
      if (callbacks.onConnect) {
        callbacks.onConnect();
      }
      
      // Send initial game state
      if (callbacks.onGameStateUpdate) {
        callbacks.onGameStateUpdate(offlineGameState);
      }
      
      // Send player count
      if (callbacks.onPlayerCountUpdate) {
        callbacks.onPlayerCountUpdate(1);
      }
    }, 500);
    
    return () => {
      console.log('Cleaned up offline event handlers');
    };
  }

  // Online mode - use socket listeners
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
  if (offlineMode) {
    // Update local game state for offline mode
    offlineGameState.totalClicks++;
    offlineGameState.players['local-player'].clicks++;
    return;
  }
  
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
  if (offlineMode) {
    // Update local player name for offline mode
    offlineGameState.players['local-player'].name = name;
    return;
  }
  
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