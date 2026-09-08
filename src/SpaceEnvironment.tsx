import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

interface SpaceObject {
  mesh: THREE.Object3D;
  velocity: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
  originalOpacity: number;
  fadeStart: number;
  fadeEnd: number;
  type: string;
}

export default function SpaceEnvironment() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'free' | 'auto'>('auto');
  const [showInstructions, setShowInstructions] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const modeRef = useRef<'free' | 'auto'>('auto');
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef({ x: 0, y: 0, isLocked: false });
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0));
  const eulerRef = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const objectsRef = useRef<SpaceObject[]>([]);
  const starLayersRef = useRef<THREE.Points[]>([]);
  const clockRef = useRef(new THREE.Clock());
  const animFrameRef = useRef<number>(0);
  const lastAutoYawRef = useRef(0);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const createStarLayer = useCallback((radius: number, count: number, size: number, opacity: number): THREE.Points => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.5 + Math.random() * 0.5);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const colorChoice = Math.random();
      if (colorChoice < 0.25) {
        colors[i * 3] = 0.7 + Math.random() * 0.3;
        colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 2] = 1.0;
      } else if (colorChoice < 0.5) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 2] = 0.7 + Math.random() * 0.3;
      } else if (colorChoice < 0.7) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.6 + Math.random() * 0.2;
        colors[i * 3 + 2] = 0.5 + Math.random() * 0.2;
      } else {
        const v = 0.85 + Math.random() * 0.15;
        colors[i * 3] = v;
        colors[i * 3 + 1] = v;
        colors[i * 3 + 2] = v;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size,
      vertexColors: true,
      transparent: true,
      opacity,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return new THREE.Points(geometry, material);
  }, []);

  const createNebula = useCallback((scene: THREE.Scene, position: THREE.Vector3): SpaceObject => {
    const particleCount = 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const hue = Math.random();
    const nebulaColor = new THREE.Color();
    nebulaColor.setHSL(hue, 0.7, 0.5);

    const spread = 25 + Math.random() * 40;
    const centerOffset = new THREE.Vector3();

    for (let i = 0; i < particleCount; i++) {
      // Gaussian-like distribution
      const r = spread * Math.pow(Math.random(), 0.5);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = position.x + centerOffset.x + r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = position.y + centerOffset.y + r * Math.sin(phi) * Math.sin(theta) * 0.6;
      positions[i * 3 + 2] = position.z + centerOffset.z + r * Math.cos(phi);

      const colorVariation = new THREE.Color();
      colorVariation.setHSL(
        hue + (Math.random() - 0.5) * 0.15,
        0.5 + Math.random() * 0.4,
        0.3 + Math.random() * 0.4
      );
      colors[i * 3] = colorVariation.r;
      colors[i * 3 + 1] = colorVariation.g;
      colors[i * 3 + 2] = colorVariation.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2.5 + Math.random() * 5,
      vertexColors: true,
      transparent: true,
      opacity: 0.08 + Math.random() * 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const nebula = new THREE.Points(geometry, material);
    scene.add(nebula);

    return {
      mesh: nebula,
      velocity: new THREE.Vector3(0, 0, 0),
      rotationSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 0.0005,
        (Math.random() - 0.5) * 0.0008,
        (Math.random() - 0.5) * 0.0003
      ),
      originalOpacity: material.opacity,
      fadeStart: 120,
      fadeEnd: 280,
      type: 'nebula',
    };
  }, []);

  const createAsteroid = useCallback((scene: THREE.Scene, position: THREE.Vector3): SpaceObject => {
    const size = 0.5 + Math.random() * 4;
    const detail = Math.floor(Math.random() * 2) + 1;
    const geometry = new THREE.IcosahedronGeometry(size, detail);

    const posAttr = geometry.getAttribute('position');
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      const noise = 0.6 + Math.random() * 0.8;
      posAttr.setXYZ(i, x * noise, y * noise, z * noise);
    }
    geometry.computeVertexNormals();

    const grayVal = 0.2 + Math.random() * 0.3;
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(grayVal + 0.1, grayVal, grayVal - 0.05),
      roughness: 0.85 + Math.random() * 0.15,
      metalness: 0.05 + Math.random() * 0.2,
      transparent: true,
      opacity: 1.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    scene.add(mesh);

    return {
      mesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.008,
        (Math.random() - 0.5) * 0.008,
        (Math.random() - 0.5) * 0.008
      ),
      rotationSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 0.015,
        (Math.random() - 0.5) * 0.015,
        (Math.random() - 0.5) * 0.015
      ),
      originalOpacity: 1.0,
      fadeStart: 80,
      fadeEnd: 220,
      type: 'asteroid',
    };
  }, []);

  const createSpaceDebris = useCallback((scene: THREE.Scene, position: THREE.Vector3): SpaceObject => {
    const group = new THREE.Group();
    const pieceCount = 1 + Math.floor(Math.random() * 3);

    for (let i = 0; i < pieceCount; i++) {
      const geo = new THREE.BoxGeometry(
        0.2 + Math.random() * 1.2,
        0.1 + Math.random() * 0.6,
        0.2 + Math.random() * 1.0
      );

      const metalness = 0.3 + Math.random() * 0.5;
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.3 + Math.random() * 0.4, 0.3 + Math.random() * 0.3, 0.3 + Math.random() * 0.3),
        roughness: 0.4 + Math.random() * 0.3,
        metalness,
        transparent: true,
        opacity: 1.0,
      });

      const piece = new THREE.Mesh(geo, material);
      piece.position.set(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      );
      piece.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      group.add(piece);
    }

    group.position.copy(position);
    scene.add(group);

    return {
      mesh: group,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.015,
        (Math.random() - 0.5) * 0.015,
        (Math.random() - 0.5) * 0.015
      ),
      rotationSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 0.03,
        (Math.random() - 0.5) * 0.03,
        (Math.random() - 0.5) * 0.03
      ),
      originalOpacity: 1.0,
      fadeStart: 70,
      fadeEnd: 180,
      type: 'debris',
    };
  }, []);

  const createGlowingOrb = useCallback((scene: THREE.Scene, position: THREE.Vector3): SpaceObject => {
    const size = 0.8 + Math.random() * 2.5;
    const hue = Math.random();
    const color = new THREE.Color();
    color.setHSL(hue, 0.8, 0.6);

    const group = new THREE.Group();

    // Core
    const coreGeo = new THREE.SphereGeometry(size * 0.4, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // Inner glow
    const innerGeo = new THREE.SphereGeometry(size * 0.8, 16, 16);
    const innerMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    group.add(inner);

    // Outer glow
    const outerGeo = new THREE.SphereGeometry(size * 1.5, 16, 16);
    const outerMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    group.add(outer);

    group.position.copy(position);
    scene.add(group);

    return {
      mesh: group,
      velocity: new THREE.Vector3(0, 0, 0),
      rotationSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 0.005,
        (Math.random() - 0.5) * 0.008,
        (Math.random() - 0.5) * 0.003
      ),
      originalOpacity: 0.9,
      fadeStart: 100,
      fadeEnd: 250,
      type: 'orb',
    };
  }, []);

  const createSpaceStation = useCallback((scene: THREE.Scene, position: THREE.Vector3): SpaceObject => {
    const group = new THREE.Group();

    // Main body
    const bodyGeo = new THREE.CylinderGeometry(1, 1, 6, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x888899,
      roughness: 0.4,
      metalness: 0.7,
      transparent: true,
      opacity: 1.0,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // Ring
    const ringGeo = new THREE.TorusGeometry(3, 0.3, 8, 24);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x667788,
      roughness: 0.3,
      metalness: 0.8,
      transparent: true,
      opacity: 1.0,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Solar panels
    for (let i = 0; i < 4; i++) {
      const panelGeo = new THREE.BoxGeometry(4, 0.05, 1.5);
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x2244aa,
        roughness: 0.2,
        metalness: 0.9,
        transparent: true,
        opacity: 1.0,
      });
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.rotation.y = (Math.PI / 2) * i;
      panel.position.set(
        Math.cos((Math.PI / 2) * i) * 2,
        0,
        Math.sin((Math.PI / 2) * i) * 2
      );
      group.add(panel);
    }

    // Lights
    const lightGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const lightMat = new THREE.MeshBasicMaterial({
      color: 0x44ff88,
      transparent: true,
      opacity: 1.0,
    });
    const light1 = new THREE.Mesh(lightGeo, lightMat);
    light1.position.set(0, 3.2, 0);
    group.add(light1);

    const light2 = new THREE.Mesh(lightGeo.clone(), lightMat.clone());
    light2.position.set(0, -3.2, 0);
    group.add(light2);

    group.position.copy(position);
    group.scale.setScalar(1 + Math.random() * 0.5);
    scene.add(group);

    return {
      mesh: group,
      velocity: new THREE.Vector3(0, 0, 0),
      rotationSpeed: new THREE.Vector3(0, 0.003 + Math.random() * 0.005, 0.001),
      originalOpacity: 1.0,
      fadeStart: 100,
      fadeEnd: 250,
      type: 'station',
    };
  }, []);

  const spawnObjectsAroundCamera = useCallback((camera: THREE.Camera, scene: THREE.Scene) => {
    const camPos = camera.position.clone();
    const spawnRadius = 250;
    const minDist = 40;

    const objectCount = 8 + Math.floor(Math.random() * 8);

    for (let i = 0; i < objectCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = minDist + Math.random() * (spawnRadius - minDist);

      const pos = new THREE.Vector3(
        camPos.x + r * Math.sin(phi) * Math.cos(theta),
        camPos.y + r * Math.sin(phi) * Math.sin(theta),
        camPos.z + r * Math.cos(phi)
      );

      const type = Math.random();
      let obj: SpaceObject;

      if (type < 0.25) {
        obj = createNebula(scene, pos);
      } else if (type < 0.45) {
        obj = createAsteroid(scene, pos);
      } else if (type < 0.6) {
        obj = createSpaceDebris(scene, pos);
      } else if (type < 0.8) {
        obj = createGlowingOrb(scene, pos);
      } else {
        obj = createSpaceStation(scene, pos);
      }

      objectsRef.current.push(obj);
    }
  }, [createNebula, createAsteroid, createSpaceDebris, createGlowingOrb, createSpaceStation]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000008);
    scene.fog = new THREE.FogExp2(0x000008, 0.0035);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1500
    );
    camera.position.set(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x111122, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffeedd, 1.0);
    sunLight.position.set(100, 50, -100);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x4466aa, 0.3);
    fillLight.position.set(-50, -30, 50);
    scene.add(fillLight);

    // Create multiple star layers for infinite depth
    const layer1 = createStarLayer(500, 5000, 1.5, 0.9);
    const layer2 = createStarLayer(350, 3000, 2.0, 0.7);
    const layer3 = createStarLayer(200, 1500, 3.0, 0.5);
    
    scene.add(layer1);
    scene.add(layer2);
    scene.add(layer3);
    starLayersRef.current = [layer1, layer2, layer3];

    // Create initial objects
    spawnObjectsAroundCamera(camera, scene);

    // Set loading to false after a short delay
    setTimeout(() => setIsLoading(false), 500);

    // Event handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if (e.code === 'Tab') {
        e.preventDefault();
        setMode(prev => {
          const newMode = prev === 'free' ? 'auto' : 'free';
          if (newMode === 'auto' && document.pointerLockElement) {
            document.exitPointerLock();
          }
          return newMode;
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        mouseRef.current.isLocked = true;
        eulerRef.current.y -= e.movementX * 0.002;
        eulerRef.current.x -= e.movementY * 0.002;
        eulerRef.current.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, eulerRef.current.x));
      }
    };

    const handleClick = () => {
      if (modeRef.current === 'free') {
        renderer.domElement.requestPointerLock();
      }
    };

    const handlePointerLockChange = () => {
      mouseRef.current.isLocked = document.pointerLockElement === renderer.domElement;
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    window.addEventListener('resize', handleResize);

    // Animation loop
    let lastSpawnTime = 0;
    const spawnInterval = 2500;
    let smoothVelocity = new THREE.Vector3(0, 0, 0);

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = Math.min(clockRef.current.getDelta(), 0.05);
      const elapsed = clockRef.current.getElapsedTime();

      // Update camera rotation
      camera.rotation.copy(eulerRef.current);

      // Movement based on mode
      if (modeRef.current === 'free') {
        const speed = 35;
        const targetVelocity = new THREE.Vector3();

        if (keysRef.current.has('KeyW') || keysRef.current.has('ArrowUp')) targetVelocity.z -= 1;
        if (keysRef.current.has('KeyS') || keysRef.current.has('ArrowDown')) targetVelocity.z += 1;
        if (keysRef.current.has('KeyA') || keysRef.current.has('ArrowLeft')) targetVelocity.x -= 1;
        if (keysRef.current.has('KeyD') || keysRef.current.has('ArrowRight')) targetVelocity.x += 1;
        if (keysRef.current.has('Space')) targetVelocity.y += 1;
        if (keysRef.current.has('ShiftLeft') || keysRef.current.has('ShiftRight')) targetVelocity.y -= 1;

        targetVelocity.normalize();
        targetVelocity.applyQuaternion(camera.quaternion);

        let currentSpeed = speed;
        if (keysRef.current.has('KeyE')) currentSpeed *= 3;
        if (keysRef.current.has('KeyQ')) currentSpeed *= 0.3;

        targetVelocity.multiplyScalar(currentSpeed * delta);

        // Smooth velocity transition
        smoothVelocity.lerp(targetVelocity, 0.1);
        camera.position.add(smoothVelocity);

      } else {
        // Auto mode - smooth forward movement with gentle wandering
        const autoSpeed = 12;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

        // Gentle wandering
        const wanderSpeed = 0.15;
        lastAutoYawRef.current += Math.sin(elapsed * wanderSpeed) * 0.0004;
        lastAutoYawRef.current += Math.cos(elapsed * wanderSpeed * 0.7) * 0.0002;
        
        eulerRef.current.y = lastAutoYawRef.current + Math.sin(elapsed * 0.05) * 0.3;
        eulerRef.current.x = Math.sin(elapsed * 0.03) * 0.1;

        const moveDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const moveAmount = moveDir.multiplyScalar(autoSpeed * delta);
        
        smoothVelocity.lerp(moveAmount, 0.05);
        camera.position.add(smoothVelocity);
      }

      // Update star layers - keep them centered on camera for infinite effect
      for (const layer of starLayersRef.current) {
        const dist = layer.position.distanceTo(camera.position);
        if (dist > 50) {
          layer.position.copy(camera.position);
        }
        // Subtle rotation for parallax
        layer.rotation.y += 0.00003;
        layer.rotation.x += 0.00001;
      }

      // Update objects
      const camPos = camera.position;
      const toRemove: number[] = [];

      for (let i = 0; i < objectsRef.current.length; i++) {
        const obj = objectsRef.current[i];
        const dist = obj.mesh.position.distanceTo(camPos);

        // Fade objects based on distance
        if (dist > obj.fadeStart) {
          const fadeProgress = Math.min(1, (dist - obj.fadeStart) / (obj.fadeEnd - obj.fadeStart));
          const easedFade = fadeProgress * fadeProgress; // Quadratic easing for smoother fade

          // Traverse and update all materials
          obj.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
              const mat = child.material as THREE.Material;
              if (mat && 'opacity' in mat) {
                (mat as THREE.MeshBasicMaterial).opacity = obj.originalOpacity * (1 - easedFade);
              }
            }
          });
        }

        // Remove objects that are too far
        if (dist > obj.fadeEnd + 80) {
          toRemove.push(i);
          scene.remove(obj.mesh);
          obj.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
              child.geometry?.dispose();
              if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
              } else {
                child.material?.dispose();
              }
            }
          });
        }

        // Rotate objects
        obj.mesh.rotation.x += obj.rotationSpeed.x;
        obj.mesh.rotation.y += obj.rotationSpeed.y;
        obj.mesh.rotation.z += obj.rotationSpeed.z;

        // Move objects slightly
        obj.mesh.position.add(obj.velocity.clone().multiplyScalar(delta * 60));

        // Pulsing effect for orbs
        if (obj.type === 'orb') {
          const pulse = 0.8 + Math.sin(elapsed * 2 + i) * 0.2;
          obj.mesh.scale.setScalar(pulse);
        }
      }

      // Remove far objects
      for (let i = toRemove.length - 1; i >= 0; i--) {
        objectsRef.current.splice(toRemove[i], 1);
      }

      // Spawn new objects periodically
      const now = Date.now();
      if (now - lastSpawnTime > spawnInterval) {
        lastSpawnTime = now;
        if (objectsRef.current.length < 50) {
          spawnObjectsAroundCamera(camera, scene);
        }
      }

      // Update fog density based on mode
      const targetFogDensity = modeRef.current === 'auto' ? 0.004 : 0.003;
      const currentFog = scene.fog as THREE.FogExp2;
      currentFog.density += (targetFogDensity - currentFog.density) * 0.01;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [createStarLayer, spawnObjectsAroundCamera]);

  const toggleMode = () => {
    setMode(prev => {
      const newMode = prev === 'free' ? 'auto' : 'free';
      if (newMode === 'auto' && document.pointerLockElement) {
        document.exitPointerLock();
      }
      if (newMode === 'auto') {
        lastAutoYawRef.current = eulerRef.current.y;
      }
      return newMode;
    });
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Loading screen */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="w-16 h-16 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60 text-sm">Initializing Space...</p>
          </div>
        </div>
      )}

      <div ref={containerRef} className="absolute inset-0" />

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none z-10">
        {/* Mode toggle */}
        <div className="pointer-events-auto flex flex-col gap-2">
          <button
            onClick={toggleMode}
            className="px-5 py-2.5 rounded-xl backdrop-blur-xl border border-white/20 text-white font-medium transition-all duration-300 hover:bg-white/10 hover:border-white/40 hover:scale-105 active:scale-95"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          >
            <span className="flex items-center gap-2">
              {mode === 'free' ? (
                <>
                  <span className="text-lg">🎮</span>
                  <span>Free Mode</span>
                </>
              ) : (
                <>
                  <span className="text-lg">🚀</span>
                  <span>Auto Pilot</span>
                </>
              )}
            </span>
          </button>
          <span className="text-white/30 text-xs text-center">Press TAB to switch</span>
        </div>

        {/* Help toggle */}
        <div className="pointer-events-auto">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-10 h-10 rounded-xl backdrop-blur-xl border border-white/20 text-white/80 flex items-center justify-center transition-all duration-300 hover:bg-white/10 hover:border-white/40"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          >
            {showInstructions ? '✕' : '?'}
          </button>
        </div>
      </div>

      {/* Instructions panel */}
      {showInstructions && (
        <div
          className="absolute bottom-8 left-8 p-5 rounded-2xl backdrop-blur-xl border border-white/10 text-white/80 text-sm max-w-xs pointer-events-auto z-10 animate-fadeIn"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <h3 className="text-white font-bold mb-3 text-lg flex items-center gap-2">
            <span>🌌</span> Space Explorer
          </h3>
          {mode === 'free' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-xs font-mono">W A S D</kbd>
                <span className="text-white/60">Move</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-xs font-mono">Mouse</kbd>
                <span className="text-white/60">Look (click to lock)</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-xs font-mono">Space</kbd>
                <span className="text-white/60">Move up</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-xs font-mono">Shift</kbd>
                <span className="text-white/60">Move down</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-xs font-mono">E</kbd>
                <span className="text-white/60">Boost</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-xs font-mono">Q</kbd>
                <span className="text-white/60">Slow down</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                <span className="text-green-400">●</span> Auto-pilot engaged
              </p>
              <p className="text-white/50">Drifting through the infinite cosmos...</p>
              <p className="text-white/50">Objects fade into cosmic fog</p>
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-white/10">
            <p className="text-white/40 text-xs">
              Environment loops infinitely • Objects are randomly generated
            </p>
          </div>
        </div>
      )}

      {/* Crosshair for free mode */}
      {mode === 'free' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="relative">
            <div className="w-5 h-5 border border-white/30 rounded-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-white/50" />
            </div>
          </div>
        </div>
      )}

      {/* Bottom status bar */}
      <div className="absolute bottom-4 right-4 pointer-events-none z-10">
        <div
          className="px-4 py-2 rounded-full text-xs text-white/50 backdrop-blur-sm border border-white/10 flex items-center gap-3"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${mode === 'free' ? 'bg-blue-400' : 'bg-green-400'} animate-pulse`} />
            {mode === 'free' ? 'Free Navigation' : 'Auto Pilot'}
          </span>
          <span className="text-white/20">|</span>
          <span>Fog: Active</span>
        </div>
      </div>

      {/* Vignette effect */}
      <div
        className="absolute inset-0 pointer-events-none z-5"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </div>
  );
}
