const { Server } = require('socket.io');

// Game state
let gameState = {
  totalClicks: 0,
  activePlayers: 0,
  players: {}
};

module.exports = function SocketHandler(req, res) {
  // Check if Socket.io server is already initialized
  if (res.socket.server.io) {
    console.log('Socket is already running');
    res.end();
    return;
  }

  // Set up Socket.io server
  const io = new Server(res.socket.server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Store the Socket.io server instance
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
}