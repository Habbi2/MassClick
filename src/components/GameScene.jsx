import React, { useEffect, useState, Suspense, useMemo, useRef, useCallback, Component } from 'react';
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
import { setupSocketListeners, socket, connectSocket, offlineMode } from '../services/socketService';
import useGameStore from '../services/gameStore';

// New Camera Controller component for enhanced camera behavior
function CameraController({ totalClicks, screenEffects }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();
  const [cameraPreset, setCameraPreset] = useState('default');
  const lastShakeTime = useRef(0);
  const initialPos = useRef([0, 0, 8]);
  const targetPos = useRef([0, 0, 8]);
  const transitionSpeed = useRef(0.05);
  
  // Camera presets that users can switch between
  const cameraPresets = {
    default: { position: [0, 0, 8], fov: 60, minDistance: 3, maxDistance: 20 },
    close: { position: [0, 0, 5], fov: 50, minDistance: 2, maxDistance: 10 },
    wide: { position: [3, 2, 12], fov: 75, minDistance: 5, maxDistance: 25 },
    overhead: { position: [0, 5, 5], fov: 60, minDistance: 3, maxDistance: 20 },
    artistic: { position: [4, -2, 6], fov: 45, minDistance: 3, maxDistance: 15 },
  };
  
  // Listen for keyboard shortcuts to change camera presets
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Number keys 1-5 for camera presets
      if (e.key >= '1' && e.key <= '5') {
        const presetKeys = Object.keys(cameraPresets);
        const index = parseInt(e.key) - 1;
        if (index < presetKeys.length) {
          switchCameraPreset(presetKeys[index]);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Set up adaptive camera behaviors based on gameplay state
  useEffect(() => {
    if (totalClicks > 0) {
      // For more experienced players with higher clicks, gradually unlock more dynamic camera
      const dynamicFactor = Math.min(1, totalClicks / 1000);
      
      if (controlsRef.current) {
        // Make rotation smoother with higher clicks
        controlsRef.current.rotateSpeed = 0.5 + dynamicFactor * 0.5;
        
        // Increase damping for smoother movement as player progresses
        controlsRef.current.enableDamping = true;
        controlsRef.current.dampingFactor = 0.05 + dynamicFactor * 0.1;
      }
      
      // Adjust transition speed based on player progression
      transitionSpeed.current = 0.05 + dynamicFactor * 0.03;
    }
  }, [totalClicks]);
  
  // Function to switch between camera presets with smooth transitions
  const switchCameraPreset = useCallback((presetName) => {
    if (cameraPresets[presetName]) {
      const preset = cameraPresets[presetName];
      setCameraPreset(presetName);
      
      // Store current position as initial position for transition
      initialPos.current = [camera.position.x, camera.position.y, camera.position.z];
      targetPos.current = preset.position;
      
      // Update camera FOV
      camera.fov = preset.fov;
      camera.updateProjectionMatrix();
      
      // Update orbit controls constraints
      if (controlsRef.current) {
        controlsRef.current.minDistance = preset.minDistance;
        controlsRef.current.maxDistance = preset.maxDistance;
      }
      
      // Show visual feedback about camera change
      const infoElement = document.createElement('div');
      infoElement.textContent = `Camera: ${presetName}`;
      infoElement.style.position = 'absolute';
      infoElement.style.bottom = '10px';
      infoElement.style.left = '10px';
      infoElement.style.background = 'rgba(0,0,0,0.5)';
      infoElement.style.color = 'white';
      infoElement.style.padding = '5px 10px';
      infoElement.style.borderRadius = '4px';
      infoElement.style.fontFamily = 'Arial, sans-serif';
      infoElement.style.fontSize = '14px';
      infoElement.style.opacity = '0';
      infoElement.style.transition = 'opacity 0.3s ease';
      
      gl.domElement.parentElement.appendChild(infoElement);
      
      // Fade in
      setTimeout(() => { infoElement.style.opacity = '1'; }, 10);
      
      // Remove after delay
      setTimeout(() => {
        infoElement.style.opacity = '0';
        setTimeout(() => {
          if (infoElement.parentNode) {
            infoElement.parentNode.removeChild(infoElement);
          }
        }, 300);
      }, 2000);
    }
  }, [camera, gl.domElement]);
  
  // Add shake effect to camera
  const shakeCamera = useCallback((intensity = 1.0, duration = 300) => {
    const now = Date.now();
    lastShakeTime.current = now;
    
    // Don't add multiple shakes in a short timeframe
    if (now - lastShakeTime.current < duration) {
      return;
    }
    
    const initialCameraPosition = [camera.position.x, camera.position.y, camera.position.z];
    
    // Define the shake animation
    let startTime = Date.now();
    const animateShake = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        // Create a random offset based on intensity that decreases over time
        const remaining = 1 - (elapsed / duration);
        const shakeIntensity = intensity * remaining;
        
        camera.position.x = initialCameraPosition[0] + (Math.random() - 0.5) * shakeIntensity;
        camera.position.y = initialCameraPosition[1] + (Math.random() - 0.5) * shakeIntensity;
        camera.position.z = initialCameraPosition[2] + (Math.random() - 0.5) * shakeIntensity;
        
        requestAnimationFrame(animateShake);
      } else {
        // Restore original position
        camera.position.set(...initialCameraPosition);
      }
    };
    
    animateShake();
  }, [camera]);
  
  // Apply camera effects based on game state
  useEffect(() => {
    if (screenEffects?.shake) {
      shakeCamera(0.2);
    }
  }, [screenEffects, shakeCamera]);
  
  // Main camera animation loop - smooth transitions between positions
  useFrame((state, delta) => {
    // Smooth transitions between camera positions
    if (targetPos.current && initialPos.current) {
      const lerpFactor = transitionSpeed.current;
      
      camera.position.x += (targetPos.current[0] - camera.position.x) * lerpFactor;
      camera.position.y += (targetPos.current[1] - camera.position.y) * lerpFactor;
      camera.position.z += (targetPos.current[2] - camera.position.z) * lerpFactor;
    }
    
    // Dynamic subtle camera movement when fully evolved (high click count)
    if (totalClicks > 500 && controlsRef.current) {
      const t = state.clock.getElapsedTime();
      
      // Add gentle, organic floating movement
      const floatX = Math.sin(t * 0.2) * 0.3;
      const floatY = Math.cos(t * 0.1) * 0.2;
      
      camera.position.x += (floatX - camera.position.x) * 0.01;
      camera.position.y += (floatY - camera.position.y) * 0.01;
      
      // Update controls target for better orbital behavior
      if (controlsRef.current.target) {
        const targetX = Math.sin(t * 0.05) * 0.5;
        const targetY = Math.sin(t * 0.03) * 0.3;
        
        controlsRef.current.target.x = targetX;
        controlsRef.current.target.y = targetY;
      }
    }
  });
  
  // Create UI for camera presets
  useEffect(() => {
    const cameraUi = document.createElement('div');
    cameraUi.className = 'camera-controls';
    cameraUi.style.position = 'absolute';
    cameraUi.style.top = '10px';
    cameraUi.style.left = '10px';
    cameraUi.style.display = 'flex';
    cameraUi.style.gap = '4px';
    cameraUi.style.zIndex = '100';
    
    Object.keys(cameraPresets).forEach((preset, index) => {
      const button = document.createElement('button');
      button.textContent = `C${index + 1}`;
      button.title = `Camera ${preset}`;
      button.style.background = preset === cameraPreset ? 'rgba(107, 136, 255, 0.8)' : 'rgba(0, 0, 0, 0.5)';
      button.style.color = 'white';
      button.style.border = 'none';
      button.style.borderRadius = '4px';
      button.style.padding = '4px 6px';
      button.style.fontSize = '10px';
      button.style.cursor = 'pointer';
      button.style.opacity = '0.7';
      button.style.transition = 'all 0.2s ease';
      button.style.minWidth = '24px';
      button.style.height = '24px';
      button.style.display = 'flex';
      button.style.alignItems = 'center';
      button.style.justifyContent = 'center';
      
      button.addEventListener('mouseenter', () => {
        button.style.opacity = '1';
        button.style.transform = 'scale(1.1)';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.opacity = '0.7';
        button.style.transform = 'scale(1)';
      });
      
      button.addEventListener('click', () => {
        // Update all button styles
        document.querySelectorAll('.camera-controls button').forEach(btn => {
          btn.style.background = 'rgba(0, 0, 0, 0.5)';
        });
        button.style.background = 'rgba(107, 136, 255, 0.8)';
        
        // Switch camera preset
        switchCameraPreset(preset);
      });
      
      cameraUi.appendChild(button);
    });
    
    gl.domElement.parentElement.appendChild(cameraUi);
    
    return () => {
      if (cameraUi.parentNode) {
        cameraUi.parentNode.removeChild(cameraUi);
      }
    };
  }, [gl.domElement, switchCameraPreset, cameraPreset]);
  
  return (
    <OrbitControls 
      ref={controlsRef}
      enableZoom={true} 
      enablePan={false}
      enableRotate={true}
      minDistance={cameraPresets[cameraPreset].minDistance} 
      maxDistance={cameraPresets[cameraPreset].maxDistance}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      autoRotate={totalClicks > 400} 
      autoRotateSpeed={0.5 + Math.min(1.5, totalClicks / 2000)}
    />
  );
}

// Error Boundary to catch and handle Three.js rendering errors
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    console.log("Three.js error caught:", error);
    console.log("Error details:", errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="webgl-error">
          <h2>Rendering error occurred</h2>
          <p>We're having trouble displaying the 3D scene. Please refresh the page or try a different browser.</p>
        </div>
      );
    }
    
    return this.props.children;
  }
}

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

  return <color attach="background" args={[bgColor]} />;
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

// Performance monitoring component
function PerformanceMonitor() {
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
}

// Main game scene component
export default function GameScene() {
  const { 
    updateGameState, 
    setPlayerCount, 
    setConnected,
    totalClicks,
    screenEffects
  } = useGameStore();
  
  const [cameraPosition, setCameraPosition] = useState([0, 0, 8]);
  const [fovValue, setFovValue] = useState(60);
  const [sunPosition, setSunPosition] = useState([0, 1, 8]);
  const lightRef = useRef();
  const frameRef = useRef(null);
  const [contextLost, setContextLost] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [renderFallback, setRenderFallback] = useState(false);

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
        
        // Set a timer to attempt recovery
        setTimeout(() => {
          setRenderFallback(true);
        }, 2000);
      });

      // Handle WebGL context restoration
      canvas.addEventListener('webglcontextrestored', () => {
        console.log('WebGL context restored');
        setContextLost(false);
        setRenderFallback(false);
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

  // Setup socket connection and listeners for multiplayer functionality
  useEffect(() => {
    console.log("Setting up socket connection...");
    
    // Attempt to connect to the socket server
    connectSocket()
      .then(() => {
        console.log("Socket connected successfully via connectSocket");
        setConnected(true);
      })
      .catch(error => {
        console.error("Socket connection failed:", error);
        setConnected(false);
        
        // Try reconnecting a few times with increasing delays
        if (connectionAttempts < 3) {
          const retryDelay = (connectionAttempts + 1) * 3000;
          console.log(`Will retry connection in ${retryDelay/1000} seconds...`);
          
          setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
            connectSocket().catch(() => console.log("Retry failed"));
          }, retryDelay);
        }
      });
    
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
        console.log("Socket connection established");
      },
      onDisconnect: () => {
        setConnected(false);
        console.log("Socket connection lost");
      }
    });

    // Cleanup function to disconnect socket when component unmounts
    return () => {
      cleanup();
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [updateGameState, setPlayerCount, setConnected, connectionAttempts]);

  // Dynamic camera and environment adjustments with requestAnimationFrame
  // instead of continuous useEffect updates to be more performance-friendly
  useEffect(() => {
    let animationId;
    const updateCameraPosition = () => {
      try {
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
      } catch (error) {
        console.error("Error in animation frame:", error);
        // Stop animation on error
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
        setRenderFallback(true);
      }
    };
    
    // Start the animation frame loop
    frameRef.current = requestAnimationFrame(updateCameraPosition);
    
    // Clean up
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [totalClicks, contextLost]);

  // Get environment preset based on progression
  const getEnvironmentPreset = () => {
    if (totalClicks > 3000) return "night";
    if (totalClicks > 1000) return "sunset";
    if (totalClicks > 500) return "dawn";
    return "warehouse";
  };

  // If WebGL context is completely lost and recovery failed, show a fallback
  if (renderFallback) {
    return (
      <div className="webgl-fallback">
        <h2>3D Rendering Unavailable</h2>
        <p>Your browser is unable to render the 3D scene. Please try refreshing or using a different browser.</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Canvas 
        shadows 
        dpr={[1, 1.5]} // Lower pixel ratio to improve performance
        gl={{ 
          powerPreference: "high-performance",
          antialias: false, // Disable antialiasing for performance
          stencil: false,
          depth: true,
          failIfMajorPerformanceCaveat: false, // Don't fail on low-performance devices
          preserveDrawingBuffer: true // Help with context restoration
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
              
              // Add better error handling for extensions
              window.addEventListener('error', (e) => {
                if (e.error && (
                  e.error.toString().includes('THREE') || 
                  e.error.toString().includes('WebGL')
                )) {
                  console.error('Caught WebGL/Three.js error:', e.error);
                  setRenderFallback(true);
                  return true; // Prevent default browser error handling
                }
                return false;
              });
              
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
            intensity={1.5} 
            color="#ffffff" 
            distance={15}
            decay={2}
          />
          {/* Add direct spotlight on the clickable object to ensure it's visible from the start */}
          <spotLight
            position={[0, 5, 5]}
            angle={0.5}
            penumbra={0.5}
            intensity={2}
            castShadow
            shadow-bias={-0.0001}
            target-position={[0, 0, 0]}
            color="#ffffff"
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
          <CosmicDust count={Math.min(1000, 500 + totalClicks / 10)} totalClicks={totalClicks} />
          <OrbitalRings totalClicks={totalClicks} />
          <ClickableObject />
          <CameraController totalClicks={totalClicks} screenEffects={screenEffects} />
        </Suspense>
      </Canvas>
    </ErrorBoundary>
  );
}