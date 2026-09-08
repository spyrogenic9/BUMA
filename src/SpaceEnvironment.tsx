import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type Mode = 'free' | 'auto';

// Utility: seeded random
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ====== ASTEROID - bentuk tidak beraturan, tekstur batuan ======
function createAsteroid(size: number): THREE.Mesh {
  const detail = 2 + Math.floor(Math.random() * 2);
  const geo = new THREE.IcosahedronGeometry(size, detail);
  const pos = geo.attributes.position;
  
  // Displacement acak untuk bentuk tidak beraturan
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    const noise = 0.55 + Math.random() * 0.9;
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;
    pos.setXYZ(i, nx * size * noise, ny * size * noise, nz * size * noise);
  }
  geo.computeVertexNormals();

  // Warna batuan gelap dengan variasi
  const gray = 0.08 + Math.random() * 0.12;
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(gray, gray * 0.9, gray * 0.85),
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ====== PLANET - sphere dengan permukaan bervariasi, mungkin cincin ======
function createPlanet(): THREE.Group {
  const group = new THREE.Group();
  const radius = 4 + Math.random() * 10;

  // Body planet
  const geo = new THREE.SphereGeometry(radius, 48, 48);
  const pos = geo.attributes.position;
  
  // Variasi permukaan halus
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    const bump = 1 + (Math.random() - 0.5) * 0.02;
    pos.setXYZ(i, x / len * radius * bump, y / len * radius * bump, z / len * radius * bump);
  }
  geo.computeVertexNormals();

  // Warna planet: gas giant atau rocky
  const isGasGiant = Math.random() > 0.5;
  let color: THREE.Color;
  if (isGasGiant) {
    const hues = [0.05, 0.08, 0.55, 0.6, 0.75]; // orange, brown, blue, purple
    const hue = hues[Math.floor(Math.random() * hues.length)] + (Math.random() - 0.5) * 0.05;
    color = new THREE.Color().setHSL(hue, 0.4 + Math.random() * 0.3, 0.25 + Math.random() * 0.2);
  } else {
    color = new THREE.Color(0.2 + Math.random() * 0.15, 0.15 + Math.random() * 0.1, 0.1 + Math.random() * 0.1);
  }

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: isGasGiant ? 0.6 : 0.85,
    metalness: 0.05,
  });

  const planet = new THREE.Mesh(geo, mat);
  group.add(planet);

  // Cincin (50% kemungkinan)
  if (Math.random() > 0.5) {
    const innerRadius = radius * 1.3;
    const outerRadius = radius * 2.2;
    const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.4, 0.35, 0.3),
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI * 0.4 + Math.random() * 0.3;
    ring.rotation.y = Math.random() * Math.PI;
    group.add(ring);
  }

  return group;
}

// ====== NEBULA - awan gas partikel ======
function createNebula(): THREE.Points {
  const count = 800 + Math.floor(Math.random() * 600);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const spread = 30 + Math.random() * 40;

  // Warna nebula: biru/ungu/merah/pink
  const palette = [
    [0.6, 0.3, 0.8],  // ungu
    [0.2, 0.4, 0.9],  // biru
    [0.9, 0.2, 0.4],  // merah
    [0.8, 0.3, 0.6],  // pink
    [0.3, 0.7, 0.9],  // cyan
  ];
  const baseColor = palette[Math.floor(Math.random() * palette.length)];

  for (let i = 0; i < count; i++) {
    // Distribusi gaussian untuk bentuk awan natural
    const r = spread * Math.pow(Math.random(), 0.6);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.3; // pipih
    positions[i * 3 + 2] = r * Math.cos(phi);

    // Variasi warna
    const variation = 0.7 + Math.random() * 0.3;
    colors[i * 3] = baseColor[0] * variation;
    colors[i * 3 + 1] = baseColor[1] * variation;
    colors[i * 3 + 2] = baseColor[2] * variation;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 1.5 + Math.random() * 1.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  return new THREE.Points(geo, mat);
}

// ====== DEBRIS - pecahan kecil logam/puing ======
function createDebris(): THREE.Group {
  const group = new THREE.Group();
  const count = 3 + Math.floor(Math.random() * 5);

  for (let i = 0; i < count; i++) {
    const size = 0.2 + Math.random() * 0.6;
    const geoType = Math.floor(Math.random() * 3);
    let geo: THREE.BufferGeometry;

    if (geoType === 0) {
      geo = new THREE.BoxGeometry(size, size * 0.5, size * 0.3);
    } else if (geoType === 1) {
      geo = new THREE.TetrahedronGeometry(size);
    } else {
      geo = new THREE.OctahedronGeometry(size * 0.5);
    }

    // Warna logam gelap
    const gray = 0.15 + Math.random() * 0.15;
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(gray, gray, gray * 1.1),
      roughness: 0.4 + Math.random() * 0.3,
      metalness: 0.7 + Math.random() * 0.3,
      flatShading: true,
    });

    const piece = new THREE.Mesh(geo, mat);
    piece.position.set(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4
    );
    piece.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    group.add(piece);
  }

  return group;
}

// ====== KOMAT - inti + ekor partikel ======
function createComet(): THREE.Group {
  const group = new THREE.Group();

  // Inti komet
  const coreGeo = new THREE.SphereGeometry(0.5 + Math.random() * 0.5, 16, 16);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xccddff,
    emissive: 0x4466aa,
    emissiveIntensity: 0.5,
    roughness: 0.3,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  // Ekor partikel
  const tailCount = 200;
  const positions = new Float32Array(tailCount * 3);
  const colors = new Float32Array(tailCount * 3);

  for (let i = 0; i < tailCount; i++) {
    const t = i / tailCount;
    positions[i * 3] = (Math.random() - 0.5) * 2 * (1 + t * 3);
    positions[i * 3 + 1] = (Math.random() - 0.5) * 1 * (1 + t * 2);
    positions[i * 3 + 2] = t * 15 + Math.random() * 3;

    const brightness = 1 - t * 0.7;
    colors[i * 3] = 0.6 * brightness;
    colors[i * 3 + 1] = 0.8 * brightness;
    colors[i * 3 + 2] = 1.0 * brightness;
  }

  const tailGeo = new THREE.BufferGeometry();
  tailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  tailGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const tailMat = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const tail = new THREE.Points(tailGeo, tailMat);
  group.add(tail);

  return group;
}

// ====== SPACESHIP WRACK - bangkai kapal ======
function createWreck(): THREE.Group {
  const group = new THREE.Group();

  // Badan utama
  const bodyGeo = new THREE.CylinderGeometry(0.5, 1.5, 6, 8);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x333340,
    roughness: 0.6,
    metalness: 0.8,
    flatShading: true,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.z = Math.random() * Math.PI;
  group.add(body);

  // Panel rusak
  for (let i = 0; i < 3; i++) {
    const panelGeo = new THREE.BoxGeometry(1 + Math.random(), 0.1, 0.5 + Math.random());
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x222230,
      roughness: 0.5,
      metalness: 0.9,
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 3
    );
    panel.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    group.add(panel);
  }

  return group;
}

// ====== Komponen utama ======
export default function SpaceEnvironment() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('auto');
  const [loading, setLoading] = useState(true);
  const modeRef = useRef<Mode>('auto');
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef({ x: 0, y: 0, locked: false });

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // ====== RENDERER ======
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // ====== SCENE - background hitam pekat ======
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // ====== FOG SANGAT TEBAL - objek hanya terlihat dekat ======
    scene.fog = new THREE.FogExp2(0x000000, 0.016);

    // ====== CAMERA ======
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 0, 0);

    // ====== LIGHTING ======
    // Ambient sangat redup - hanya untuk memberi sedikit cahaya
    const ambientLight = new THREE.AmbientLight(0x111122, 0.3);
    scene.add(ambientLight);

    // Cahaya utama dari "bintang jauh"
    const mainLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    mainLight.position.set(50, 30, -50);
    scene.add(mainLight);

    // Cahaya biru dari sisi lain
    const fillLight = new THREE.DirectionalLight(0x4466aa, 0.3);
    fillLight.position.set(-30, -10, 30);
    scene.add(fillLight);

    // ====== STAR FIELD - bintang-bintang kecil di background ======
    const starCount = 3000;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const r = 100 + Math.random() * 300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      // Warna bintang: putih, biru, kuning
      const temp = Math.random();
      if (temp > 0.8) {
        starColors[i * 3] = 0.8; starColors[i * 3 + 1] = 0.9; starColors[i * 3 + 2] = 1.0;
      } else if (temp > 0.6) {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.95; starColors[i * 3 + 2] = 0.7;
      } else {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 1.0; starColors[i * 3 + 2] = 1.0;
      }
      starSizes[i] = 0.3 + Math.random() * 0.8;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ====== OBJECTS POOL - objek luar angkasa ======
    interface SpaceObject {
      mesh: THREE.Object3D;
      type: string;
      velocity: THREE.Vector3;
      rotSpeed: THREE.Vector3;
      spawnTime: number;
    }

    const objects: SpaceObject[] = [];
    const FADE_DISTANCE = 70; // jarak mulai fade
    const MAX_DISTANCE = 100; // jarak max sebelum dihapus
    const SPAWN_DISTANCE_MIN = 40;
    const SPAWN_DISTANCE_MAX = 90;

    function spawnObject() {
      const rand = Math.random();
      let mesh: THREE.Object3D;
      let type: string;

      if (rand < 0.35) {
        // Asteroid (35%)
        const size = 0.5 + Math.random() * 3;
        mesh = createAsteroid(size);
        type = 'asteroid';
      } else if (rand < 0.50) {
        // Planet (15%)
        mesh = createPlanet();
        type = 'planet';
      } else if (rand < 0.65) {
        // Nebula (15%)
        mesh = createNebula();
        type = 'nebula';
      } else if (rand < 0.80) {
        // Debris (15%)
        mesh = createDebris();
        type = 'debris';
      } else if (rand < 0.92) {
        // Komet (12%)
        mesh = createComet();
        type = 'comet';
      } else {
        // Wreck (8%)
        mesh = createWreck();
        type = 'wreck';
      }

      // Posisi spawn di sekitar kamera tapi di depan
      const angle = Math.random() * Math.PI * 2;
      const distance = SPAWN_DISTANCE_MIN + Math.random() * (SPAWN_DISTANCE_MAX - SPAWN_DISTANCE_MIN);
      const height = (Math.random() - 0.5) * 60;

      // Spawn di depan kamera
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

      const spawnPos = camera.position.clone()
        .add(forward.multiplyScalar(distance * 0.7))
        .add(right.multiplyScalar(Math.cos(angle) * distance * 0.5))
        .add(up.multiplyScalar(height));

      mesh.position.copy(spawnPos);

      // Rotasi acak
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      scene.add(mesh);

      // Kecepatan rotasi
      const rotSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01
      );

      // Kecepatan drift (sangat pelan)
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.02
      );

      objects.push({ mesh, type, velocity, rotSpeed, spawnTime: Date.now() });
    }

    // Spawn awal
    for (let i = 0; i < 25; i++) {
      spawnObject();
    }

    // ====== KAMERA STATE ======
    const cameraVelocity = new THREE.Vector3(0, 0, 0);
    const cameraDirection = new THREE.Euler(0, 0, 0, 'YXZ');
    let yaw = 0;
    let pitch = 0;
    const AUTO_SPEED = 2.5; // kecepatan maju otomatis

    // ====== POINTER LOCK untuk mode bebas ======
    const handlePointerLockChange = () => {
      mouseRef.current.locked = document.pointerLockElement === renderer.domElement;
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    const handleMouseMove = (e: MouseEvent) => {
      if (mouseRef.current.locked && modeRef.current === 'free') {
        yaw -= e.movementX * 0.002;
        pitch -= e.movementY * 0.002;
        pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));
      }
    };
    document.addEventListener('mousemove', handleMouseMove);

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    const handleClick = () => {
      if (modeRef.current === 'free' && !mouseRef.current.locked) {
        renderer.domElement.requestPointerLock();
      }
    };
    renderer.domElement.addEventListener('click', handleClick);

    // ====== RESIZE ======
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // ====== ANIMATION LOOP ======
    const clock = new THREE.Clock();
    let lastSpawn = 0;

    const animate = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // ====== UPDATE KAMERA ======
      if (modeRef.current === 'auto') {
        // Mode otomatis: maju lurus perlahan, tanpa pergeseran
        cameraDirection.set(pitch, yaw, 0, 'YXZ');
        camera.quaternion.setFromEuler(cameraDirection);

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        camera.position.add(forward.multiplyScalar(AUTO_SPEED * delta));

        // Bintang mengikuti kamera
        stars.position.copy(camera.position);
      } else {
        // Mode bebas
        cameraDirection.set(pitch, yaw, 0, 'YXZ');
        camera.quaternion.setFromEuler(cameraDirection);

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0);

        const moveSpeed = keysRef.current.has('ShiftLeft') ? 15 : 6;
        const targetVel = new THREE.Vector3();

        if (keysRef.current.has('KeyW')) targetVel.add(forward);
        if (keysRef.current.has('KeyS')) targetVel.sub(forward);
        if (keysRef.current.has('KeyD')) targetVel.add(right);
        if (keysRef.current.has('KeyA')) targetVel.sub(right);
        if (keysRef.current.has('Space')) targetVel.add(up);
        if (keysRef.current.has('ControlLeft')) targetVel.sub(up);

        if (targetVel.length() > 0) targetVel.normalize();
        targetVel.multiplyScalar(moveSpeed);

        cameraVelocity.lerp(targetVel, 0.1);
        camera.position.add(cameraVelocity.clone().multiplyScalar(delta));

        stars.position.copy(camera.position);
      }

      // ====== UPDATE OBJEK ======
      for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        const dist = camera.position.distanceTo(obj.mesh.position);

        // Rotasi
        obj.mesh.rotation.x += obj.rotSpeed.x;
        obj.mesh.rotation.y += obj.rotSpeed.y;
        obj.mesh.rotation.z += obj.rotSpeed.z;

        // Drift
        obj.mesh.position.add(obj.velocity.clone().multiplyScalar(delta));

        // Fade berdasarkan jarak - SMOOTH dari fog
        if (dist < FADE_DISTANCE) {
          // Objek dekat: terlihat penuh
          obj.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
              const mat = child.material as THREE.Material;
              if (mat.transparent !== undefined) {
                mat.transparent = true;
                const baseOpacity = obj.type === 'nebula' ? 0.4 : 
                                   obj.type === 'comet' ? 0.6 : 1.0;
                mat.opacity = baseOpacity;
              }
            }
          });
        } else if (dist < MAX_DISTANCE) {
          // Fade out gradual
          const fadeProgress = (dist - FADE_DISTANCE) / (MAX_DISTANCE - FADE_DISTANCE);
          const opacity = 1 - Math.pow(fadeProgress, 1.5); // easing
          obj.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
              const mat = child.material as THREE.Material;
              mat.transparent = true;
              const baseOpacity = obj.type === 'nebula' ? 0.4 : 
                                 obj.type === 'comet' ? 0.6 : 1.0;
              mat.opacity = baseOpacity * opacity;
            }
          });
        }

        // Hapus jika terlalu jauh
        if (dist > MAX_DISTANCE) {
          scene.remove(obj.mesh);
          obj.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
              } else {
                child.material.dispose();
              }
            }
          });
          objects.splice(i, 1);
        }
      }

      // Spawn objek baru
      if (objects.length < 30 && elapsed - lastSpawn > 0.5) {
        spawnObject();
        lastSpawn = elapsed;
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    // Loading selesai
    setTimeout(() => setLoading(false), 800);
    animate();

    // Cleanup
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      renderer.domElement.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Loading screen */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{ color: '#667', fontSize: '18px', fontFamily: 'monospace' }}>
            Memuat lingkungan luar angkasa...
          </div>
        </div>
      )}

      {/* UI Controls */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        <button
          onClick={() => setMode(mode === 'auto' ? 'free' : 'auto')}
          style={{
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#ccc',
            borderRadius: '6px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: '13px',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
          }}
        >
          {mode === 'auto' ? '🚀 Mode: Otomatis' : '🎮 Mode: Bebas'}
        </button>

        <div style={{
          color: '#556',
          fontSize: '11px',
          fontFamily: 'monospace',
          maxWidth: '200px',
          lineHeight: '1.4',
        }}>
          {mode === 'auto' ? (
            <>Menjelajah otomatis ke depan.<br />Klik tombol untuk mode bebas.</>
          ) : (
            <>
              WASD: Gerak<br />
              Mouse: Lihat (klik untuk lock)<br />
              Space/Ctrl: Naik/Turun<br />
              Shift: Cepat
            </>
          )}
        </div>
      </div>

      {/* Crosshair untuk mode bebas */}
      {mode === 'free' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.3)',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}
