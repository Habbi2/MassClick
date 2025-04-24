import React, { useState, useEffect } from 'react';
import useGameStore from '../services/gameStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function GameStats() {
  const { 
    localClicks,
    totalClicks, 
    playerCount, 
    isConnected,
    playerName,
    playerRanking
  } = useGameStore();

  // State to track if stats panel is minimized
  const [isMinimized, setIsMinimized] = useState(true);
  // State to track click speed for feedback
  const [clickSpeed, setClickSpeed] = useState(0);
  // Store previous click count to calculate speed
  const [prevClicks, setPrevClicks] = useState(0);
  // Keep track of the last time we recorded a click change
  const [lastCheckTime, setLastCheckTime] = useState(Date.now());
  // State to detect small screens for even more compact UI
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // Calculate the player's ranking position
  const currentPlayerRank = playerRanking.findIndex(player => player.name === playerName) + 1;

  // Toggle stats panel visibility
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Check screen size on mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth <= 425);
    };
    
    // Check on initial load
    checkScreenSize();
    
    // Add resize listener
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // Calculate click speed (clicks per minute)
  useEffect(() => {
    const now = Date.now();
    const elapsedTimeSec = (now - lastCheckTime) / 1000;
    
    if (localClicks > prevClicks && elapsedTimeSec > 0) {
      // Calculate clicks per minute based on time since last check
      const newSpeed = Math.round((localClicks - prevClicks) / elapsedTimeSec * 60);
      setClickSpeed(newSpeed);
      setPrevClicks(localClicks);
      setLastCheckTime(now);
    }
    
    // Reset speed if no clicks in last 3 seconds
    const resetInterval = setTimeout(() => {
      if (localClicks === prevClicks) {
        setClickSpeed(0);
      }
    }, 3000);
    
    return () => clearTimeout(resetInterval);
  }, [localClicks, prevClicks, lastCheckTime]);

  // Determine color class based on click speed
  const getSpeedClass = () => {
    if (clickSpeed > 100) return 'speed-high';
    if (clickSpeed > 50) return 'speed-med';
    return 'speed-low';
  };

  return (
    <motion.div 
      className={`game-stats ${isMinimized ? 'stats-collapsed' : ''}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Collapsible container */}
      <div className="stats-container">
        {/* Connection status indicator - always visible even when minimized */}
        <div className="connection-status">
          <div 
            className="status-indicator"
            style={{ backgroundColor: isConnected ? '#4eff4e' : '#ff4e4e' }}
          />
          {isConnected ? (
            isSmallScreen ? 
              `${playerCount} ${playerCount === 1 ? 'player' : 'players'}` : 
              `Connected (${playerCount} ${playerCount === 1 ? 'player' : 'players'})`
          ) : 'Offline'}
        </div>

        {/* Essential stats - compact but informative */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="stats-item your-clicks">
                <span>Your Clicks</span>
                <span className="value-highlight personal">{localClicks}</span>
              </div>

              {/* Only show click speed if actively clicking */}
              {clickSpeed > 0 && (
                <div className="stats-item click-speed">
                  <span>Speed</span>
                  <span className={`value-highlight ${getSpeedClass()}`}>
                    {clickSpeed}/min
                  </span>
                </div>
              )}

              <div className="stats-item">
                <span>Global</span>
                <span className="value-highlight global">{totalClicks}</span>
              </div>

              {/* Only show player rankings if there are other players */}
              {playerCount > 1 && playerRanking.length > 0 && (
                <div className="player-ranking">
                  <h3>Top Players</h3>
                  <ul className="ranking-list">
                    {playerRanking.slice(0, isSmallScreen ? 2 : 10).map((player, index) => (
                      <li key={player.id} className={player.name === playerName ? 'current-player' : ''}>
                        <span className="rank">#{index + 1}</span>
                        <span className="name">{player.name}</span>
                        <span className="clicks">{player.clicks}</span>
                      </li>
                    ))}
                  </ul>
                  {currentPlayerRank > (isSmallScreen ? 2 : 10) && (
                    <div className="your-rank">
                      Your Rank: #{currentPlayerRank} / {playerRanking.length}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toggle button - styled as a pill */}
      <motion.button 
        className="stats-toggle"
        onClick={toggleMinimize}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isMinimized ? '▼' : '▲'}
      </motion.button>

      {/* Pull handle indicator when minimized */}
      <div className="stats-handle" onClick={toggleMinimize}>
        {isMinimized && '• • •'}
      </div>
    </motion.div>
  );
}