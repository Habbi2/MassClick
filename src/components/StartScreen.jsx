import React, { useState, useEffect } from 'react';
import useGameStore from '../services/gameStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function StartScreen() {
  const [playerName, setPlayerName] = useState('');
  const [isNameValid, setIsNameValid] = useState(true);
  const [showDescription, setShowDescription] = useState(true);
  const [highlightEffect, setHighlightEffect] = useState(false);
  const { startGame, setPlayerName: storePlayerName } = useGameStore();
  
  // Apply highlight effect to the title periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setHighlightEffect(true);
      setTimeout(() => setHighlightEffect(false), 1000);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStartGame = () => {
    // Validate player name
    if (playerName.trim().length > 0) {
      storePlayerName(playerName.trim());
      startGame();
    } else {
      // Generate a random player name
      const randomName = `Player${Math.floor(Math.random() * 1000)}`;
      storePlayerName(randomName);
      startGame();
    }
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setPlayerName(value);
    // Basic validation - just checking if not empty
    setIsNameValid(value.trim().length > 0);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleStartGame();
    }
  };

  return (
    <motion.div 
      className="start-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <motion.div 
        className="start-content"
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        {/* Animated title with glow effect */}
        <motion.h1 
          className={`game-title ${highlightEffect ? 'highlight-effect' : ''}`}
          animate={{
            textShadow: highlightEffect 
              ? '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(100,200,255,0.6)' 
              : '0 0 10px rgba(255,255,255,0.3), 0 0 20px rgba(100,200,255,0.3)'
          }}
        >
          <span className="title-3d">3D</span> CLICKER
        </motion.h1>
        
        <motion.h2 
          className="subtitle"
          animate={{ 
            color: ['#94ffff', '#94f7ff', '#94e1ff', '#94cdff', '#94b3ff', '#94ffff'],
          }}
          transition={{ duration: 5, repeat: Infinity }}
        >
          Multiplayer Edition
        </motion.h2>
        
        {/* Game description with toggle */}
        <motion.div 
          className="game-description-container"
          onClick={() => setShowDescription(!showDescription)}
        >
          <motion.h3 whileHover={{ scale: 1.05 }}>
            {showDescription ? '▼ Game Info ▼' : '▶ Game Info ▶'}
          </motion.h3>
          
          <AnimatePresence>
            {showDescription && (
              <motion.div
                className="game-description"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p>Click the spinning 3D object as many times as you can!</p>
                <p>Compete with other players in real-time.</p>
                <p>Unlock new shapes, colors and effects as you progress!</p>
                <p>Fast clicks = More points!</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
        {/* Player name input with animation */}
        <motion.div 
          className="name-input-container"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <motion.div
            className="input-wrapper"
            animate={{ 
              boxShadow: isNameValid 
                ? '0 0 10px rgba(80, 200, 255, 0.5)' 
                : '0 0 10px rgba(255, 80, 80, 0.5)'
            }}
          >
            <motion.input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={handleNameChange}
              onKeyPress={handleKeyPress}
              className={`name-input ${!isNameValid ? 'invalid' : ''}`}
              maxLength={15}
              whileFocus={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            />
          </motion.div>
          <p className="name-helper">
            {playerName.trim() ? '' : 'A random name will be generated if left blank'}
          </p>
        </motion.div>
        
        {/* Start button with hover effects */}
        <motion.button 
          className="start-button"
          onClick={handleStartGame}
          whileHover={{ 
            scale: 1.05,
            backgroundColor: '#00c3ff',
            boxShadow: '0 0 15px rgba(0, 195, 255, 0.7)'
          }}
          whileTap={{ scale: 0.95 }}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
        >
          START GAME
        </motion.button>
        
        {/* Decorative elements */}
        <div className="decorative-elements">
          <motion.div 
            className="floating-shape shape-1"
            animate={{
              y: [0, -10, 0],
              rotate: [0, 180, 360]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="floating-shape shape-2"
            animate={{
              y: [0, 10, 0],
              rotate: [0, -180, -360]
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="floating-shape shape-3"
            animate={{
              y: [-5, 5, -5],
              x: [5, -5, 5],
              rotate: [0, 360, 0]
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}