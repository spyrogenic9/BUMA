import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type Mode = 'free' | 'auto';

// ====== ASTEROID - kualitas tinggi ======
function createAsteroid(size: number): THREE.Mesh {
  const geo = new THREE.IcosahedronGeometry(size, 3); // detail lebih tinggi
  const pos = geo.attributes.position;
  
  // Displacement dengan noise multi-layer
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    
    // Multi-octave noise
    const noise1 = 0.6 + Math.random() * 0.8;
    const noise2 = 0.8 + Math.sin(x * 2) * 0.1 + Math.cos(y * 2) * 0.1;
    const finalNoise = noise1 * noise2;
    
    pos.setXYZ(i, (x / len) * size * finalNoise, (y / len) * size * finalNoise, (z / len) * size * finalNoise);
  }
  geo.computeVertexNormals();
  
  // Warna batuan dengan variasi mineral
  const baseGray = 0.06 + Math.random() * 0.1;
  const mineralTint = Math.random();
  let color: THREE.Color;
  
  if (mineralTint < 0.3) {
    // Besi/rust
    color = new THREE.Color(baseGray * 1.2, baseGray * 0.8, baseGray * 0.7);
  } else if (mineralTint < 0.6) {
    // Silicate
    color = new THREE.Color(baseGray, baseGray * 0.95, baseGray * 0.9);
  } else {
    // Karbon gelap
    color = new THREE.Color(baseGray * 0.7, baseGray * 0.7, baseGray * 0.75);
  }
  
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.92 + Math.random() * 0.08,
    metalness: 0.08 + Math.random() * 0.15,
    flatShading: true,
    transparent: true,
    opacity: 0,
  });
  
  return new THREE.Mesh(geo, mat);
}

// ====== PLANET - kualitas tinggi dengan atmosfer ======
function createPlanet(): THREE.Group {
  const group = new THREE.Group();
  const radius = 4 + Math.random() * 8;
  
  // Body planet dengan detail tinggi
  const geo = new THREE.SphereGeometry(radius, 64, 64);
  const pos = geo.attributes.position;
  
  // Surface variation halus
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    
    // Terrain noise
    const terrainNoise = 1 + (Math.random() - 0.5) * 0.008;
    const latitudinalBand = 1 + Math.sin(y / radius * Math.PI * 3) * 0.01;
    const bump = terrainNoise * latitudinalBand;
    
    pos.setXYZ(i, (x / len) * radius * bump, (y / len) * radius * bump, (z / len) * radius * bump);
  }
  geo.computeVertexNormals();
  
  // Warna planet bervariasi
  const isGasGiant = Math.random() > 0.4;
  let color: THREE.Color;
  
  if (isGasGiant) {
    const gasTypes = [
      { hue: 0.05, sat: 0.5, light: 0.25 }, // Jupiter-like
      { hue: 0.08, sat: 0.4, light: 0.2 },  // Saturn-like
      { hue: 0.55, sat: 0.6, light: 0.3 },  // Neptune-like
      { hue: 0.6, sat: 0.5, light: 0.25 },  // Uranus-like
      { hue: 0.75, sat: 0.4, light: 0.2 },  // Purple giant
    ];
    const gasType = gasTypes[Math.floor(Math.random() * gasTypes.length)];
    color = new THREE.Color().setHSL(
      gasType.hue + (Math.random() - 0.5) * 0.03,
      gasType.sat + Math.random() * 0.2,
      gasType.light + Math.random() * 0.1
    );
  } else {
    // Rocky planet
    const rockyTypes = [
      new THREE.Color(0.2, 0.15, 0.1),  // Mars-like
      new THREE.Color(0.15, 0.18, 0.12), // Earth-like (land)
      new THREE.Color(0.12, 0.12, 0.15), // Moon-like
    ];
    color = rockyTypes[Math.floor(Math.random() * rockyTypes.length)];
  }
  
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: isGasGiant ? 0.5 : 0.8,
    metalness: 0.05,
    transparent: true,
    opacity: 0,
  });
  
  const planet = new THREE.Mesh(geo, mat);
  group.add(planet);
  
  // Atmosfer glow
  if (Math.random() > 0.3) {
    const atmosGeo = new THREE.SphereGeometry(radius * 1.05, 32, 32);
    const atmosColor = isGasGiant 
      ? new THREE.Color().setHSL(Math.random() * 0.2 + 0.5, 0.5, 0.5)
      : new THREE.Color(0.3, 0.5, 0.8);
    
    const atmosMat = new THREE.MeshBasicMaterial({
      color: atmosColor,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
    });
    const atmos = new THREE.Mesh(atmosGeo, atmosMat);
    group.add(atmos);
  }
  
  // Cincin
  if (Math.random() > 0.5) {
    const innerR = radius * 1.3;
    const outerR = radius * (1.8 + Math.random() * 0.5);
    const ringGeo = new THREE.RingGeometry(innerR, outerR, 64);
    
    // Warna cincin bervariasi
    const ringColors = [
      new THREE.Color(0.4, 0.35, 0.3),
      new THREE.Color(0.3, 0.25, 0.2),
      new THREE.Color(0.5, 0.4, 0.35),
    ];
    
    const ringMat = new THREE.MeshStandardMaterial({
      color: ringColors[Math.floor(Math.random() * ringColors.length)],
      roughness: 0.8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI * 0.4 + Math.random() * 0.3;
    ring.rotation.y = Math.random() * Math.PI;
    group.add(ring);
  }
  
  return group;
}

// ====== NEBULA - awan gas berkualitas ======
function createNebula(): THREE.Points {
  const count = 100;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const spread = 25 + Math.random() * 30;
  
  const palettes = [
    [[0.5, 0.2, 0.7], [0.6, 0.3, 0.8]],  // Ungu-pink
    [[0.15, 0.3, 0.7], [0.2, 0.5, 0.9]], // Biru-cyan
    [[0.7, 0.15, 0.3], [0.9, 0.3, 0.4]], // Merah-orange
    [[0.2, 0.5, 0.7], [0.3, 0.7, 0.9]], // Cyan-teal
  ];
  
  const palette = palettes[Math.floor(Math.random() * palettes.length)];
  const base = palette[0];
  const accent = palette[1];
  
  for (let i = 0; i < count; i++) {
    const r = spread * Math.pow(Math.random(), 0.5);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.35;
    positions[i * 3 + 2] = r * Math.cos(phi);
    
    // Gradient warna
    const t = Math.random();
    const mixColor = [
      base[0] * (1 - t) + accent[0] * t,
      base[1] * (1 - t) + accent[1] * t,
      base[2] * (1 - t) + accent[2] * t,
    ];
    
    const brightness = 0.6 + Math.random() * 0.4;
    colors[i * 3] = mixColor[0] * brightness;
    colors[i * 3 + 1] = mixColor[1] * brightness;
    colors[i * 3 + 2] = mixColor[2] * brightness;
  }
  
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  const mat = new THREE.PointsMaterial({
    size: 4,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  
  return new THREE.Points(geo, mat);
}

// ====== DEBRIS - puing berkualitas ======
function createDebris(): THREE.Group {
  const group = new THREE.Group();
  const count = 1 + Math.floor(Math.random() * 2);
  
  for (let i = 0; i < count; i++) {
    const size = 0.3 + Math.random() * 0.6;
    const type = Math.floor(Math.random() * 4);
    let geo: THREE.BufferGeometry;
    
    if (type === 0) {
      geo = new THREE.BoxGeometry(size, size * 0.4, size * 0.3);
    } else if (type === 1) {
      geo = new THREE.TetrahedronGeometry(size);
    } else if (type === 2) {
      geo = new THREE.OctahedronGeometry(size * 0.5);
    } else {
      geo = new THREE.CylinderGeometry(size * 0.2, size * 0.2, size, 6);
    }
    
    const gray = 0.1 + Math.random() * 0.15;
    const metalness = 0.7 + Math.random() * 0.3;
    
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(gray, gray, gray * 1.1),
      roughness: 0.4 + Math.random() * 0.3,
      metalness,
      flatShading: true,
      transparent: true,
      opacity: 0,
    });
    
    const piece = new THREE.Mesh(geo, mat);
    piece.position.set(
      (Math.random() - 0.5) * 2.5,
      (Math.random() - 0.5) * 2.5,
      (Math.random() - 0.5) * 2.5
    );
    piece.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    group.add(piece);
  }
  
  return group;
}

// ====== KOMET - tanpa ekor ======
function createComet(): THREE.Mesh {
  const coreSize = 0.5 + Math.random() * 0.5;
  const coreGeo = new THREE.SphereGeometry(coreSize, 16, 16);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xccddee,
    emissive: 0x5577aa,
    emissiveIntensity: 0.6,
    roughness: 0.3,
    transparent: true,
    opacity: 0,
  });
  return new THREE.Mesh(coreGeo, coreMat);
}

// ====== SATELIT ======
function createSatellite(): THREE.Group {
  const group = new THREE.Group();
  
  // Badan utama
  const bodyGeo = new THREE.BoxGeometry(0.8, 0.8, 1.2);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x888899,
    roughness: 0.3,
    metalness: 0.9,
    transparent: true,
    opacity: 0,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);
  
  // Panel surya (2 sisi)
  for (let side = -1; side <= 1; side += 2) {
    const panelGeo = new THREE.BoxGeometry(2.5, 0.05, 1);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x223366,
      roughness: 0.4,
      metalness: 0.7,
      emissive: 0x112244,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0,
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.x = side * 1.8;
    group.add(panel);
  }
  
  // Antena
  const antennaGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
  const antennaMat = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa,
    roughness: 0.5,
    metalness: 0.8,
    transparent: true,
    opacity: 0,
  });
  const antenna = new THREE.Mesh(antennaGeo, antennaMat);
  antenna.position.y = 0.9;
  group.add(antenna);
  
  // Dish antena
  const dishGeo = new THREE.SphereGeometry(0.3, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const dishMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.3,
    metalness: 0.9,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
  });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.position.y = 1.4;
  dish.rotation.x = Math.PI;
  group.add(dish);
  
  return group;
}

// ====== STASIUN LUAR ANGKASA ======
function createSpaceStation(): THREE.Group {
  const group = new THREE.Group();
  
  // Modul utama (silinder besar)
  const mainGeo = new THREE.CylinderGeometry(1.2, 1.2, 4, 16);
  const mainMat = new THREE.MeshStandardMaterial({
    color: 0x999999,
    roughness: 0.4,
    metalness: 0.8,
    transparent: true,
    opacity: 0,
  });
  const main = new THREE.Mesh(mainGeo, mainMat);
  main.rotation.z = Math.PI / 2;
  group.add(main);
  
  // Modul samping
  for (let i = -1; i <= 1; i += 2) {
    const sideGeo = new THREE.CylinderGeometry(0.8, 0.8, 2.5, 12);
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.5,
      metalness: 0.7,
      transparent: true,
      opacity: 0,
    });
    const side = new THREE.Mesh(sideGeo, sideMat);
    side.position.y = i * 1.5;
    group.add(side);
  }
  
  // Panel surya besar
  for (let side = -1; side <= 1; side += 2) {
    const panelGeo = new THREE.BoxGeometry(4, 0.05, 1.5);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x223355,
      roughness: 0.4,
      metalness: 0.6,
      emissive: 0x112233,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0,
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.x = side * 3;
    group.add(panel);
  }
  
  // Truss structure
  const trussGeo = new THREE.BoxGeometry(8, 0.15, 0.15);
  const trussMat = new THREE.MeshStandardMaterial({
    color: 0x666666,
    roughness: 0.6,
    metalness: 0.9,
    transparent: true,
    opacity: 0,
  });
  const truss = new THREE.Mesh(trussGeo, trussMat);
  truss.position.y = 0.5;
  group.add(truss);
  
  return group;
}

// ====== LUBANG HITAM ======
function createBlackHole(): THREE.Group {
  const group = new THREE.Group();
  
  // Event horizon (bola hitam)
  const holeGeo = new THREE.SphereGeometry(2, 32, 32);
  const holeMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0,
  });
  const hole = new THREE.Mesh(holeGeo, holeMat);
  group.add(hole);
  
  // Accretion disk (cincin materi)
  const diskGeo = new THREE.RingGeometry(2.5, 5, 64);
  const diskMat = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const disk = new THREE.Mesh(diskGeo, diskMat);
  disk.rotation.x = Math.PI / 2;
  group.add(disk);
  
  // Glow ring
  const glowGeo = new THREE.RingGeometry(2.2, 2.8, 64);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.rotation.x = Math.PI / 2;
  group.add(glow);
  
  return group;
}

// ====== WORMHOLE / PORTAL ======
function createWormhole(): THREE.Group {
  const group = new THREE.Group();
  
  // Portal ring
  const ringGeo = new THREE.TorusGeometry(3, 0.3, 16, 48);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x6633ff,
    emissive: 0x4422aa,
    emissiveIntensity: 0.8,
    roughness: 0.3,
    metalness: 0.7,
    transparent: true,
    opacity: 0,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  group.add(ring);
  
  // Inner portal (disc)
  const portalGeo = new THREE.CircleGeometry(2.8, 48);
  const portalMat = new THREE.MeshBasicMaterial({
    color: 0x8844ff,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const portal = new THREE.Mesh(portalGeo, portalMat);
  group.add(portal);
  
  // Outer glow
  const glowGeo = new THREE.TorusGeometry(3.5, 0.5, 16, 48);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xaa66ff,
    transparent: true,
    opacity: 0,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  group.add(glow);
  
  return group;
}

// ====== KRISTAL ENERGI ======
function createEnergyCrystal(): THREE.Group {
  const group = new THREE.Group();
  
  // Kristal utama
  const crystalGeo = new THREE.OctahedronGeometry(1.5);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x00ffcc,
    emissive: 0x00aa88,
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.5,
    transparent: true,
    opacity: 0,
  });
  const crystal = new THREE.Mesh(crystalGeo, crystalMat);
  group.add(crystal);
  
  // Kristal kecil di sekitar
  for (let i = 0; i < 4; i++) {
    const smallGeo = new THREE.OctahedronGeometry(0.5 + Math.random() * 0.3);
    const smallMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x008866,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.6,
      transparent: true,
      opacity: 0,
    });
    const small = new THREE.Mesh(smallGeo, smallMat);
    const angle = (i / 4) * Math.PI * 2;
    small.position.set(
      Math.cos(angle) * 2,
      (Math.random() - 0.5) * 1.5,
      Math.sin(angle) * 2
    );
    small.rotation.set(Math.random(), Math.random(), Math.random());
    group.add(small);
  }
  
  // Point light
  const light = new THREE.PointLight(0x00ffcc, 2, 15);
  group.add(light);
  
  return group;
}

// ====== BANGKAI KAPAL - detail tinggi ======
function createWreck(): THREE.Group {
  const group = new THREE.Group();
  
  // Badan utama
  const bodyGeo = new THREE.CylinderGeometry(0.5, 1.5, 6, 8);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a35,
    roughness: 0.6,
    metalness: 0.85,
    flatShading: true,
    transparent: true,
    opacity: 0,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.z = Math.random() * Math.PI;
  group.add(body);
  
  // Panel rusak
  for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
    const panelGeo = new THREE.BoxGeometry(
      0.8 + Math.random() * 0.6,
      0.08,
      0.4 + Math.random() * 0.4
    );
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x1e1e28,
      roughness: 0.5,
      metalness: 0.9,
      transparent: true,
      opacity: 0,
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
  
  // Lampu darurat (kedip)
  if (Math.random() > 0.5) {
    const lightGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const lightMat = new THREE.MeshBasicMaterial({
      color: 0xff3333,
      transparent: true,
      opacity: 0,
    });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    );
    group.add(light);
  }
  
  return group;
}

// ====== MATAHARI - hanya inti + cahaya ======
function createSun(): THREE.Group {
  const group = new THREE.Group();
  
  // Inti matahari - solid, tidak transparan
  const sunGeo = new THREE.SphereGeometry(5, 32, 32);
  const sunMat = new THREE.MeshBasicMaterial({
    color: 0xffffee,
    transparent: false,
  });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  group.add(sun);
  
  // Point light untuk efek cahaya
  const sunLight = new THREE.PointLight(0xffdd66, 8, 150);
  group.add(sunLight);
  
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
  const [sunIntensity, setSunIntensity] = useState(2.0);
  const modeRef = useRef<Mode>('auto');
  const sunIntensityRef = useRef(2.0);
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef({ locked: false });

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { sunIntensityRef.current = sunIntensity; }, [sunIntensity]);

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
    scene.fog = new THREE.FogExp2(0x000000, 0.028);

    // ====== CAMERA ======
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 300);
    camera.position.set(0, 0, 0);

    // ====== LIGHTING ======
    scene.add(new THREE.AmbientLight(0x222233, 0.5));
    
    // Cahaya utama dari matahari (akan di-update posisinya)
    const mainLight = new THREE.DirectionalLight(0xffdd88, 1.5);
    mainLight.position.set(0, 3, -35);
    scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0x4466aa, 0.3);
    fillLight.position.set(-30, -10, 30);
    scene.add(fillLight);

    // ====== MATAHARI - di depan kamera ======
    const sun = createSun();
    // Posisi lebih dekat agar terlihat jelas
    const sunBaseOffset = new THREE.Vector3(0, 3, -35);
    scene.add(sun);
    
    // Simpan referensi sunLight untuk update intensity
    const sunLight = sun.children.find(child => child instanceof THREE.PointLight) as THREE.PointLight;

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
      age: number;
      baseOpacity: number;
    }

    const objects: SpaceObj[] = [];
    const FADE_IN_FAR = 90;
    const FADE_IN_NEAR = 50;
    const FADE_OUT_NEAR = 20;
    const FADE_OUT_GONE = 8;
    const REMOVE_DIST = 5;
    const SAFE_ZONE = 25;
    const MIN_SPAWN = 45;
    const MAX_SPAWN = 85;
    const MAX_OBJECTS = 36; // 2x lebih banyak
    const FADE_IN_DURATION = 4;

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

      if (rand < 0.20) {
        const size = 0.5 + Math.random() * 2.5;
        mesh = createAsteroid(size);
        type = 'asteroid';
        baseOpacity = 1.0;
      } else if (rand < 0.32) {
        mesh = createPlanet();
        type = 'planet';
        baseOpacity = 1.0;
      } else if (rand < 0.40) {
        mesh = createNebula();
        type = 'nebula';
        baseOpacity = 0.12;
      } else if (rand < 0.50) {
        mesh = createDebris();
        type = 'debris';
        baseOpacity = 1.0;
      } else if (rand < 0.58) {
        mesh = createComet();
        type = 'comet';
        baseOpacity = 1.0;
      } else if (rand < 0.65) {
        mesh = createWreck();
        type = 'wreck';
        baseOpacity = 1.0;
      } else if (rand < 0.73) {
        mesh = createSatellite();
        type = 'satellite';
        baseOpacity = 1.0;
      } else if (rand < 0.81) {
        mesh = createSpaceStation();
        type = 'station';
        baseOpacity = 1.0;
      } else if (rand < 0.88) {
        mesh = createBlackHole();
        type = 'blackhole';
        baseOpacity = 1.0;
      } else if (rand < 0.94) {
        mesh = createWormhole();
        type = 'wormhole';
        baseOpacity = 1.0;
      } else {
        mesh = createEnergyCrystal();
        type = 'crystal';
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

    // Spawn awal - lebih banyak untuk populate scene
    for (let i = 0; i < 25; i++) {
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
      const elapsed = clock.getElapsedTime();

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

      // ====== UPDATE MATAHARI - tetap di depan kamera ======
      const sunOffset = new THREE.Vector3(0, 3, -35);
      const sunWorldOffset = sunOffset.clone().applyQuaternion(camera.quaternion);
      sun.position.copy(camera.position).add(sunWorldOffset);
      
      // Update directional light mengikuti matahari
      mainLight.position.copy(sun.position);
      
      // Update intensity matahari dari slider
      if (sunLight) {
        sunLight.intensity = sunIntensityRef.current * 4; // Scale up intensity
      }
      mainLight.intensity = sunIntensityRef.current * 0.8;

      // ====== UPDATE OBJEK ======
      for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        const dist = camera.position.distanceTo(obj.mesh.position);

        obj.age += delta;

        obj.mesh.rotation.x += obj.rotSpeed.x;
        obj.mesh.rotation.y += obj.rotSpeed.y;
        obj.mesh.rotation.z += obj.rotSpeed.z;

        obj.mesh.position.add(obj.driftVel.clone().multiplyScalar(delta));

        // ====== FADE ======
        let spawnFade = Math.min(obj.age / FADE_IN_DURATION, 1.0);
        spawnFade = spawnFade * spawnFade * (3 - 2 * spawnFade);

        let distFade: number;
        if (dist > FADE_IN_FAR) {
          distFade = 0;
        } else if (dist > FADE_IN_NEAR) {
          const t = (dist - FADE_IN_NEAR) / (FADE_IN_FAR - FADE_IN_NEAR);
          distFade = 1 - t * t;
        } else if (dist > FADE_OUT_NEAR) {
          distFade = 1;
        } else if (dist > FADE_OUT_GONE) {
          const t = (dist - FADE_OUT_GONE) / (FADE_OUT_NEAR - FADE_OUT_GONE);
          distFade = t * t;
        } else {
          distFade = 0;
        }

        const finalOpacity = obj.baseOpacity * spawnFade * distFade;
        setAllOpacity(obj.mesh, finalOpacity);

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

      // ====== LOOP SPAWN - 2x lebih cepat ======
      spawnTimer += delta;
      if (objects.length < MAX_OBJECTS && spawnTimer > 0.5) {
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
        
        {/* Sun Intensity Slider */}
        <div style={{
          marginTop: '8px',
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '5px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ color: '#888', fontSize: '10px', fontFamily: 'monospace', marginBottom: '6px' }}>
            ☀️ Kekuatan Matahari
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={sunIntensity}
            onChange={(e) => setSunIntensity(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: '4px',
              borderRadius: '2px',
              background: 'rgba(255,255,255,0.1)',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
          <div style={{ color: '#667', fontSize: '9px', fontFamily: 'monospace', marginTop: '4px', textAlign: 'center' }}>
            {sunIntensity.toFixed(1)}
          </div>
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
