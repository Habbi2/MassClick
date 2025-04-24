import { useState, useEffect, useRef } from 'react'
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
  const helmetRef = useRef(null);
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

  // Function to generate LD+JSON content to avoid direct rendering in Helmet
  const generateLdJson = () => {
    return {
      "@context": "https://schema.org",
      "@type": "VideoGame",
      "name": "3D Multiplayer Clicker Game",
      "description": `A web-based multiplayer clicker game with real-time collaboration. Currently at the ${currentStage} evolution stage.`,
      "playMode": "MultiPlayer",
      "gameItem": {
        "@type": "Thing",
        "name": currentStage
      },
      "numberOfPlayers": {
        "@type": "QuantitativeValue",
        "value": playerCount > 0 ? playerCount : 1
      }
    };
  };

  // Throttle Helmet updates to prevent too frequent re-renders that can affect WebGL
  const [helmetData, setHelmetData] = useState({
    title: "3D Multiplayer Clicker Game - Interactive Cosmic Evolution",
    description: "Play our addictive 3D multiplayer clicker game with real-time collaboration. Evolve cosmic spirals through collective clicking."
  });

  useEffect(() => {
    // Throttle Helmet updates to prevent frequent re-renders causing WebGL context loss
    const timeoutId = setTimeout(() => {
      if (gameStarted) {
        setHelmetData({
          title: `3D Clicker: ${currentStage} Stage | ${playerCount} Players Online`,
          description: `Currently at the ${currentStage} evolution stage with ${totalClicks} total clicks. Join ${playerCount} active players!`
        });
      }
    }, 2000); // Update meta tags less frequently
    
    return () => clearTimeout(timeoutId);
  }, [gameStarted, currentStage, playerCount, totalClicks]);
  
  return (
    <HelmetProvider>
      <div className="app-container">
        <Helmet ref={helmetRef}>
          <title>{helmetData.title}</title>
          <meta name="description" content={helmetData.description} />
          <script type="application/ld+json">
            {JSON.stringify(generateLdJson())}
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
