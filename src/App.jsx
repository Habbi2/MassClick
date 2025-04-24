import { useState, useEffect } from 'react'
import { Helmet, HelmetProvider } from 'react-helmet-async'
import GameScene from './components/GameScene'
import GameStats from './components/GameStats'
import StartScreen from './components/StartScreen'
import MilestoneNotification from './components/MilestoneNotification'
import useGameStore from './services/gameStore'
import './App.css'

function App() {
  const gameStarted = useGameStore(state => state.gameStarted);
  const totalClicks = useGameStore(state => state.totalClicks);
  const playerCount = useGameStore(state => state.playerCount);
  const currentStage = getEvolutionStage(totalClicks);
  
  // Function to determine the current evolution stage for SEO description
  function getEvolutionStage(clicks) {
    if (clicks >= 500) return "Transcendent Spiral";
    if (clicks >= 200) return "Radiant Vortex";
    if (clicks >= 100) return "Flowing Entity";
    if (clicks >= 50) return "Cosmic Spiral";
    if (clicks >= 25) return "Living Helix";
    if (clicks >= 10) return "Awakening Swirl";
    return "Primordial Spiral";
  }
  
  return (
    <HelmetProvider>
      <div className="app-container">
        <Helmet>
          {/* Dynamic meta tags that update based on game state */}
          <title>
            {gameStarted 
              ? `3D Clicker: ${currentStage} Stage | ${playerCount} Players Online`
              : "3D Multiplayer Clicker Game - Interactive Cosmic Evolution"
            }
          </title>
          <meta name="description" content={
            gameStarted
              ? `Currently at the ${currentStage} evolution stage with ${totalClicks} total clicks. Join ${playerCount} active players!`
              : "Play our addictive 3D multiplayer clicker game with real-time collaboration. Evolve cosmic spirals through collective clicking."
          } />
          {/* LD+JSON data with dynamic content */}
          <script type="application/ld+json">
            {`
              {
                "@context": "https://schema.org",
                "@type": "VideoGame",
                "name": "3D Multiplayer Clicker Game",
                "description": "A web-based multiplayer clicker game with real-time collaboration. Currently at the ${currentStage} evolution stage.",
                "playMode": "MultiPlayer",
                "gameItem": {
                  "@type": "Thing",
                  "name": "${currentStage}"
                },
                "numberOfPlayers": {
                  "@type": "QuantitativeValue",
                  "value": ${playerCount > 0 ? playerCount : 1}
                }
              }
            `}
          </script>
        </Helmet>

        {!gameStarted ? (
          <StartScreen />
        ) : (
          <>
            <div className="game-container" role="application" aria-label="3D Clicker Game Scene">
              <GameScene />
            </div>
            <GameStats />
            <MilestoneNotification />
          </>
        )}
      </div>
    </HelmetProvider>
  )
}

export default App
