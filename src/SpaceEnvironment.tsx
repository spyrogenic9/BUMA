import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type Mode = 'free' | 'auto';

// Seeded random for reproducibility per chunk
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function createAsteroidGeometry(size: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(size, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const noise = 0.6 + Math.random() * 0.8;
    pos.setXYZ(i, x * noise, y * noise, z * noise);
  }
  geo.computeVertexNormals();
  return geo;
}

function createRockMaterial(): THREE.MeshStandardMaterial {
  const hue = 0.05 + Math.random() * 0.05;
  const sat = 0.1 + Math.random() * 0.2;
  const light = 0.15 + Math.random() * 0.2;
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(hue, sat, light),
    roughness: 0.85 + Math.random() * 0.15,
    metalness: 0.1 + Math.random() * 0.3,
    flatShading: true,
  });
}

function createNebulaParticles(count: number, spread: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  const baseHue = Math.random();
  const hueRange = 0.15;

  for (let i = 0; i < count; i++) {
    // Gaussian-like distribution for natural clustering
    const r = spread * (Math.random() ** 0.5);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.4;
    positions[i * 3 + 2] = r * Math.cos(phi);

    const hue = baseHue + (Math.random() - 0.5) * hueRange;
    const color = new THREE.Color().setHSL(hue, 0.7 + Math.random() * 0.3, 0.4 + Math.random() * 0.3);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    sizes[i] = 0.5 + Math.random() * 2.5;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.PointsMaterial({
    size: 1.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  return new THREE.Points(geo, mat);
}

function createPlanet(): THREE.Group {
  const group = new THREE.Group();
  const radius = 3 + Math.random() * 8;

  // Planet body
  const planetGeo = new THREE.SphereGeometry(radius, 32, 32);
  const hue = Math.random();
  const planetMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(hue, 0.3 + Math.random() * 0.4, 0.2 + Math.random() * 0.3),
    roughness: 0.7,
    metalness: 0.1,
  });

  // Add surface variation
  const pos = planetGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    const noise = 1 + (Math.random() - 0.5) * 0.02;
    pos.setXYZ(i, x / len * radius * noise, y / len * radius * noise, z / len * radius * noise);
  }
  planetGeo.computeVertexNormals();

  const planet = new THREE.Mesh(planetGeo, planetMat);
  group.add(planet);

  // Atmosphere glow
  const atmosGeo = new THREE.SphereGeometry(radius * 1.15, 32, 32);
  const atmosMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color().setHSL(hue, 0.8, 0.5),
    transparent: true,
    opacity: 0.1,
    side: THREE.BackSide,
  });
  group.add(new THREE.Mesh(atmosGeo, atmosMat));

  // Ring (50% chance)
  if (Math.random() > 0.5) {
    const innerR = radius * 1.4;
    const outerR = radius * 2.2;
    const ringGeo = new THREE.RingGeometry(innerR, outerR, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(hue + 0.1, 0.3, 0.5),
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI * 0.4 + Math.random() * 0.3;
    ring.rotation.z = Math.random() * 0.2;
    group.add(ring);
  }

  return group;
}

function createSpaceDebris(): THREE.Group {
  const group = new THREE.Group();
  const count = 3 + Math.floor(Math.random() * 8);

  for (let i = 0; i < count; i++) {
    const size = 0.1 + Math.random() * 0.5;
    const geo = createAsteroidGeometry(size);
    const mat = createRockMaterial();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    group.add(mesh);
  }

  return group;
}

function createGlowingOrb(): THREE.Group {
  const group = new THREE.Group();
  const radius = 0.5 + Math.random() * 1.5;
  const hue = Math.random();

  const coreGeo = new THREE.SphereGeometry(radius, 16, 16);
  const coreMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color().setHSL(hue, 1, 0.7),
  });
  group.add(new THREE.Mesh(coreGeo, coreMat));

  // Outer glow
  const glowGeo = new THREE.SphereGeometry(radius * 2, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color().setHSL(hue, 1, 0.5),
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide,
  });
  group.add(new THREE.Mesh(glowGeo, glowMat));

  // Point light
  const light = new THREE.PointLight(
    new THREE.Color().setHSL(hue, 1, 0.5),
    2,
    30
  );
  group.add(light);

  return group;
}

function createStarField(count: number, spread: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread;

    const temp = Math.random();
    let r, g, b;
    if (temp < 0.3) {
      // Blue-white stars
      r = 0.7 + Math.random() * 0.3;
      g = 0.8 + Math.random() * 0.2;
      b = 1;
    } else if (temp < 0.6) {
      // White stars
      r = 1;
      g = 1;
      b = 0.9 + Math.random() * 0.1;
    } else if (temp < 0.85) {
      // Yellow stars
      r = 1;
      g = 0.9 + Math.random() * 0.1;
      b = 0.6 + Math.random() * 0.2;
    } else {
      // Red stars
      r = 1;
      g = 0.4 + Math.random() * 0.3;
      b = 0.2 + Math.random() * 0.2;
    }
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Points(geo, mat);
}

interface SpaceObject {
  mesh: THREE.Object3D;
  type: string;
  seed: number;
  rotationSpeed: THREE.Vector3;
  fadeStart: number;
  fadeEnd: number;
}

export default function SpaceEnvironment() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('auto');
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const modeRef = useRef<Mode>('auto');
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef(new THREE.Vector3(0, 0, -0.3));
  const targetVelocityRef = useRef(new THREE.Vector3(0, 0, -0.3));

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020208);

    // Dense fog for natural fade-in/out
    const fogColor = new THREE.Color(0x020208);
    scene.fog = new THREE.FogExp2(fogColor, 0.008);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x111122, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    dirLight.position.set(50, 30, -50);
    scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0x4466aa, 0.3);
    dirLight2.position.set(-30, -20, 30);
    scene.add(dirLight2);

    // Star layers that follow camera
    const starLayers: THREE.Points[] = [];
    for (let i = 0; i < 3; i++) {
      const spread = 300 + i * 200;
      const count = 2000 - i * 500;
      const stars = createStarField(count, spread);
      scene.add(stars);
      starLayers.push(stars);
    }

    // Space objects management
    const spaceObjects: SpaceObject[] = [];
    const SPAWN_RADIUS = 150;
    const DESPAWN_RADIUS = 180;
    const FADE_START = 80;
    const FADE_END = 150;
    let chunkSeed = 12345;
    let lastSpawnZ = 0;

    function spawnObject(forward: boolean) {
      const rng = seededRandom(chunkSeed++);
      const typeRoll = rng();

      let mesh: THREE.Object3D;
      let type: string;

      if (typeRoll < 0.35) {
        // Asteroid cluster
        type = 'asteroid';
        const count = 1 + Math.floor(rng() * 5);
        const group = new THREE.Group();
        for (let i = 0; i < count; i++) {
          const size = 0.5 + rng() * 3;
          const geo = createAsteroidGeometry(size);
          const mat = createRockMaterial();
          const m = new THREE.Mesh(geo, mat);
          m.position.set(
            (rng() - 0.5) * 15,
            (rng() - 0.5) * 15,
            (rng() - 0.5) * 15
          );
          m.rotation.set(rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2);
          group.add(m);
        }
        mesh = group;
      } else if (typeRoll < 0.5) {
        // Nebula
        type = 'nebula';
        const count = 200 + Math.floor(rng() * 400);
        const spread = 15 + rng() * 25;
        mesh = createNebulaParticles(count, spread);
      } else if (typeRoll < 0.6) {
        // Planet
        type = 'planet';
        mesh = createPlanet();
      } else if (typeRoll < 0.75) {
        // Space debris
        type = 'debris';
        mesh = createSpaceDebris();
      } else if (typeRoll < 0.88) {
        // Glowing orb
        type = 'orb';
        mesh = createGlowingOrb();
      } else {
        // Large asteroid
        type = 'asteroid';
        const size = 3 + rng() * 8;
        const geo = createAsteroidGeometry(size);
        const mat = createRockMaterial();
        mesh = new THREE.Mesh(geo, mat);
      }

      // Position: spread around but biased forward
      const angle = rng() * Math.PI * 2;
      const dist = 30 + rng() * (SPAWN_RADIUS - 30);
      const zOffset = forward ? (80 + rng() * 70) : (-80 - rng() * 70);

      mesh.position.set(
        Math.cos(angle) * dist * 0.6,
        (rng() - 0.5) * dist * 0.4,
        camera.position.z + zOffset
      );

      // Random rotation
      mesh.rotation.set(
        rng() * Math.PI * 2,
        rng() * Math.PI * 2,
        rng() * Math.PI * 2
      );

      // Start invisible for fade-in
      mesh.traverse((child) => {
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) {
            mat.forEach(m => { m.transparent = true; m.opacity = 0; });
          } else {
            (mat as THREE.Material & { opacity: number }).transparent = true;
            (mat as THREE.Material & { opacity: number }).opacity = 0;
          }
        }
      });

      scene.add(mesh);

      const rotSpeed = new THREE.Vector3(
        (rng() - 0.5) * 0.005,
        (rng() - 0.5) * 0.005,
        (rng() - 0.5) * 0.003
      );

      spaceObjects.push({
        mesh,
        type,
        seed: chunkSeed - 1,
        rotationSpeed: rotSpeed,
        fadeStart: FADE_START,
        fadeEnd: FADE_END,
      });
    }

    // Initial spawn
    for (let i = 0; i < 40; i++) {
      spawnObject(i % 2 === 0);
    }

    // Euler for camera rotation
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    let pitchAngle = 0;
    let yawAngle = 0;

    // Animation
    const clock = new THREE.Clock();
    let animationId: number;

    function animate() {
      animationId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      const currentMode = modeRef.current;

      // Camera movement
      if (currentMode === 'auto') {
        // Only move forward slowly
        targetVelocityRef.current.set(0, 0, -0.8);

        // Very subtle random drift for natural feel
        const driftX = Math.sin(elapsed * 0.1) * 0.02;
        const driftY = Math.cos(elapsed * 0.07) * 0.01;
        euler.y -= driftX * delta;
        euler.x -= driftY * delta;
        euler.x = Math.max(-0.1, Math.min(0.1, euler.x));
      } else {
        // Free mode - smooth forward movement with mouse look
        const speed = keysRef.current.has('shift') ? 3 : 1.2;
        const boost = keysRef.current.has('e') ? 2.5 : 1;
        const slow = keysRef.current.has('q') ? 0.3 : 1;

        targetVelocityRef.current.set(0, 0, -speed * boost * slow);

        // Mouse look
        euler.y -= mouseRef.current.x * 0.002;
        euler.x -= mouseRef.current.y * 0.002;
        euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.x));
        mouseRef.current.x = 0;
        mouseRef.current.y = 0;
      }

      // Smooth velocity lerp
      velocityRef.current.lerp(targetVelocityRef.current, delta * 3);

      // Apply rotation
      camera.quaternion.setFromEuler(euler);

      // Move camera in local space
      const moveVec = velocityRef.current.clone().applyQuaternion(camera.quaternion);
      camera.position.add(moveVec);

      // Update star layers to follow camera
      starLayers.forEach((layer, i) => {
        layer.position.copy(camera.position);
        // Subtle rotation for parallax
        layer.rotation.y = elapsed * 0.002 * (i + 1);
        layer.rotation.x = elapsed * 0.001 * (i + 1);
      });

      // Update space objects
      const camPos = camera.position;

      for (let i = spaceObjects.length - 1; i >= 0; i--) {
        const obj = spaceObjects[i];
        const dist = obj.mesh.position.distanceTo(camPos);

        // Despawn if too far
        if (dist > DESPAWN_RADIUS) {
          scene.remove(obj.mesh);
          // Dispose geometry and materials
          obj.mesh.traverse((child) => {
            if ((child as THREE.Mesh).geometry) {
              (child as THREE.Mesh).geometry.dispose();
            }
            if ((child as THREE.Mesh).material) {
              const mat = (child as THREE.Mesh).material;
              if (Array.isArray(mat)) mat.forEach(m => m.dispose());
              else mat.dispose();
            }
          });
          spaceObjects.splice(i, 1);
          continue;
        }

        // Smooth fade based on distance
        let targetOpacity = 1;
        if (dist > obj.fadeEnd) {
          targetOpacity = 0;
        } else if (dist > obj.fadeStart) {
          const t = (dist - obj.fadeStart) / (obj.fadeEnd - obj.fadeStart);
          // Smooth easing
          targetOpacity = 1 - t * t;
        } else if (dist < 15) {
          // Also fade if very close (passed through)
          targetOpacity = dist / 15;
        }

        // Apply opacity smoothly
        obj.mesh.traverse((child) => {
          if ((child as THREE.Mesh).material) {
            const mat = (child as THREE.Mesh).material;
            const mats = Array.isArray(mat) ? mat : [mat];
            mats.forEach(m => {
              const mAny = m as THREE.Material & { opacity: number };
              mAny.transparent = true;
              // Smooth lerp for opacity
              mAny.opacity += (targetOpacity - mAny.opacity) * delta * 4;
            });
          }
        });

        // Rotation
        obj.mesh.rotation.x += obj.rotationSpeed.x;
        obj.mesh.rotation.y += obj.rotationSpeed.y;
        obj.mesh.rotation.z += obj.rotationSpeed.z;

        // Nebula slow rotation
        if (obj.type === 'nebula') {
          obj.mesh.rotation.y += 0.001;
        }
      }

      // Spawn new objects to maintain density
      while (spaceObjects.length < 35) {
        spawnObject(Math.random() > 0.3);
      }

      // Also spawn ahead of camera
      if (Math.random() < 0.02) {
        spawnObject(true);
      }

      renderer.render(scene, camera);
    }

    // Start
    setTimeout(() => setLoading(false), 800);
    animate();

    // Event handlers
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        mouseRef.current.x += e.movementX;
        mouseRef.current.y += e.movementY;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    const handleClick = () => {
      if (modeRef.current === 'free') {
        renderer.domElement.requestPointerLock();
      }
    };

    const handlePointerLockChange = () => {
      setIsLocked(document.pointerLockElement === renderer.domElement);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    renderer.domElement.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      renderer.domElement.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);

      // Cleanup
      spaceObjects.forEach(obj => {
        obj.mesh.traverse((child) => {
          if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
          if ((child as THREE.Mesh).material) {
            const mat = (child as THREE.Mesh).material;
            if (Array.isArray(mat)) mat.forEach(m => m.dispose());
            else mat.dispose();
          }
        });
      });
      starLayers.forEach(s => {
        s.geometry.dispose();
        (s.material as THREE.Material).dispose();
      });
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="w-full h-screen relative overflow-hidden bg-black">
      <div ref={containerRef} className="w-full h-full" />

      {/* Vignette overlay */}
      <div className="vignette" />

      {/* Loading screen */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020208]">
          <div className="text-center">
            <div className="spinner mb-6" />
            <p className="text-white/70 text-lg tracking-widest uppercase">
              Memuat Lingkungan Luar Angkasa...
            </p>
          </div>
        </div>
      )}

      {/* UI Overlay */}
      <div className="fixed top-0 left-0 right-0 z-30 pointer-events-none">
        <div className="flex justify-between items-start p-4 md:p-6">
          {/* Mode toggle */}
          <div className="pointer-events-auto">
            <div className="glass-panel px-4 py-3 rounded-xl">
              <p className="text-white/50 text-[10px] uppercase tracking-[0.2em] mb-2">Mode Perjalanan</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('auto')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    mode === 'auto'
                      ? 'bg-blue-500/30 text-blue-300 border border-blue-400/40 shadow-lg shadow-blue-500/10'
                      : 'text-white/40 hover:text-white/70 border border-transparent'
                  }`}
                >
                  <span className="mr-1.5">🚀</span>Otomatis
                </button>
                <button
                  onClick={() => setMode('free')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    mode === 'free'
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-400/40 shadow-lg shadow-purple-500/10'
                      : 'text-white/40 hover:text-white/70 border border-transparent'
                  }`}
                >
                  <span className="mr-1.5">🎮</span>Bebas
                </button>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="pointer-events-auto">
            <div className="glass-panel px-4 py-3 rounded-xl text-right">
              <p className="text-white/50 text-[10px] uppercase tracking-[0.2em] mb-1">Status</p>
              <p className="text-white/80 text-sm">
                {mode === 'auto' ? '🌌 Menjelajah Otomatis' : isLocked ? '🎯 Kontrol Aktif' : '👆 Klik untuk Kontrol'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls help */}
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
        <div className="flex justify-center p-4 md:p-6">
          <div className="glass-panel px-5 py-3 rounded-xl">
            {mode === 'auto' ? (
              <p className="text-white/50 text-xs text-center tracking-wide">
                ✨ Menjelajah otomatis melalui ruang angkasa tanpa batas — duduk dan nikmati pemandangannya
              </p>
            ) : (
              <div className="flex flex-wrap gap-x-5 gap-y-1 justify-center text-white/50 text-xs">
                <span><kbd className="key">Mouse</kbd> Lihat sekitar</span>
                <span><kbd className="key">Shift</kbd> Cepat</span>
                <span><kbd className="key">E</kbd> Boost</span>
                <span><kbd className="key">Q</kbd> Lambat</span>
                <span><kbd className="key">Esc</kbd> Keluar</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Crosshair for free mode */}
      {mode === 'free' && isLocked && (
        <div className="fixed inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-white/40 shadow-lg shadow-white/20" />
        </div>
      )}
    </div>
  );
}
