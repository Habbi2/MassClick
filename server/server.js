const { createServer } = require('http');
const { Server } = require('socket.io');

// Game state
let gameState = {
  totalClicks: 0,
  activePlayers: 0,
  players: {}
};

// For Vercel, we need to export a function that sets up the server
const setupSocketIO = (req, res) => {
  if (res.socket.server.io) {
    console.log('Socket is already running');
    res.end();
    return;
  }

  // Create server using the existing server instance
  const io = new Server(res.socket.server, {
    path: '/socket.io/',
    cors: {
      origin: "*", // In production, limit this to your domain
      methods: ["GET", "POST"]
    },
    addTrailingSlash: false
  });
  
  res.socket.server.io = io;

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('New player connected:', socket.id);
    gameState.activePlayers++;
    gameState.players[socket.id] = {
      id: socket.id,
      name: `Player_${socket.id.substring(0, 4)}`, // Default name until player sets one
      clicks: 0,
      lastClick: Date.now()
    };

    // Send current game state to new player
    socket.emit('gameState', gameState);
    
    // Broadcast new player to others
    io.emit('playerCount', gameState.activePlayers);
    
    // Handle player setting their name
    socket.on('setPlayerName', (name) => {
      if (gameState.players[socket.id]) {
        gameState.players[socket.id].name = name;
        // Broadcast updated game state with new player name
        io.emit('gameState', gameState);
      }
    });
    
    // Handle click event
    socket.on('click', () => {
      gameState.totalClicks++;
      gameState.players[socket.id].clicks++;
      gameState.players[socket.id].lastClick = Date.now();
      
      // Broadcast updated game state
      io.emit('gameState', gameState);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Player disconnected:', socket.id);
      gameState.activePlayers--;
      delete gameState.players[socket.id];
      io.emit('playerCount', gameState.activePlayers);
    });
  });

  console.log('Socket server initialized');
  res.end();
};

// For local development, create a standalone server
if (process.env.NODE_ENV !== 'production') {
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  
  // Reuse the same socket.io connection logic
  io.on('connection', (socket) => {
    console.log('New player connected:', socket.id);
    gameState.activePlayers++;
    gameState.players[socket.id] = {
      id: socket.id,
      name: `Player_${socket.id.substring(0, 4)}`,
      clicks: 0,
      lastClick: Date.now()
    };
    socket.emit('gameState', gameState);
    io.emit('playerCount', gameState.activePlayers);
    
    socket.on('setPlayerName', (name) => {
      if (gameState.players[socket.id]) {
        gameState.players[socket.id].name = name;
        io.emit('gameState', gameState);
      }
    });
    
    socket.on('click', () => {
      gameState.totalClicks++;
      gameState.players[socket.id].clicks++;
      gameState.players[socket.id].lastClick = Date.now();
      io.emit('gameState', gameState);
    });

    socket.on('disconnect', () => {
      console.log('Player disconnected:', socket.id);
      gameState.activePlayers--;
      delete gameState.players[socket.id];
      io.emit('playerCount', gameState.activePlayers);
    });
  });

  const PORT = process.env.PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel serverless environment
module.exports = (req, res) => {
  if (req.method === 'POST') {
    setupSocketIO(req, res);
  } else {
    // For GET requests, just acknowledge
    res.end('Socket.io server is running');
  }
};