import { useState, useEffect } from 'react'
import GameScene from './components/GameScene'
import GameStats from './components/GameStats'
import StartScreen from './components/StartScreen'
import MilestoneNotification from './components/MilestoneNotification'
import useGameStore from './services/gameStore'
import './App.css'

function App() {
  const gameStarted = useGameStore(state => state.gameStarted);
  
  return (
    <div className="app-container">
      {!gameStarted ? (
        <StartScreen />
      ) : (
        <>
          <div className="game-container">
            <GameScene />
          </div>
          <GameStats />
          <MilestoneNotification />
        </>
      )}
    </div>
  )
}

export default App
