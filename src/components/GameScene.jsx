import React, { useEffect, useState, Suspense, useMemo, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  Stars,
  Environment, 
  useTexture, 
  PerspectiveCamera, 
  Sparkles,
  Trail,
  Float,
  Sky,
  useHelper
} from '@react-three/drei';
import * as THREE from 'three';
import ClickableObject from './ClickableObject';
import { setupSocketListeners, socket } from '../services/socketService';
import useGameStore from '../services/gameStore';

// Background visual component with adaptive colors and patterns
function Background() {
  const totalClicks = useGameStore(state => state.totalClicks);
  const [bgColor, setBgColor] = useState('#010124');
  
  // Change background color based on global progression with smoother transitions
  useEffect(() => {
    if (totalClicks > 100) setBgColor('#0e1a3d');
    if (totalClicks > 300) setBgColor('#2a0e3d');
    if (totalClicks > 500) setBgColor('#3d0e2a');
    if (totalClicks > 1000) setBgColor('#0e3d2a');
    if (totalClicks > 2000) setBgColor('#3d3d0e');
    if (totalClicks > 5000) setBgColor('#2a0e1a');
  }, [totalClicks]);

  return <color attach="background" args={[bgColor]} />
}

// Cosmic dust particle system
function CosmicDust({ count = 500, totalClicks }) {
  const positions = useMemo(() => {
    const positions = [];
    for (let i = 0; i < count; i++) {
      const distance = Math.pow(Math.random(), 1.5) * 15 + 3;
      const theta = THREE.MathUtils.randFloatSpread(360);
      const phi = THREE.MathUtils.randFloatSpread(360);
      
      positions.push(
        distance * Math.sin(theta) * Math.cos(phi),
        distance * Math.sin(theta) * Math.sin(phi),
        distance * Math.cos(theta)
      );
    }
    return new Float32Array(positions);
  }, [count]);
  
  // Dynamic color based on progression
  const getParticleColor = () => {
    if (totalClicks > 2000) return "#ff7b00";
    if (totalClicks > 1000) return "#4ca1ff";
    if (totalClicks > 500) return "#ff3a7d";
    if (totalClicks > 100) return "#9c61ff";
    return "#2d72ff";
  };

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05 + Math.min(0.05, totalClicks / 50000)}
        color={getParticleColor()}
        sizeAttenuation
        transparent
        opacity={0.8}
      />
    </points>
  );
}

// Orbital rings that appear at higher progression levels
function OrbitalRings({ totalClicks }) {
  const ringRef = useRef();
  const visible = totalClicks > 800;
  
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.x = state.clock.getElapsedTime() * 0.05;
      ringRef.current.rotation.z = state.clock.getElapsedTime() * 0.03;
    }
  });

  if (!visible) return null;
  
  return (
    <group ref={ringRef}>
      <mesh>
        <torusGeometry args={[9, 0.2, 16, 100]} />
        <meshStandardMaterial 
          color="#ff9000" 
          emissive="#ff4500" 
          emissiveIntensity={0.3}
          transparent
          opacity={0.7}
        />
      </mesh>
      <mesh rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[12, 0.1, 16, 100]} />
        <meshStandardMaterial 
          color="#4169e1" 
          emissive="#0000ff" 
          emissiveIntensity={0.3}
          transparent
          opacity={0.5}
        />
      </mesh>
    </group>
  );
}

// Sparkle effects that increase with progression
function EnhancedSparkles({ totalClicks }) {
  // Calculate parameters based on progression
  const count = Math.min(2000, 100 + totalClicks / 10);
  const size = 2 + Math.min(3, totalClicks / 1000);
  
  return (
    <Sparkles
      count={count}
      size={size}
      scale={[20, 20, 20]}
      speed={0.3}
      opacity={0.2}
      noise={1.5}
      color={totalClicks > 1000 ? "#ff9d00" : "#8866ff"}
    />
  );
}

// Main game scene component
export default function GameScene() {
  const { 
    updateGameState, 
    setPlayerCount, 
    setConnected,
    totalClicks
  } = useGameStore();
  
  const [cameraPosition, setCameraPosition] = useState([0, 0, 8]);
  const [fovValue, setFovValue] = useState(60);
  const [sunPosition, setSunPosition] = useState([0, 1, 8]);
  const lightRef = useRef();
  const frameRef = useRef(null);
  const [contextLost, setContextLost] = useState(false);

  // Add WebGL context event listeners
  const handleContextEvents = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      // Handle WebGL context loss
      canvas.addEventListener('webglcontextlost', (event) => {
        console.log('WebGL context lost, preventing default behavior');
        event.preventDefault();
        setContextLost(true);
        
        // Cancel any animation frames
        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
      });

      // Handle WebGL context restoration
      canvas.addEventListener('webglcontextrestored', () => {
        console.log('WebGL context restored');
        setContextLost(false);
      });
    }
  }, []);

  useEffect(() => {
    // Setup context event listeners after mount
    handleContextEvents();
    
    // Cleanup function
    return () => {
      // Cancel any pending animation frames on unmount
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [handleContextEvents]);

  // Setup socket listeners for multiplayer functionality
  useEffect(() => {
    // Check initial connection state
    setConnected(socket.connected);
    
    const cleanup = setupSocketListeners({
      onGameStateUpdate: (gameState) => {
        updateGameState(gameState);
      },
      onPlayerCountUpdate: (count) => {
        setPlayerCount(count);
      },
      onConnect: () => {
        setConnected(true);
      },
      onDisconnect: () => {
        setConnected(false);
      }
    });

    return cleanup;
  }, [updateGameState, setPlayerCount, setConnected]);

  // Dynamic camera and environment adjustments with requestAnimationFrame
  // instead of continuous useEffect updates to be more performance-friendly
  useEffect(() => {
    let animationId;
    const updateCameraPosition = () => {
      if (totalClicks > 250) {
        const cameraMovementFactor = Math.min(3, 1.5 + (totalClicks / 10000));
        setCameraPosition([
          Math.sin(Date.now() * 0.0001) * cameraMovementFactor, 
          Math.cos(Date.now() * 0.0001) * cameraMovementFactor, 
          5 + Math.sin(Date.now() * 0.00005) * 0.5
        ]);
        
        setFovValue(70 + Math.sin(Date.now() * 0.0002) * 5);
        
        setSunPosition([
          Math.sin(Date.now() * 0.00008) * 10,
          Math.abs(Math.sin(Date.now() * 0.00005) * 5) + 1,
          Math.cos(Date.now() * 0.00008) * 10
        ]);
      }
      // Only schedule next frame if not context lost
      if (!contextLost) {
        frameRef.current = requestAnimationFrame(updateCameraPosition);
      }
    };
    
    // Start the animation frame loop
    frameRef.current = requestAnimationFrame(updateCameraPosition);
    
    // Clean up
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [totalClicks, contextLost]);

  // Performance monitoring component
  const PerformanceMonitor = () => {
    const { gl } = useThree();
    
    useEffect(() => {
      // Lower resolution for weak devices
      if (gl.capabilities.maxTextureSize < 8192) {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      }
      
      // Additional performance optimizations
      gl.setClearColor(0x000000, 0);
      gl.setSize(window.innerWidth, window.innerHeight);
    }, [gl]);
    
    return null;
  };

  // Get environment preset based on progression
  const getEnvironmentPreset = () => {
    if (totalClicks > 3000) return "night";
    if (totalClicks > 1000) return "sunset";
    if (totalClicks > 500) return "dawn";
    return "warehouse";
  };

  return (
    <Canvas 
      shadows 
      dpr={[1, 1.5]} // Lower pixel ratio to improve performance
      gl={{ 
        powerPreference: "high-performance",
        antialias: false, // Disable antialiasing for performance
        stencil: false,
        depth: true
      }}
      style={{ width: '100%', height: '100%' }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color('#010124'));
        // Access the actual WebGL context properly
        const context = gl.getContext();
        if (context) {
          // Now try to enable extensions for better memory management
          try {
            context.getExtension('WEBGL_lose_context');
            context.getExtension('WEBGL_debug_renderer_info');
          } catch (e) {
            console.log('WebGL extension not supported:', e);
          }
        }
      }}
    >
      <Suspense fallback={null}>
        <PerformanceMonitor />
        
        {/* Dynamic camera */}
        <PerspectiveCamera makeDefault position={cameraPosition} fov={fovValue} />
        
        {/* Rest of the component remains unchanged */}
        <Background />
        
        {/* Advanced lighting setup */}
        <ambientLight intensity={0.8} />
        
        <directionalLight 
          ref={lightRef}
          position={sunPosition} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={[1024, 1024]} // Reduced for performance
          shadow-bias={-0.0001}
          color={totalClicks > 1000 ? "#ffa500" : "#ffffff"}
        />
        
        <directionalLight 
          position={[-10, -6, -5]} 
          intensity={0.5} 
          color={totalClicks > 500 ? "#9c61ff" : "#2d9da8"}
        />
        
        <pointLight 
          position={[0, 3, 0]} 
          intensity={0.8} 
          color="#ff7a00" 
          distance={15}
          decay={2}
        />
        
        <Stars 
          radius={100} 
          depth={60} 
          count={totalClicks > 1000 ? 5000 : 3000} // Reduced for performance 
          factor={totalClicks > 500 ? 7 : 5} 
          saturation={0.8} 
          fade 
          speed={1.5} 
        />
        
        {totalClicks > 400 && (
          <Sky
            distance={450000}
            sunPosition={sunPosition}
            inclination={0.5}
            azimuth={0.25}
            mieCoefficient={0.001}
            mieDirectionalG={0.8}
            rayleigh={totalClicks > 1000 ? 1 : 2}
            turbidity={10}
          />
        )}
        
        <Environment preset={getEnvironmentPreset()} />
        
        <EnhancedSparkles totalClicks={totalClicks} />
        <CosmicDust count={Math.min(1000, 500 + totalClicks / 10)} totalClicks={totalClicks} /> {/* Adaptive particle count */}
        <OrbitalRings totalClicks={totalClicks} />
        
        <ClickableObject />
        
        <OrbitControls 
          enableZoom={true} 
          enablePan={false}
          enableRotate={true}
          minDistance={3} 
          maxDistance={Math.min(20, 10 + totalClicks / 1000)}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          autoRotate={totalClicks > 400} 
          autoRotateSpeed={0.5 + Math.min(1.5, totalClicks / 2000)}
        />
      </Suspense>
    </Canvas>
  );
}