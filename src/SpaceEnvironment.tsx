import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type Mode = 'free' | 'auto';

// ====== ASTEROID ======
function createAsteroid(size: number): THREE.Mesh {
  const geo = new THREE.IcosahedronGeometry(size, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    const noise = 0.55 + Math.random() * 0.9;
    pos.setXYZ(i, (x / len) * size * noise, (y / len) * size * noise, (z / len) * size * noise);
  }
  geo.computeVertexNormals();
  const gray = 0.08 + Math.random() * 0.12;
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(gray, gray * 0.9, gray * 0.85),
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
    transparent: true,
    opacity: 0, // mulai dari 0, fade in
  });
  const mesh = new THREE.Mesh(geo, mat);
  return mesh;
}

// ====== PLANET ======
function createPlanet(): THREE.Group {
  const group = new THREE.Group();
  const radius = 4 + Math.random() * 8;
  const geo = new THREE.SphereGeometry(radius, 32, 32);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    const bump = 1 + (Math.random() - 0.5) * 0.015;
    pos.setXYZ(i, (x / len) * radius * bump, (y / len) * radius * bump, (z / len) * radius * bump);
  }
  geo.computeVertexNormals();

  const isGas = Math.random() > 0.5;
  let color: THREE.Color;
  if (isGas) {
    const hues = [0.05, 0.08, 0.55, 0.6, 0.75];
    const hue = hues[Math.floor(Math.random() * hues.length)] + (Math.random() - 0.5) * 0.05;
    color = new THREE.Color().setHSL(hue, 0.4 + Math.random() * 0.3, 0.2 + Math.random() * 0.15);
  } else {
    color = new THREE.Color(0.18 + Math.random() * 0.1, 0.12 + Math.random() * 0.08, 0.08 + Math.random() * 0.08);
  }
  const mat = new THREE.MeshStandardMaterial({ color, roughness: isGas ? 0.6 : 0.85, metalness: 0.05, transparent: true, opacity: 0 });
  group.add(new THREE.Mesh(geo, mat));

  if (Math.random() > 0.5) {
    const innerR = radius * 1.3;
    const outerR = radius * 2;
    const ringGeo = new THREE.RingGeometry(innerR, outerR, 48);
    const ringMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.35, 0.3, 0.25),
      roughness: 0.8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI * 0.4 + Math.random() * 0.3;
    group.add(ring);
  }
  return group;
}

// ====== NEBULA ======
function createNebula(): THREE.Points {
  const count = 60;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const spread = 20 + Math.random() * 25;
  const palette = [[0.5, 0.2, 0.7], [0.15, 0.3, 0.7], [0.7, 0.15, 0.3], [0.2, 0.5, 0.7]];
  const base = palette[Math.floor(Math.random() * palette.length)];

  for (let i = 0; i < count; i++) {
    const r = spread * Math.pow(Math.random(), 0.6);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.3;
    positions[i * 3 + 2] = r * Math.cos(phi);
    const v = 0.7 + Math.random() * 0.3;
    colors[i * 3] = base[0] * v;
    colors[i * 3 + 1] = base[1] * v;
    colors[i * 3 + 2] = base[2] * v;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 3,
    vertexColors: true,
    transparent: true,
    opacity: 0, // mulai 0
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

// ====== DEBRIS ======
function createDebris(): THREE.Group {
  const group = new THREE.Group();
  const count = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    const size = 0.3 + Math.random() * 0.5;
    const geo = Math.random() > 0.5
      ? new THREE.BoxGeometry(size, size * 0.4, size * 0.3)
      : new THREE.TetrahedronGeometry(size);
    const gray = 0.12 + Math.random() * 0.12;
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(gray, gray, gray * 1.1),
      roughness: 0.5,
      metalness: 0.8,
      flatShading: true,
      transparent: true,
      opacity: 0,
    });
    const piece = new THREE.Mesh(geo, mat);
    piece.position.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
    piece.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    group.add(piece);
  }
  return group;
}

// ====== KOMAT (tanpa partikel) ======
function createComet(): THREE.Mesh {
  const size = 0.4 + Math.random() * 0.4;
  const geo = new THREE.SphereGeometry(size, 12, 12);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xaabbdd,
    emissive: 0x334466,
    emissiveIntensity: 0.4,
    roughness: 0.4,
    transparent: true,
    opacity: 0,
  });
  return new THREE.Mesh(geo, mat);
}

// ====== BANGKAI KAPAL ======
function createWreck(): THREE.Group {
  const group = new THREE.Group();
  const bodyGeo = new THREE.CylinderGeometry(0.4, 1.2, 5, 6);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a35,
    roughness: 0.6,
    metalness: 0.8,
    flatShading: true,
    transparent: true,
    opacity: 0,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.z = Math.random() * Math.PI;
  group.add(body);

  for (let i = 0; i < 1 + Math.floor(Math.random() * 2); i++) {
    const panelGeo = new THREE.BoxGeometry(0.8 + Math.random() * 0.5, 0.08, 0.4 + Math.random() * 0.3);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x1e1e28,
      roughness: 0.5,
      metalness: 0.9,
      transparent: true,
      opacity: 0,
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 2);
    panel.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    group.add(panel);
  }
  return group;
}

// ====== Bounding radius ======
function getBoundingRadius(obj: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  return Math.max(size.x, size.y, size.z) * 0.5;
}

// ====== Set opacity untuk semua child materials ======
function setAllOpacity(obj: THREE.Object3D, opacity: number) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
      const mat = child.material as THREE.Material & { opacity: number; transparent: boolean };
      mat.transparent = true;
      mat.opacity = opacity;
    }
  });
}

// ====== KOMPONEN UTAMA ======
export default function SpaceEnvironment() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('auto');
  const [loading, setLoading] = useState(true);
  const modeRef = useRef<Mode>('auto');
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef({ locked: false });

  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // ====== RENDERER ======
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // ====== SCENE ======
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // ====== KABUT SANGAT TEBAL ======
    // Density tinggi = jarak pandang sangat pendek, objek muncul dari dalam kabut
    scene.fog = new THREE.FogExp2(0x000000, 0.028);

    // ====== CAMERA ======
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 300);
    camera.position.set(0, 0, 0);

    // ====== LIGHTING ======
    scene.add(new THREE.AmbientLight(0x111122, 0.3));
    const mainLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    mainLight.position.set(50, 30, -50);
    scene.add(mainLight);
    const fillLight = new THREE.DirectionalLight(0x4466aa, 0.25);
    fillLight.position.set(-30, -10, 30);
    scene.add(fillLight);

    // ====== BINTANG BACKGROUND ======
    const starCount = 1200;
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 80 + Math.random() * 150;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
      const t = Math.random();
      if (t > 0.8) { starCol[i*3]=0.7; starCol[i*3+1]=0.8; starCol[i*3+2]=1.0; }
      else if (t > 0.6) { starCol[i*3]=1.0; starCol[i*3+1]=0.95; starCol[i*3+2]=0.7; }
      else { starCol[i*3]=1; starCol[i*3+1]=1; starCol[i*3+2]=1; }
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ====== OBJECT POOL ======
    interface SpaceObj {
      mesh: THREE.Object3D;
      type: string;
      radius: number;
      rotSpeed: THREE.Vector3;
      driftVel: THREE.Vector3;
      age: number; // umur objek (untuk fade-in)
      baseOpacity: number;
    }

    const objects: SpaceObj[] = [];

    // ====== ZONA FADE ======
    // Objek spawn jauh di dalam kabut, lalu fade-in perlahan saat kamera mendekat
    // Atau saat objek drift mendekati kamera, mereka terlihat jelas lalu fade-out lagi
    const FADE_IN_FAR = 90;   // > 90: tidak terlihat sama sekali (dalam kabut)
    const FADE_IN_NEAR = 50;  // < 50: terlihat penuh
    const FADE_OUT_NEAR = 20; // < 20: mulai pudar (melewati kamera)
    const FADE_OUT_GONE = 8;  // < 8: hilang total
    const REMOVE_DIST = 5;    // < 5: hapus dari scene
    const SAFE_ZONE = 25;     // jarak minimum spawn dari kamera
    const MIN_SPAWN = 45;
    const MAX_SPAWN = 85;
    const MAX_OBJECTS = 18;
    const FADE_IN_DURATION = 4; // detik untuk fade-in penuh setelah spawn

    function isPositionSafe(pos: THREE.Vector3, radius: number): boolean {
      const camDist = camera.position.distanceTo(pos);
      if (camDist < SAFE_ZONE + radius) return false;
      for (const obj of objects) {
        const dist = pos.distanceTo(obj.mesh.position);
        const minDist = radius + obj.radius + 3;
        if (dist < minDist) return false;
      }
      return true;
    }

    function spawnObject(): boolean {
      const rand = Math.random();
      let mesh: THREE.Object3D;
      let type: string;
      let baseOpacity: number;

      if (rand < 0.35) {
        const size = 0.5 + Math.random() * 2.5;
        mesh = createAsteroid(size);
        type = 'asteroid';
        baseOpacity = 1.0;
      } else if (rand < 0.50) {
        mesh = createPlanet();
        type = 'planet';
        baseOpacity = 1.0;
      } else if (rand < 0.62) {
        mesh = createNebula();
        type = 'nebula';
        baseOpacity = 0.12;
      } else if (rand < 0.78) {
        mesh = createDebris();
        type = 'debris';
        baseOpacity = 1.0;
      } else if (rand < 0.90) {
        mesh = createComet();
        type = 'comet';
        baseOpacity = 1.0;
      } else {
        mesh = createWreck();
        type = 'wreck';
        baseOpacity = 1.0;
      }

      const radius = getBoundingRadius(mesh);

      let placed = false;
      let spawnPos = new THREE.Vector3();

      for (let attempt = 0; attempt < 20; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = MIN_SPAWN + Math.random() * (MAX_SPAWN - MIN_SPAWN);
        const height = (Math.random() - 0.5) * 45;

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

        spawnPos = camera.position.clone()
          .add(forward.clone().multiplyScalar(dist * 0.5))
          .add(right.clone().multiplyScalar(Math.cos(angle) * dist * 0.6))
          .add(up.clone().multiplyScalar(height));

        if (isPositionSafe(spawnPos, radius)) {
          placed = true;
          break;
        }
      }

      if (!placed) {
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        });
        return false;
      }

      mesh.position.copy(spawnPos);
      mesh.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
      scene.add(mesh);

      const rotSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 0.006,
        (Math.random() - 0.5) * 0.006,
        (Math.random() - 0.5) * 0.006
      );
      const driftVel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.012,
        (Math.random() - 0.5) * 0.006,
        (Math.random() - 0.5) * 0.012
      );

      objects.push({ mesh, type, radius, rotSpeed, driftVel, age: 0, baseOpacity });
      return true;
    }

    // Spawn awal - semua mulai dari opacity 0
    for (let i = 0; i < 15; i++) {
      spawnObject();
    }

    // ====== KAMERA ======
    const cameraVelocity = new THREE.Vector3();
    const cameraDirection = new THREE.Euler(0, 0, 0, 'YXZ');
    let yaw = 0;
    let pitch = 0;
    const AUTO_SPEED = 1.8;

    // ====== EVENTS ======
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
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current.add(e.code); };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current.delete(e.code); };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    const handleClick = () => {
      if (modeRef.current === 'free' && !mouseRef.current.locked) {
        renderer.domElement.requestPointerLock();
      }
    };
    renderer.domElement.addEventListener('click', handleClick);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // ====== ANIMATION LOOP ======
    const clock = new THREE.Clock();
    let spawnTimer = 0;

    const animate = () => {
      const delta = clock.getDelta();

      // ====== UPDATE KAMERA ======
      cameraDirection.set(pitch, yaw, 0, 'YXZ');
      camera.quaternion.setFromEuler(cameraDirection);

      if (modeRef.current === 'auto') {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        camera.position.add(forward.multiplyScalar(AUTO_SPEED * delta));
      } else {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0);
        const speed = keysRef.current.has('ShiftLeft') ? 14 : 5;
        const target = new THREE.Vector3();
        if (keysRef.current.has('KeyW')) target.add(forward);
        if (keysRef.current.has('KeyS')) target.sub(forward);
        if (keysRef.current.has('KeyD')) target.add(right);
        if (keysRef.current.has('KeyA')) target.sub(right);
        if (keysRef.current.has('Space')) target.add(up);
        if (keysRef.current.has('ControlLeft')) target.sub(up);
        if (target.length() > 0) target.normalize();
        target.multiplyScalar(speed);
        cameraVelocity.lerp(target, 0.1);
        camera.position.add(cameraVelocity.clone().multiplyScalar(delta));
      }

      stars.position.copy(camera.position);

      // ====== UPDATE OBJEK ======
      for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        const dist = camera.position.distanceTo(obj.mesh.position);

        // Update umur (untuk fade-in)
        obj.age += delta;

        // Rotasi
        obj.mesh.rotation.x += obj.rotSpeed.x;
        obj.mesh.rotation.y += obj.rotSpeed.y;
        obj.mesh.rotation.z += obj.rotSpeed.z;

        // Drift
        obj.mesh.position.add(obj.driftVel.clone().multiplyScalar(delta));

        // ====== HITUNG OPACITY FINAL ======
        // 1. Spawn fade-in ( gradual muncul dari kabut)
        let spawnFade = Math.min(obj.age / FADE_IN_DURATION, 1.0);
        // Easing smooth
        spawnFade = spawnFade * spawnFade * (3 - 2 * spawnFade); // smoothstep

        // 2. Distance fade (objek jauh = samar, objek dekat = jelas)
        let distFade: number;
        if (dist > FADE_IN_FAR) {
          // Sangat jauh: tidak terlihat
          distFade = 0;
        } else if (dist > FADE_IN_NEAR) {
          // Zone fade-in: dari kabut ke terlihat
          const t = (dist - FADE_IN_NEAR) / (FADE_IN_FAR - FADE_IN_NEAR);
          distFade = 1 - t * t; // smooth
        } else if (dist > FADE_OUT_NEAR) {
          // Zone terlihat penuh
          distFade = 1;
        } else if (dist > FADE_OUT_GONE) {
          // Zone fade-out: mulai pudar saat melewati kamera
          const t = (dist - FADE_OUT_GONE) / (FADE_OUT_NEAR - FADE_OUT_GONE);
          distFade = t * t; // smooth
        } else {
          // Sangat dekat: hilang
          distFade = 0;
        }

        // Opacity final = base * spawnFade * distFade
        const finalOpacity = obj.baseOpacity * spawnFade * distFade;
        setAllOpacity(obj.mesh, finalOpacity);

        // Hapus jika terlalu dekat atau terlalu jauh
        if (dist < REMOVE_DIST || dist > FADE_IN_FAR + 20) {
          scene.remove(obj.mesh);
          obj.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
              else child.material.dispose();
            }
          });
          objects.splice(i, 1);
        }
      }

      // ====== LOOP SPAWN ======
      spawnTimer += delta;
      if (objects.length < MAX_OBJECTS && spawnTimer > 2.0) {
        spawnObject();
        spawnTimer = 0;
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    setTimeout(() => setLoading(false), 600);
    animate();

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      renderer.domElement.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#000' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {loading && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{ color: '#334', fontSize: '16px', fontFamily: 'monospace' }}>Memuat...</div>
        </div>
      )}

      <div style={{
        position: 'absolute', top: '20px', left: '20px', zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        <button
          onClick={() => setMode(mode === 'auto' ? 'free' : 'auto')}
          style={{
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#aaa',
            borderRadius: '5px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: '12px',
            backdropFilter: 'blur(8px)',
          }}
        >
          {mode === 'auto' ? '🚀 Otomatis' : '🎮 Bebas'}
        </button>
        <div style={{ color: '#445', fontSize: '10px', fontFamily: 'monospace', maxWidth: '180px', lineHeight: '1.4' }}>
          {mode === 'auto'
            ? 'Menjelajah otomatis.'
            : <>WASD: Gerak<br/>Mouse: Lihat (klik)<br/>Space/Ctrl: Naik/Turun<br/>Shift: Cepat</>
          }
        </div>
      </div>

      {mode === 'free' && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: '3px', height: '3px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.25)',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}
