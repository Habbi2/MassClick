import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../services/gameStore';

export default function MilestoneNotification() {
  const { milestoneInfo, showingMilestone, screenEffects } = useGameStore();
  const [isVisible, setIsVisible] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState(null);
  const [userInteracted, setUserInteracted] = useState(false);
  const audioRef = useRef(null);
  
  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/achievement.mp3');
    audioRef.current.volume = 0.4;
    
    // Listen for user interaction
    const handleInteraction = () => {
      setUserInteracted(true);
      // Remove listeners after first interaction
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
    
    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);
  
  // Track milestone visibility
  useEffect(() => {
    if (showingMilestone && milestoneInfo) {
      setCurrentMilestone(milestoneInfo);
      setIsVisible(true);
      
      // Vibrate device if supported (mobile haptic feedback)
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 200]);
      }
      
      // Play achievement sound only if user has interacted
      if (userInteracted && audioRef.current) {
        audioRef.current.play().catch(err => console.log("Audio play failed:", err));
      }
    } else {
      // Hide with animation
      setIsVisible(false);
    }
  }, [showingMilestone, milestoneInfo, userInteracted]);

  // Screen shake effect
  const shakeAnimation = screenEffects?.shake ? {
    x: [0, -10, 10, -10, 10, -5, 5, 0],
    transition: { duration: 0.5 }
  } : {};
  
  // Flash effect
  const flashAnimation = screenEffects?.flash ? {
    opacity: [0, 0.8, 0.2, 0.8, 0],
    transition: { duration: 1 }
  } : { opacity: 0 };

  return (
    <>
      {/* Full screen flash effect */}
      <AnimatePresence>
        {screenEffects?.flash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={flashAnimation}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'white',
              pointerEvents: 'none',
              zIndex: 1000
            }}
          />
        )}
      </AnimatePresence>
      
      {/* Achievement popup */}
      <AnimatePresence>
        {isVisible && currentMilestone && (
          <motion.div 
            className="milestone-popup"
            initial={{ y: -100, opacity: 0 }}
            animate={{ 
              y: 0, 
              opacity: 1,
              ...shakeAnimation
            }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ 
              type: 'spring',
              stiffness: 300,
              damping: 20
            }}
          >
            <div className="milestone-icon">🏆</div>
            <div className="milestone-title">{currentMilestone.title}</div>
            <div className="milestone-text">{currentMilestone.description}</div>
            
            {/* Confetti effect */}
            <div className="confetti-container">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div 
                  key={i}
                  className="confetti"
                  initial={{ 
                    top: 0,
                    left: `${Math.random() * 100}%`, 
                    width: `${Math.random() * 10 + 5}px`,
                    height: `${Math.random() * 10 + 5}px`,
                    backgroundColor: `hsl(${Math.random() * 360}, 100%, 50%)`
                  }}
                  animate={{ 
                    top: '100vh', 
                    rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
                    left: `${Math.random() * 100}%`
                  }}
                  transition={{ 
                    duration: 2 + Math.random() * 3,
                    ease: "easeOut"
                  }}
                  style={{
                    position: 'absolute',
                    borderRadius: `${Math.random() > 0.5 ? '50%' : '0%'}`,
                    opacity: 0.8
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}