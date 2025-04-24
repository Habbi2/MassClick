import { create } from 'zustand';
import { emitClick, socket, setPlayerName as emitPlayerName } from './socketService';

const useGameStore = create((set, get) => ({
  // Player info
  playerCount: 0,
  totalClicks: 0,
  localClicks: 0,
  playerRanking: [],
  isConnected: socket.connected, // Initialize with the actual connection state
  playerName: '',

  // UI state
  gameStarted: false,
  milestoneInfo: null,
  showingMilestone: false,
  screenEffects: {
    shake: false,
    flash: false,
  },

  // Actions
  startGame: () => set({ gameStarted: true }),
  handleClick: () => {
    // Update local state immediately for responsiveness
    set(state => ({ localClicks: state.localClicks + 1 }));
    // Emit the click to the server
    emitClick();
  },
  
  // Set player name and emit to server
  setPlayerName: (name) => {
    set({ playerName: name });
    emitPlayerName(name);
  },
  
  // Update from server
  updateGameState: (gameState) => {
    const rankings = Object.values(gameState.players)
      .sort((a, b) => b.clicks - a.clicks);
    
    set({
      totalClicks: gameState.totalClicks,
      playerCount: gameState.activePlayers,
      playerRanking: rankings,
    });
  },

  // Connection state updates
  setPlayerCount: (count) => set({ playerCount: count }),
  setConnected: (connected) => set({ isConnected: connected }),
  
  // Milestone & progression system
  showMilestone: (title, description) => {
    set({
      milestoneInfo: { title, description },
      showingMilestone: true,
      screenEffects: {
        shake: true,
        flash: true,
      }
    });
    
    // Auto hide milestone after delay
    setTimeout(() => {
      set(state => ({
        showingMilestone: false,
        screenEffects: {
          shake: false,
          flash: false,
        }
      }));
    }, 3000);
  },
  
  // Hide milestone manually
  hideMilestone: () => set({ showingMilestone: false }),
  
  // Apply screen effects (shake, flash, etc)
  applyScreenEffect: (effect, duration = 1000) => {
    set(state => ({
      screenEffects: {
        ...state.screenEffects,
        [effect]: true,
      }
    }));
    
    setTimeout(() => {
      set(state => ({
        screenEffects: {
          ...state.screenEffects,
          [effect]: false,
        }
      }));
    }, duration);
  }
}));

export default useGameStore;