import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import { MeshWobbleMaterial, Html, SpotLight } from '@react-three/drei';
import useGameStore from '../services/gameStore';
import * as THREE from 'three';

// Base evolution stages that define the initial progression
const BASE_EVOLUTION_STAGES = [
  { 
    threshold: 0,
    color: '#3498db',
    complexity: 1,
    arms: 3,
    wobbleFactor: 0.2,
    particles: 5,
    description: 'Primordial Spiral'
  },
  { 
    threshold: 10,
    color: '#9b59b6',
    complexity: 2,
    arms: 3,
    wobbleFactor: 0.3,
    particles: 10,
    description: 'Awakening Swirl'
  },
  { 
    threshold: 25,
    color: '#27ae60',
    complexity: 3,
    arms: 4,
    wobbleFactor: 0.35,
    particles: 15,
    description: 'Living Helix'
  },
  { 
    threshold: 50,
    color: '#f1c40f',
    complexity: 4,
    arms: 4,
    wobbleFactor: 0.4,
    particles: 20,
    description: 'Cosmic Spiral'
  },
  { 
    threshold: 100,
    color: '#e67e22',
    complexity: 5,
    arms: 5,
    wobbleFactor: 0.45,
    particles: 25,
    description: 'Flowing Entity'
  },
  { 
    threshold: 200,
    color: '#e74c3c',
    complexity: 6,
    arms: 5,
    wobbleFactor: 0.5,
    particles: 30,
    description: 'Radiant Vortex'
  },
  { 
    threshold: 500,
    color: '#ffffff',
    complexity: 7,
    arms: 6,
    wobbleFactor: 0.55,
    particles: 40,
    description: 'Transcendent Spiral'
  },
];

// Color palette for infinite evolution (will cycle through these)
const COLOR_PALETTE = [
  '#3498db', '#9b59b6', '#27ae60', '#f1c40f', '#e67e22', 
  '#e74c3c', '#ffffff', '#1abc9c', '#8e44ad', '#2ecc71', 
  '#f39c12', '#d35400', '#c0392b', '#7f8c8d', '#16a085', '#2980b9'
];

// Function to generate the next evolution stage based on previous stage
const generateNextEvolutionStage = (prevStage, stageIndex) => {
  const colorIndex = stageIndex % COLOR_PALETTE.length;
  
  // Calculate next threshold with increasing gaps
  const thresholdMultiplier = Math.floor(stageIndex / 7) + 1;
  const thresholdIncrement = thresholdMultiplier * 500;

  // Spiral properties that change with evolution
  const complexity = 7 + Math.floor(stageIndex / 5);
  const arms = 6 + Math.floor(stageIndex / 8) % 6; // Cycles between 6-11 arms
  
  return {
    threshold: prevStage.threshold + thresholdIncrement,
    color: COLOR_PALETTE[colorIndex],
    complexity: complexity,
    arms: arms,
    wobbleFactor: 0.3 + (stageIndex % 8) * 0.1, // Cycles wobble factor for variety
    particles: Math.min(100, 40 + Math.floor(stageIndex / 2) * 5), // Caps at 100 particles
    description: `Cosmic Spiral ${stageIndex + 1}`
  };
};

// Simple spotlight to ensure the object is well-lit
function ObjectSpotlight({ position, target }) {
  return (
    <SpotLight
      position={position}
      intensity={1}
      distance={10}
      angle={0.5}
      penumbra={0.5}
      target={target}
      castShadow
    />
  );
}

// Create a simple spiral geometry first to ensure visibility
function createSimpleGeometry(complexity = 3, arms = 3) {
  // Start with a basic torus geometry that's guaranteed to be visible
  return new THREE.TorusGeometry(0.7, 0.3, 16, 100);
}

// Enhanced particle effect component with flowing motion and response to group activity
function Particles({ count, color, parentRef, stage, pulseEffect = 0 }) {
  const particles = useRef([]);
  
  useEffect(() => {
    particles.current = Array.from({ length: count }).map(() => ({
      position: [
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3
      ],
      scale: Math.random() * 0.2 + 0.1,
      speed: Math.random() * 0.02 + 0.01,
      offset: Math.random() * Math.PI * 2,
      orbitRadius: 1.2 + Math.random() * 0.8, // Varied orbit radii
      orbitHeight: Math.random() * 0.8 - 0.4, // Varied orbit heights
      phaseOffset: Math.random() * Math.PI * 2 // Random starting position
    }));
  }, [count]);

  useFrame((state, delta) => {
    if (!parentRef.current) return;
    const parentPosition = parentRef.current.position;
    const time = state.clock.elapsedTime;
    
    particles.current.forEach((particle, i) => {
      // Create more organic flowing spiral motion
      const particleSpeed = particle.speed * (1 + pulseEffect * 0.5); // Speed up during pulses
      const angle = time * particleSpeed + particle.phaseOffset;
      const radius = particle.orbitRadius + Math.sin(time * 0.3 + i) * 0.3;
      const height = particle.orbitHeight + Math.sin(time * 0.2 + i * 0.5) * 0.3;
      
      // Base spiral movement
      particle.position[0] = parentPosition.x + Math.sin(angle) * radius;
      particle.position[1] = parentPosition.y + Math.cos(angle) * radius;
      particle.position[2] = parentPosition.z + height;
      
      // Add subtle random flutter
      particle.position[0] += Math.sin(time * 5 + i * 100) * 0.01;
      particle.position[1] += Math.sin(time * 4 + i * 200) * 0.01;
      particle.position[2] += Math.sin(time * 3 + i * 300) * 0.01;
    });
  });

  return (
    <>
      {particles.current.map((particle, i) => (
        <mesh key={i} position={particle.position} scale={particle.scale * (1 + pulseEffect * 0.3)} aria-label={`Particle effects for ${evolutionData.description}`}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshPhongMaterial 
            color={color} 
            emissive={color} 
            emissiveIntensity={0.5 + pulseEffect * 0.5}
            transparent={true}
            opacity={0.8}
          />
        </mesh>
      ))}
    </>
  );
}

// New component for subtle ambient tendrils that react to clicks
function AmbientTendrils({ color, parentRef, activityLevel }) {
  const tendrilsRef = useRef([]);
  const tendrilCount = 6;
  
  useEffect(() => {
    tendrilsRef.current = Array.from({ length: tendrilCount }).map(() => ({
      points: Array.from({ length: 10 }).map(() => new THREE.Vector3()),
      speed: Math.random() * 0.01 + 0.005,
      width: Math.random() * 0.05 + 0.02,
      length: Math.random() * 0.8 + 0.5,
      offset: Math.random() * Math.PI * 2
    }));
  }, []);
  
  useFrame((state, delta) => {
    if (!parentRef.current) return;
    const time = state.clock.elapsedTime;
    
    tendrilsRef.current.forEach((tendril, i) => {
      const angle = time * tendril.speed + tendril.offset;
      const baseLength = tendril.length * (1 + activityLevel * 0.3);
      
      for (let j = 0; j < tendril.points.length; j++) {
        const t = j / (tendril.points.length - 1);
        const segmentAngle = angle + t * Math.PI * 2;
        const radius = t * baseLength;
        
        // Create flowing organic curves
        tendril.points[j].x = Math.sin(segmentAngle + t * 3) * radius * (0.5 + t);
        tendril.points[j].y = Math.cos(segmentAngle + t * 3) * radius * (0.5 + t);
        tendril.points[j].z = Math.sin(segmentAngle * 2) * 0.2 * t;
      }
    });
  });
  
  return (
    <group position={[0, 0, 0]}>
      {tendrilsRef.current.map((tendril, i) => (
        <line key={i} aria-hidden="true">
          <bufferGeometry attach="geometry">
            <float32BufferAttribute 
              attach="attributes-position" 
              count={tendril.points.length} 
              array={new Float32Array(tendril.points.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial 
            attach="material" 
            color={color} 
            linewidth={tendril.width * (1 + activityLevel * 0.5)}
            opacity={0.6 + activityLevel * 0.4}
            transparent={true}
          />
        </line>
      ))}
    </group>
  );
}

const ClickableObject = () => {
  const objectRef = useRef();
  const spotlightTargetRef = useRef();
  // Add this missing reference that was causing issues
  const geometryRef = useRef();
  
  // Use both local and total clicks from game store
  const { handleClick, localClicks, totalClicks, playerCount } = useGameStore();
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [pulseEffect, setPulseEffect] = useState(0);
  const [recentActivityLevel, setRecentActivityLevel] = useState(0);
  const lastTotalClicksRef = useRef(0);
  
  // Generate infinite evolution stages based on the base stages
  const evolutionStages = useMemo(() => {
    // Start with the base stages
    const stages = [...BASE_EVOLUTION_STAGES];
    
    // Generate 50 more stages for virtually infinite progression
    const additionalStagesCount = 50;
    
    for (let i = 0; i < additionalStagesCount; i++) {
      const prevStage = stages[stages.length - 1];
      const nextStage = generateNextEvolutionStage(prevStage, stages.length);
      stages.push(nextStage);
    }
    
    return stages;
  }, []);
  
  // Find current evolution stage based on TOTAL clicks (collective progression)
  const getCurrentStage = () => {
    // Find the highest stage threshold that all players collectively reached
    for (let i = evolutionStages.length - 1; i >= 0; i--) {
      if (totalClicks >= evolutionStages[i].threshold) {
        return i;
      }
    }
    return 0;
  };
  
  const currentStage = getCurrentStage();
  const evolutionData = evolutionStages[currentStage];
  const nextStageIndex = currentStage + 1;
  const hasNextStage = nextStageIndex < evolutionStages.length;
  
  // Track click activity and create pulsing effects when others click
  useEffect(() => {
    // If totalClicks changed but not because of local clicks, someone else clicked
    if (totalClicks > lastTotalClicksRef.current) {
      const clickDelta = totalClicks - lastTotalClicksRef.current;
      
      // Only trigger effect for external clicks
      if (clickDelta > 0) {
        // Create a pulse effect
        setPulseEffect(Math.min(1, clickDelta * 0.2));
        
        // Gradually reduce the pulse effect
        setTimeout(() => {
          setPulseEffect(0);
        }, 800);
        
        // Update activity level based on recent clicks
        setRecentActivityLevel(prev => Math.min(1, prev + clickDelta * 0.1));
        
        // Gradually reduce activity level
        setTimeout(() => {
          setRecentActivityLevel(prev => Math.max(0, prev - 0.1));
        }, 2000);
      }
    }
    
    lastTotalClicksRef.current = totalClicks;
  }, [totalClicks]);
  
  // Check for milestone to show - based on total clicks now
  useEffect(() => {
    const showMilestone = useGameStore.getState().showMilestone;
    evolutionStages.forEach(stage => {
      if (totalClicks === stage.threshold) {
        // Milestone reached
        showMilestone(`Evolution: ${stage.description}`, 'The collective energy has triggered a new stage of evolution!');
      }
    });
  }, [totalClicks, evolutionStages]);
  
  // Create/update the spiral geometry when evolution stage changes
  useEffect(() => {
    if (geometryRef.current) {
      geometryRef.current.dispose();
    }
    geometryRef.current = createSimpleGeometry(
      evolutionData.complexity,
      evolutionData.arms
    );
  }, [evolutionData.complexity, evolutionData.arms]);
  
  // Animation for hover, click, and evolution stage transitions
  const { 
    scale, 
    rotation, 
    color, 
    emissiveIntensity,
    wobbleFactor
  } = useSpring({
    scale: hovered 
      ? clicked 
        ? [0.9, 0.9, 0.9] 
        : [1.1, 1.1, 1.1] 
      : [1, 1, 1],
    rotation: hovered 
      ? [0, Math.PI, 0] 
      : [0, 0, 0],
    color: clicked 
      ? evolutionData.color 
      : hovered 
        ? '#ff7e5f' 
        : evolutionData.color,
    emissiveIntensity: clicked ? 1.5 : hovered ? 1.2 : 1,
    wobbleFactor: evolutionData.wobbleFactor * (1 + pulseEffect * 0.3),
    config: { mass: 1, tension: 170, friction: 26 }
  });
  
  // Animate the object continuously with organic motion
  useFrame((state) => {
    if (!objectRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    // More organic flowing rotation
    objectRef.current.rotation.x = Math.sin(time * 0.3) * 0.1 + Math.sin(time * 0.7) * 0.03;
    objectRef.current.rotation.z = Math.cos(time * 0.2) * 0.1 + Math.cos(time * 0.5) * 0.02;
    
    // Base rotation speed influenced by activity level and player count
    const baseRotationSpeed = 0.1;
    const activityBoost = recentActivityLevel * 0.15;
    const playerCountFactor = Math.min(1, playerCount * 0.1);
    objectRef.current.rotation.y += (baseRotationSpeed + activityBoost + playerCountFactor) * state.clock.getDelta();
    
    // Organic breathing and pulsating effect
    const basePulse = Math.sin(time * 2) * 0.05;
    const activityPulse = pulseEffect * 0.1 * Math.sin(time * 10);
    const breathingPulse = Math.sin(time * 0.5) * 0.03;
    
    // Scale increases with evolution stage
    const baseScale = 1 + (currentStage % 10) * 0.1;
    const finalScale = baseScale + basePulse + activityPulse + breathingPulse;
    
    objectRef.current.scale.set(
      finalScale * (1 + Math.sin(time * 0.3) * 0.02), // Slightly non-uniform scaling
      finalScale * (1 + Math.sin(time * 0.4) * 0.02), // for more organic look
      finalScale * (1 + Math.sin(time * 0.5) * 0.02)
    );
  });

  // Enhanced click handler with more pronounced visual feedback
  const onClickObject = () => {
    setClicked(true);
    
    // Apply immediate visual boost
    setPulseEffect(1);
    
    // Call the game store handler that will update local clicks and emit to server
    handleClick();
    
    // Reset clicked state
    setTimeout(() => setClicked(false), 150);
    
    // Gradually reduce pulse effect
    setTimeout(() => setPulseEffect(0.5), 100);
    setTimeout(() => setPulseEffect(0.2), 300);
    setTimeout(() => setPulseEffect(0), 500);
  };

  // Calculate progress to next stage based on total clicks
  const calculateNextStageProgress = () => {
    if (!hasNextStage) return 100;
    
    const nextThreshold = evolutionStages[nextStageIndex].threshold;
    const currentThreshold = evolutionData.threshold;
    const range = nextThreshold - currentThreshold;
    const progress = ((totalClicks - currentThreshold) / range) * 100;
    
    return Math.min(100, Math.max(0, progress));
  };

  // Create a THREE.Object3D for the spotlight target
  const spotlightTarget = useMemo(() => new THREE.Object3D(), []);
  
  // Position the spotlight target properly
  useEffect(() => {
    spotlightTarget.position.set(0, 0, 0);
  }, [spotlightTarget]);

  return (
    <>
      {/* Spotlight to illuminate the object */}
      <group position={[0, 3, 2]}>
        <primitive object={spotlightTarget} />
        <ObjectSpotlight position={[0, 3, 3]} target={spotlightTarget} />
      </group>
      
      {/* Additional point light attached directly to the object for guaranteed visibility */}
      <pointLight position={[0, 0, 0]} intensity={2.5} color="#ffffff" distance={8} />

      {/* Main clickable object - guaranteed to be visible */}
      <animated.mesh
        ref={objectRef}
        position={[0, 0, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          setShowDescription(true);
        }}
        onPointerOut={() => {
          setHovered(false);
          setTimeout(() => setShowDescription(false), 1500);
        }}
        onClick={onClickObject}
        scale={scale}
        rotation={rotation}
        castShadow
        receiveShadow
      >
        {/* Use a more visible geometry and material */}
        <sphereGeometry args={[1.5, 32, 32]} />
        <animated.meshBasicMaterial 
          color={color}
          transparent={false}
          opacity={1.0}
        />
      </animated.mesh>
      
      {/* Add a second, more basic mesh with guaranteed visibility */}
      <mesh
        position={[0, 0, 0]}
        scale={[1.55, 1.55, 1.55]}
        aria-label={`${evolutionData.description} object`}
        role="button"
        tabIndex={0}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshPhongMaterial 
          color={evolutionData.color} 
          transparent={true}
          opacity={0.5}
          emissive={evolutionData.color}
          emissiveIntensity={1.5}
        />
      </mesh>
      
      {/* Ambient tendrils that react to activity */}
      <AmbientTendrils 
        color={evolutionData.color} 
        parentRef={objectRef} 
        activityLevel={recentActivityLevel}
        aria-hidden="true"
      />
      
      {/* Evolution stage particles with enhanced realism */}
      <Particles 
        count={evolutionData.particles} 
        color={evolutionData.color} 
        parentRef={objectRef}
        stage={currentStage}
        pulseEffect={pulseEffect}
        aria-label={`Particle effects for ${evolutionData.description}`}
      />
      
      {/* Evolution stage info tooltip - now shows total and local clicks */}
      {showDescription && (
        <Html position={[0, 1.8, 0]} center>
          <div style={{
            background: 'rgba(0,0,0,0.7)',
            padding: '8px 12px',
            borderRadius: '4px',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            opacity: showDescription ? 1 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none'
          }}>
            <div style={{ fontWeight: 'bold' }}>{evolutionData.description}</div>
            <div>Collective Clicks: {totalClicks}</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Your Contribution: {localClicks} clicks</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              {hasNextStage
                ? `Next evolution at ${evolutionStages[nextStageIndex].threshold} collective clicks` 
                : 'Generating next cosmic evolution...'}
            </div>
            {/* Progress bar to next evolution */}
            <div style={{ 
              width: '100%', 
              height: '4px', 
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '2px',
              marginTop: '4px'
            }}>
              <div style={{ 
                width: `${calculateNextStageProgress()}%`, 
                height: '100%', 
                background: evolutionData.color,
                borderRadius: '2px',
                transition: 'width 0.5s ease-out'
              }} />
            </div>
          </div>
        </Html>
      )}
    </>
  );
};

export default ClickableObject;