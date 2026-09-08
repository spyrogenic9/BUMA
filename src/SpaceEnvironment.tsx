import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

type Mode = 'free' | 'auto';

// ====== ASTEROID - ultra realistis ======
function createAsteroid(size: number): THREE.Mesh {
  const geo = new THREE.IcosahedronGeometry(size, 4); // detail sangat tinggi
  const pos = geo.attributes.position;
  
  // Displacement dengan noise multi-layer untuk bentuk tidak beraturan
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    
    // Multi-octave noise untuk variasi permukaan
    const noise1 = 0.5 + Math.random() * 1.0;
    const noise2 = 0.7 + Math.sin(x * 3) * 0.15 + Math.cos(y * 3) * 0.15;
    const noise3 = 0.85 + Math.sin(z * 5) * 0.08;
    const finalNoise = noise1 * noise2 * noise3;
    
    pos.setXYZ(i, (x / len) * size * finalNoise, (y / len) * size * finalNoise, (z / len) * size * finalNoise);
  }
  geo.computeVertexNormals();
  
  // Warna batuan dengan variasi mineral realistis
  const baseGray = 0.08 + Math.random() * 0.12;
  const mineralTint = Math.random();
  let color: THREE.Color;
  
  if (mineralTint < 0.25) {
    // Besi berkarat
    color = new THREE.Color(baseGray * 1.3, baseGray * 0.7, baseGray * 0.6);
  } else if (mineralTint < 0.5) {
    // Silikat abu-abu
    color = new THREE.Color(baseGray, baseGray * 0.95, baseGray * 0.9);
  } else if (mineralTint < 0.75) {
    // Karbon gelap
    color = new THREE.Color(baseGray * 0.6, baseGray * 0.6, baseGray * 0.65);
  } else {
    // Nikel-besi metalik
    color = new THREE.Color(baseGray * 1.1, baseGray * 1.05, baseGray * 1.0);
  }
  
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85 + Math.random() * 0.15,
    metalness: 0.1 + Math.random() * 0.25,
    flatShading: true,
    transparent: true,
    opacity: 0,
    envMapIntensity: 0.5,
  });
  
  return new THREE.Mesh(geo, mat);
}

// ====== PLANET - ultra realistis dengan atmosfer detail ======
function createPlanet(): THREE.Group {
  const group = new THREE.Group();
  const radius = 4 + Math.random() * 10;
  
  // Body planet dengan detail sangat tinggi
  const geo = new THREE.SphereGeometry(radius, 96, 96);
  const pos = geo.attributes.position;
  
  // Surface variation dengan noise kompleks
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    
    // Multi-layer terrain noise
    const terrainNoise = 1 + (Math.random() - 0.5) * 0.006;
    const latitudinalBand = 1 + Math.sin(y / radius * Math.PI * 4) * 0.008;
    const longitudinalVar = 1 + Math.sin(x / radius * Math.PI * 3) * 0.005;
    const bump = terrainNoise * latitudinalBand * longitudinalVar;
    
    pos.setXYZ(i, (x / len) * radius * bump, (y / len) * radius * bump, (z / len) * radius * bump);
  }
  geo.computeVertexNormals();
  
  // Warna planet bervariasi dengan lebih banyak tipe
  const isGasGiant = Math.random() > 0.35;
  let color: THREE.Color;
  
  if (isGasGiant) {
    const gasTypes = [
      { hue: 0.05, sat: 0.55, light: 0.28 }, // Jupiter-like
      { hue: 0.08, sat: 0.45, light: 0.22 },  // Saturn-like
      { hue: 0.55, sat: 0.65, light: 0.32 },  // Neptune-like
      { hue: 0.6, sat: 0.55, light: 0.28 },   // Uranus-like
      { hue: 0.75, sat: 0.45, light: 0.22 },  // Purple giant
      { hue: 0.02, sat: 0.6, light: 0.3 },    // Hot Jupiter
      { hue: 0.12, sat: 0.5, light: 0.25 },   // Brown dwarf
    ];
    const gasType = gasTypes[Math.floor(Math.random() * gasTypes.length)];
    color = new THREE.Color().setHSL(
      gasType.hue + (Math.random() - 0.5) * 0.04,
      gasType.sat + Math.random() * 0.25,
      gasType.light + Math.random() * 0.12
    );
  } else {
    // Rocky planet dengan lebih banyak variasi
    const rockyTypes = [
      new THREE.Color(0.22, 0.15, 0.1),   // Mars-like
      new THREE.Color(0.15, 0.2, 0.12),   // Earth-like (land)
      new THREE.Color(0.12, 0.12, 0.15),  // Moon-like
      new THREE.Color(0.18, 0.14, 0.11),  // Mercury-like
      new THREE.Color(0.25, 0.18, 0.12),  // Venus-like
    ];
    color = rockyTypes[Math.floor(Math.random() * rockyTypes.length)];
  }
  
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: isGasGiant ? 0.45 : 0.75,
    metalness: 0.08,
    transparent: true,
    opacity: 0,
    envMapIntensity: 0.8,
  });
  
  const planet = new THREE.Mesh(geo, mat);
  group.add(planet);
  
  // Atmosfer glow multi-layer
  if (Math.random() > 0.25) {
    // Inner atmosphere
    const atmos1Geo = new THREE.SphereGeometry(radius * 1.03, 48, 48);
    const atmosColor = isGasGiant 
      ? new THREE.Color().setHSL(Math.random() * 0.2 + 0.5, 0.6, 0.5)
      : new THREE.Color(0.3, 0.55, 0.85);
    
    const atmos1Mat = new THREE.MeshBasicMaterial({
      color: atmosColor,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const atmos1 = new THREE.Mesh(atmos1Geo, atmos1Mat);
    group.add(atmos1);
    
    // Outer atmosphere
    const atmos2Geo = new THREE.SphereGeometry(radius * 1.08, 48, 48);
    const atmos2Mat = new THREE.MeshBasicMaterial({
      color: atmosColor.clone().multiplyScalar(0.7),
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const atmos2 = new THREE.Mesh(atmos2Geo, atmos2Mat);
    group.add(atmos2);
  }
  
  // Cincin dengan detail lebih baik
  if (Math.random() > 0.45) {
    const innerR = radius * 1.3;
    const outerR = radius * (1.9 + Math.random() * 0.6);
    const ringGeo = new THREE.RingGeometry(innerR, outerR, 96);
    
    // Warna cincin bervariasi
    const ringColors = [
      new THREE.Color(0.45, 0.38, 0.32),
      new THREE.Color(0.35, 0.28, 0.22),
      new THREE.Color(0.52, 0.42, 0.38),
      new THREE.Color(0.4, 0.35, 0.3),
    ];
    
    const ringMat = new THREE.MeshStandardMaterial({
      color: ringColors[Math.floor(Math.random() * ringColors.length)],
      roughness: 0.75,
      metalness: 0.15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      envMapIntensity: 0.6,
    });
    
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI * 0.4 + Math.random() * 0.3;
    ring.rotation.y = Math.random() * Math.PI;
    group.add(ring);
  }
  
  return group;
}

// ====== NEBULA - volumetric realistis ======
function createNebula(): THREE.Points {
  const count = 180; // lebih banyak partikel untuk volumetric look
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const spread = 30 + Math.random() * 35;
  
  const palettes = [
    [[0.5, 0.2, 0.7], [0.65, 0.35, 0.85], [0.4, 0.15, 0.6]],  // Ungu-pink
    [[0.15, 0.3, 0.7], [0.25, 0.55, 0.95], [0.1, 0.25, 0.6]], // Biru-cyan
    [[0.7, 0.15, 0.3], [0.95, 0.35, 0.45], [0.6, 0.1, 0.25]], // Merah-orange
    [[0.2, 0.5, 0.7], [0.35, 0.75, 0.95], [0.15, 0.4, 0.6]],  // Cyan-teal
    [[0.6, 0.3, 0.5], [0.8, 0.4, 0.7], [0.5, 0.2, 0.4]],      // Magenta
  ];
  
  const palette = palettes[Math.floor(Math.random() * palettes.length)];
  const base = palette[0];
  const accent = palette[1];
  const deep = palette[2];
  
  for (let i = 0; i < count; i++) {
    // Distribusi gaussian untuk bentuk awan natural
    const r = spread * Math.pow(Math.random(), 0.45);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.3; // lebih pipih
    positions[i * 3 + 2] = r * Math.cos(phi);
    
    // Gradient warna multi-layer
    const t = Math.random();
    let mixColor: number[];
    if (t < 0.33) {
      mixColor = [
        base[0] * 0.8 + deep[0] * 0.2,
        base[1] * 0.8 + deep[1] * 0.2,
        base[2] * 0.8 + deep[2] * 0.2,
      ];
    } else if (t < 0.66) {
      mixColor = [
        base[0] * 0.5 + accent[0] * 0.5,
        base[1] * 0.5 + accent[1] * 0.5,
        base[2] * 0.5 + accent[2] * 0.5,
      ];
    } else {
      mixColor = [
        accent[0] * 0.7 + base[0] * 0.3,
        accent[1] * 0.7 + base[1] * 0.3,
        accent[2] * 0.7 + base[2] * 0.3,
      ];
    }
    
    const brightness = 0.5 + Math.random() * 0.5;
    colors[i * 3] = mixColor[0] * brightness;
    colors[i * 3 + 1] = mixColor[1] * brightness;
    colors[i * 3 + 2] = mixColor[2] * brightness;
    
    // Ukuran bervariasi untuk depth
    const sizeRand = Math.random();
    if (sizeRand > 0.9) {
      sizes[i] = 6 + Math.random() * 4; // partikel besar
    } else if (sizeRand > 0.6) {
      sizes[i] = 4 + Math.random() * 2; // partikel sedang
    } else {
      sizes[i] = 2 + Math.random() * 2; // partikel kecil
    }
  }
  
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  const mat = new THREE.PointsMaterial({
    size: 5,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  
  return new THREE.Points(geo, mat);
}

// ====== DEBRIS - puing ultra realistis ======
function createDebris(): THREE.Group {
  const group = new THREE.Group();
  const count = 1 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < count; i++) {
    const size = 0.3 + Math.random() * 0.7;
    const type = Math.floor(Math.random() * 6);
    let geo: THREE.BufferGeometry;
    
    if (type === 0) {
      // Panel logam rusak
      geo = new THREE.BoxGeometry(size, size * 0.3, size * 0.25);
    } else if (type === 1) {
      // Pecahan segitiga
      geo = new THREE.TetrahedronGeometry(size);
    } else if (type === 2) {
      // Kristal pecah
      geo = new THREE.OctahedronGeometry(size * 0.5);
    } else if (type === 3) {
      // Tabung/pipa
      geo = new THREE.CylinderGeometry(size * 0.15, size * 0.15, size * 0.8, 8);
    } else if (type === 4) {
      // Plat melengkung
      geo = new THREE.TorusGeometry(size * 0.4, size * 0.1, 8, 12, Math.PI * 0.7);
    } else {
      // Balok struktural
      geo = new THREE.BoxGeometry(size * 0.8, size * 0.15, size * 0.15);
    }
    
    // Variasi material: logam, karbon, keramik
    const materialType = Math.random();
    let mat: THREE.MeshStandardMaterial;
    
    if (materialType < 0.4) {
      // Logam titanium/aluminium
      const gray = 0.15 + Math.random() * 0.2;
      mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(gray, gray, gray * 1.05),
        roughness: 0.3 + Math.random() * 0.2,
        metalness: 0.85 + Math.random() * 0.15,
        flatShading: true,
        transparent: true,
        opacity: 0,
        envMapIntensity: 1.0,
      });
    } else if (materialType < 0.7) {
      // Karbon fiber gelap
      mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.05, 0.05, 0.06),
        roughness: 0.6 + Math.random() * 0.2,
        metalness: 0.3 + Math.random() * 0.2,
        flatShading: true,
        transparent: true,
        opacity: 0,
      });
    } else {
      // Keramik/heat shield
      const heatTint = Math.random();
      mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(
          0.15 + heatTint * 0.1,
          0.1 + heatTint * 0.05,
          0.08
        ),
        roughness: 0.7 + Math.random() * 0.2,
        metalness: 0.1 + Math.random() * 0.2,
        flatShading: true,
        transparent: true,
        opacity: 0,
      });
    }
    
    const piece = new THREE.Mesh(geo, mat);
    piece.position.set(
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3
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

// ====== SATELIT - ultra realistis ======
function createSatellite(): THREE.Group {
  const group = new THREE.Group();
  
  // Badan utama - bus satelit
  const bodyGeo = new THREE.BoxGeometry(0.9, 0.9, 1.4);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x999aaa,
    roughness: 0.25,
    metalness: 0.92,
    transparent: true,
    opacity: 0,
    envMapIntensity: 1.2,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);
  
  // Thermal blanket (gold foil)
  const foilGeo = new THREE.BoxGeometry(0.92, 0.92, 0.3);
  const foilMat = new THREE.MeshStandardMaterial({
    color: 0xccaa44,
    roughness: 0.4,
    metalness: 0.8,
    emissive: 0x332200,
    emissiveIntensity: 0.1,
    transparent: true,
    opacity: 0,
  });
  const foil = new THREE.Mesh(foilGeo, foilMat);
  foil.position.z = 0.55;
  group.add(foil);
  
  // Panel surya (2 sisi) - lebih detail
  for (let side = -1; side <= 1; side += 2) {
    // Arm connector
    const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
    const armMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.4,
      metalness: 0.9,
      transparent: true,
      opacity: 0,
    });
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.rotation.z = Math.PI / 2;
    arm.position.x = side * 0.7;
    group.add(arm);
    
    // Panel utama
    const panelGeo = new THREE.BoxGeometry(2.8, 0.04, 1.2);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x1a2a55,
      roughness: 0.35,
      metalness: 0.75,
      emissive: 0x0a1533,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0,
      envMapIntensity: 0.8,
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.x = side * 2.1;
    group.add(panel);
    
    // Panel grid lines
    for (let g = 0; g < 4; g++) {
      const gridGeo = new THREE.BoxGeometry(2.8, 0.05, 0.01);
      const gridMat = new THREE.MeshStandardMaterial({
        color: 0x333355,
        roughness: 0.5,
        metalness: 0.8,
        transparent: true,
        opacity: 0,
      });
      const grid = new THREE.Mesh(gridGeo, gridMat);
      grid.position.set(side * 2.1, 0.025, -0.45 + g * 0.3);
      group.add(grid);
    }
  }
  
  // Antena utama
  const antennaGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.2, 8);
  const antennaMat = new THREE.MeshStandardMaterial({
    color: 0xbbbbbb,
    roughness: 0.4,
    metalness: 0.85,
    transparent: true,
    opacity: 0,
  });
  const antenna = new THREE.Mesh(antennaGeo, antennaMat);
  antenna.position.y = 1.05;
  group.add(antenna);
  
  // Dish antena - lebih detail
  const dishGeo = new THREE.SphereGeometry(0.35, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  const dishMat = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.2,
    metalness: 0.95,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    envMapIntensity: 1.5,
  });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.position.y = 1.65;
  dish.rotation.x = Math.PI;
  group.add(dish);
  
  // Feed horn
  const feedGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.2, 8);
  const feedMat = new THREE.MeshStandardMaterial({
    color: 0x999999,
    roughness: 0.3,
    metalness: 0.9,
    transparent: true,
    opacity: 0,
  });
  const feed = new THREE.Mesh(feedGeo, feedMat);
  feed.position.y = 1.5;
  group.add(feed);
  
  // Status lights
  if (Math.random() > 0.4) {
    const lightGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const lightMat = new THREE.MeshBasicMaterial({
      color: Math.random() > 0.5 ? 0x00ff00 : 0xff0000,
      transparent: true,
      opacity: 0,
    });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(0.45, 0, 0.7);
    group.add(light);
  }
  
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

// ====== LUBANG HITAM - ultra realistis ======
function createBlackHole(): THREE.Group {
  const group = new THREE.Group();
  
  // Event horizon (bola hitam pekat)
  const holeGeo = new THREE.SphereGeometry(2.5, 48, 48);
  const holeMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0,
  });
  const hole = new THREE.Mesh(holeGeo, holeMat);
  group.add(hole);
  
  // Photon sphere (cincin cahaya di sekitar event horizon)
  const photonGeo = new THREE.TorusGeometry(2.8, 0.15, 16, 64);
  const photonMat = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const photon = new THREE.Mesh(photonGeo, photonMat);
  photon.rotation.x = Math.PI / 2;
  group.add(photon);
  
  // Accretion disk inner - panas intens
  const disk1Geo = new THREE.RingGeometry(3, 4.5, 96);
  const disk1Mat = new THREE.MeshBasicMaterial({
    color: 0xff8800,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const disk1 = new THREE.Mesh(disk1Geo, disk1Mat);
  disk1.rotation.x = Math.PI / 2;
  group.add(disk1);
  
  // Accretion disk outer - lebih dingin
  const disk2Geo = new THREE.RingGeometry(4.5, 7, 96);
  const disk2Mat = new THREE.MeshBasicMaterial({
    color: 0xff4400,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const disk2 = new THREE.Mesh(disk2Geo, disk2Mat);
  disk2.rotation.x = Math.PI / 2;
  group.add(disk2);
  
  // Accretion disk extreme outer - sangat samar
  const disk3Geo = new THREE.RingGeometry(7, 10, 96);
  const disk3Mat = new THREE.MeshBasicMaterial({
    color: 0xaa2200,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const disk3 = new THREE.Mesh(disk3Geo, disk3Mat);
  disk3.rotation.x = Math.PI / 2;
  group.add(disk3);
  
  // Relativistic jets (opsional - semburan partikel)
  if (Math.random() > 0.5) {
    for (let dir = -1; dir <= 1; dir += 2) {
      const jetGeo = new THREE.ConeGeometry(0.8, 8, 16);
      const jetMat = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const jet = new THREE.Mesh(jetGeo, jetMat);
      jet.position.y = dir * 5;
      jet.rotation.x = dir > 0 ? 0 : Math.PI;
      group.add(jet);
    }
  }
  
  // Point light untuk efek glow
  const bhLight = new THREE.PointLight(0xff6600, 3, 20);
  group.add(bhLight);
  
  return group;
}

// ====== WORMHOLE / PORTAL - ultra realistis ======
function createWormhole(): THREE.Group {
  const group = new THREE.Group();
  
  // Portal ring utama - struktur stabil
  const ringGeo = new THREE.TorusGeometry(3.5, 0.4, 24, 64);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x7744ff,
    emissive: 0x5533cc,
    emissiveIntensity: 1.0,
    roughness: 0.2,
    metalness: 0.8,
    transparent: true,
    opacity: 0,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  group.add(ring);
  
  // Secondary ring - stabilitas
  const ring2Geo = new THREE.TorusGeometry(3.8, 0.2, 16, 64);
  const ring2Mat = new THREE.MeshStandardMaterial({
    color: 0x9966ff,
    emissive: 0x7744dd,
    emissiveIntensity: 0.8,
    roughness: 0.3,
    metalness: 0.7,
    transparent: true,
    opacity: 0,
  });
  const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
  group.add(ring2);
  
  // Inner portal - singularitas
  const portalGeo = new THREE.CircleGeometry(3.2, 64);
  const portalMat = new THREE.MeshBasicMaterial({
    color: 0xaa66ff,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const portal = new THREE.Mesh(portalGeo, portalMat);
  group.add(portal);
  
  // Event horizon glow
  const glow1Geo = new THREE.TorusGeometry(3.2, 0.6, 24, 64);
  const glow1Mat = new THREE.MeshBasicMaterial({
    color: 0xbb88ff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow1 = new THREE.Mesh(glow1Geo, glow1Mat);
  group.add(glow1);
  
  // Outer energy field
  const glow2Geo = new THREE.TorusGeometry(4.2, 0.8, 24, 64);
  const glow2Mat = new THREE.MeshBasicMaterial({
    color: 0x9955ff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow2 = new THREE.Mesh(glow2Geo, glow2Mat);
  group.add(glow2);
  
  // Point light untuk efek cahaya
  const portalLight = new THREE.PointLight(0x8844ff, 4, 25);
  group.add(portalLight);
  
  return group;
}

// ====== KRISTAL ENERGI - ultra realistis ======
function createEnergyCrystal(): THREE.Group {
  const group = new THREE.Group();
  
  // Warna kristal bervariasi
  const crystalColors = [
    { color: 0x00ffcc, emissive: 0x00aa88, light: 0x00ffcc }, // Cyan
    { color: 0xff00aa, emissive: 0xaa0077, light: 0xff00aa }, // Magenta
    { color: 0xffaa00, emissive: 0xaa7700, light: 0xffaa00 }, // Gold
    { color: 0x00aaff, emissive: 0x0077aa, light: 0x00aaff }, // Blue
    { color: 0xaa00ff, emissive: 0x7700aa, light: 0xaa00ff }, // Purple
  ];
  
  const colorSet = crystalColors[Math.floor(Math.random() * crystalColors.length)];
  
  // Kristal utama - bentuk hexagonal
  const crystalGeo = new THREE.OctahedronGeometry(1.8, 0);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: colorSet.color,
    emissive: colorSet.emissive,
    emissiveIntensity: 0.8,
    roughness: 0.1,
    metalness: 0.6,
    transparent: true,
    opacity: 0,
    envMapIntensity: 1.5,
  });
  const crystal = new THREE.Mesh(crystalGeo, crystalMat);
  crystal.scale.y = 1.5; // lebih tinggi
  group.add(crystal);
  
  // Inner glow core
  const coreGeo = new THREE.OctahedronGeometry(1.2, 0);
  const coreMat = new THREE.MeshBasicMaterial({
    color: colorSet.color,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.scale.y = 1.5;
  group.add(core);
  
  // Kristal kecil di sekitar - orbit
  const smallCount = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < smallCount; i++) {
    const smallSize = 0.4 + Math.random() * 0.4;
    const smallGeo = new THREE.OctahedronGeometry(smallSize, 0);
    const smallMat = new THREE.MeshStandardMaterial({
      color: colorSet.color,
      emissive: colorSet.emissive,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.7,
      transparent: true,
      opacity: 0,
    });
    const small = new THREE.Mesh(smallGeo, smallMat);
    small.scale.y = 1.3 + Math.random() * 0.4;
    
    const angle = (i / smallCount) * Math.PI * 2;
    const radius = 2.5 + Math.random() * 1;
    small.position.set(
      Math.cos(angle) * radius,
      (Math.random() - 0.5) * 2,
      Math.sin(angle) * radius
    );
    small.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    group.add(small);
  }
  
  // Energy field glow
  const fieldGeo = new THREE.SphereGeometry(3, 32, 32);
  const fieldMat = new THREE.MeshBasicMaterial({
    color: colorSet.color,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
  });
  const field = new THREE.Mesh(fieldGeo, fieldMat);
  group.add(field);
  
  // Point light - lebih terang
  const light = new THREE.PointLight(colorSet.light, 5, 20);
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

// ====== MATAHARI - bulat sempurna 2x lebih besar dengan glow SUPER TERANG ======
function createSun(): THREE.Group {
  const group = new THREE.Group();
  
  // ====== INTI MATAHARI - bulat sempurna 2x ======
  const sunGeo = new THREE.SphereGeometry(6, 64, 64);
  const sunMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  group.add(sun);
  
  // ====== GLOW LAYERS - SUPER TERANG ======
  // Inner glow - putih kekuningan
  const glow1Geo = new THREE.SphereGeometry(8, 48, 48);
  const glow1Mat = new THREE.MeshBasicMaterial({
    color: 0xffffcc,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow1 = new THREE.Mesh(glow1Geo, glow1Mat);
  group.add(glow1);
  
  // Middle glow - kuning terang
  const glow2Geo = new THREE.SphereGeometry(11, 48, 48);
  const glow2Mat = new THREE.MeshBasicMaterial({
    color: 0xffee88,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow2 = new THREE.Mesh(glow2Geo, glow2Mat);
  group.add(glow2);
  
  // Outer glow - oranye terang
  const glow3Geo = new THREE.SphereGeometry(15, 48, 48);
  const glow3Mat = new THREE.MeshBasicMaterial({
    color: 0xffdd44,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow3 = new THREE.Mesh(glow3Geo, glow3Mat);
  group.add(glow3);
  
  // Corona - sangat besar dan terang
  const coronaGeo = new THREE.SphereGeometry(20, 48, 48);
  const coronaMat = new THREE.MeshBasicMaterial({
    color: 0xffcc00,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const corona = new THREE.Mesh(coronaGeo, coronaMat);
  group.add(corona);
  
  // ====== SOLAR FLARE PARTICLES - 2x lebih banyak ======
  const flareCount = 600;
  const flarePositions = new Float32Array(flareCount * 3);
  const flareColors = new Float32Array(flareCount * 3);
  
  for (let i = 0; i < flareCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 6.2 + Math.random() * 12;
    
    flarePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    flarePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    flarePositions[i * 3 + 2] = r * Math.cos(phi);
    
    // Warna gradient: putih (dekat) → kuning → oranye (jauh)
    const t = (r - 6.2) / 12;
    flareColors[i * 3] = 1.0;
    flareColors[i * 3 + 1] = 0.95 - t * 0.45;
    flareColors[i * 3 + 2] = 0.8 - t * 0.7;
  }
  
  const flareGeo = new THREE.BufferGeometry();
  flareGeo.setAttribute('position', new THREE.BufferAttribute(flarePositions, 3));
  flareGeo.setAttribute('color', new THREE.BufferAttribute(flareColors, 3));
  
  const flareMat = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const flareParticles = new THREE.Points(flareGeo, flareMat);
  group.add(flareParticles);
  
  // ====== LIGHTS - SUPER TERANG 2x LIPAT ======
  const sunLight = new THREE.PointLight(0xffffff, 400, 800, 1.2);
  group.add(sunLight);
  
  const fillLight = new THREE.PointLight(0xffee88, 200, 600, 1.5);
  group.add(fillLight);
  
  // Tambahan light untuk efek glow yang lebih kuat
  const glowLight = new THREE.PointLight(0xffdd44, 160, 500, 1.8);
  group.add(glowLight);
  
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
  const [sunIntensity, setSunIntensity] = useState(2.5);
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
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // ====== SCENE ======
    const scene = new THREE.Scene();
    // Background GELAP - gray murni
    scene.background = new THREE.Color(0x080808);
    // Fog GELAP gray
    scene.fog = new THREE.FogExp2(0x1a1a1a, 0.024);

    // ====== CAMERA ======
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 300);
    camera.position.set(0, 0, 0);

    // ====== POST-PROCESSING - Bloom untuk efek cahaya realistis ======
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // Unreal Bloom - efek glow SUBTLE
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.4,  // strength - intensitas bloom DITURUNKAN
      0.3,  // radius - sebaran bloom DITURUNKAN
      0.9   // threshold - ambang batas brightness DITINGGIKAN
    );
    composer.addPass(bloomPass);

    // ====== LIGHTING - hanya dari matahari (seperti tata surya asli) ======
    // Ambient light SANGAT REDUP - hanya untuk visibility minimal
    const ambientLight = new THREE.AmbientLight(0x111111, 0.15);
    scene.add(ambientLight);
    
    // Cahaya utama dari matahari (akan di-update posisinya) - SUPER TERANG 2x LIPAT
    const mainLight = new THREE.DirectionalLight(0xffeebb, 20.0);
    mainLight.position.set(0, 3, -35);
    mainLight.castShadow = false;
    scene.add(mainLight);

    // ====== MATAHARI - di depan kamera ======
    const sun = createSun();
    scene.add(sun);
    
    // Simpan referensi sunLight untuk update intensity
    const sunLight = sun.children.find(child => child instanceof THREE.PointLight) as THREE.PointLight;
    
    const SUN_OFFSET = new THREE.Vector3(0, 8, -80); // matahari jauh di depan
    const SUN_SAFE_RADIUS = 18; // radius aman dari matahari

    // ====== VOLUMETRIC FOG PARTICLES - kabut gray SELALU di belakang matahari ======
    // Kabut RELATIF terhadap kamera, tapi selalu di belakang matahari
    // Matahari: offset (0, 8, -80) dari kamera
    // Kabut: offset (0, 8, -130) dari kamera (50 unit DI BELAKANG matahari)
    
    const FOG_OFFSET = new THREE.Vector3(0, 8, -130); // 50 unit di belakang matahari
    const FOG_SPREAD_X = 374;  // penyebaran horizontal
    const FOG_SPREAD_Y = 250;  // penyebaran vertikal
    const FOG_SPREAD_Z = 120;  // penyebaran depth
    
    // Simpan original positions untuk animasi (relatif terhadap center kabut)
    const fogOriginalPositions = {
      near: new Float32Array(1200 * 3),
      mid: new Float32Array(1500 * 3),
      far: new Float32Array(2000 * 3)
    };
    
    // Layer 1: Kabut dekat matahari - partikel besar
    const fogNearCount = 1200;
    const fogNearPositions = new Float32Array(fogNearCount * 3);
    const fogNearColors = new Float32Array(fogNearCount * 3);
    
    for (let i = 0; i < fogNearCount; i++) {
      // Posisi RELATIF terhadap center kabut
      const x = (Math.random() - 0.5) * FOG_SPREAD_X;
      const y = (Math.random() - 0.5) * FOG_SPREAD_Y;
      const z = (Math.random() - 0.5) * FOG_SPREAD_Z * 0.6;
      
      fogNearPositions[i * 3] = x;
      fogNearPositions[i * 3 + 1] = y;
      fogNearPositions[i * 3 + 2] = z;
      
      // Warna GRAY GELAP
      const brightness = 0.15 + Math.random() * 0.08;
      fogNearColors[i * 3] = brightness;
      fogNearColors[i * 3 + 1] = brightness;
      fogNearColors[i * 3 + 2] = brightness;
    }
    
    const fogNearGeo = new THREE.BufferGeometry();
    fogNearGeo.setAttribute('position', new THREE.BufferAttribute(fogNearPositions, 3));
    fogNearGeo.setAttribute('color', new THREE.BufferAttribute(fogNearColors, 3));
    
    // Custom shader material untuk kabut yang TIDAK BISA DIUBAH oleh three.js
    const fogNearMat = new THREE.ShaderMaterial({
      uniforms: {
        opacity: { value: 0.35 },
        size: { value: 60.0 }
      },
      vertexShader: `
        uniform float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float opacity;
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = opacity * (1.0 - dist * 2.0);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    const fogNearParticles = new THREE.Points(fogNearGeo, fogNearMat);
    scene.add(fogNearParticles);
    
    // Simpan original positions
    fogOriginalPositions.near.set(fogNearPositions);
    
    // Layer 2: Kabut menengah - partikel sedang
    const fogMidCount = 1500;
    const fogMidPositions = new Float32Array(fogMidCount * 3);
    const fogMidColors = new Float32Array(fogMidCount * 3);
    
    for (let i = 0; i < fogMidCount; i++) {
      // Posisi RELATIF terhadap center kabut, lebih jauh
      const x = (Math.random() - 0.5) * FOG_SPREAD_X * 1.3;
      const y = (Math.random() - 0.5) * FOG_SPREAD_Y * 1.2;
      const z = -20 + (Math.random() - 0.5) * FOG_SPREAD_Z * 0.8;
      
      fogMidPositions[i * 3] = x;
      fogMidPositions[i * 3 + 1] = y;
      fogMidPositions[i * 3 + 2] = z;
      
      // Warna GRAY GELAP
      const brightness = 0.12 + Math.random() * 0.06;
      fogMidColors[i * 3] = brightness;
      fogMidColors[i * 3 + 1] = brightness;
      fogMidColors[i * 3 + 2] = brightness;
    }
    
    const fogMidGeo = new THREE.BufferGeometry();
    fogMidGeo.setAttribute('position', new THREE.BufferAttribute(fogMidPositions, 3));
    fogMidGeo.setAttribute('color', new THREE.BufferAttribute(fogMidColors, 3));
    
    // Custom shader material untuk kabut yang TIDAK BISA DIUBAH oleh three.js
    const fogMidMat = new THREE.ShaderMaterial({
      uniforms: {
        opacity: { value: 0.25 },
        size: { value: 45.0 }
      },
      vertexShader: `
        uniform float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float opacity;
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = opacity * (1.0 - dist * 2.0);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    const fogMidParticles = new THREE.Points(fogMidGeo, fogMidMat);
    scene.add(fogMidParticles);
    
    // Simpan original positions
    fogOriginalPositions.mid.set(fogMidPositions);
    
    // Layer 3: Kabut jauh - partikel kecil
    const fogFarCount = 2000;
    const fogFarPositions = new Float32Array(fogFarCount * 3);
    const fogFarColors = new Float32Array(fogFarCount * 3);
    
    for (let i = 0; i < fogFarCount; i++) {
      // Posisi RELATIF terhadap center kabut, paling jauh
      const x = (Math.random() - 0.5) * FOG_SPREAD_X * 1.6;
      const y = (Math.random() - 0.5) * FOG_SPREAD_Y * 1.4;
      const z = -40 + (Math.random() - 0.5) * FOG_SPREAD_Z;
      
      fogFarPositions[i * 3] = x;
      fogFarPositions[i * 3 + 1] = y;
      fogFarPositions[i * 3 + 2] = z;
      
      // Warna GRAY GELAP
      const brightness = 0.1 + Math.random() * 0.05;
      fogFarColors[i * 3] = brightness;
      fogFarColors[i * 3 + 1] = brightness;
      fogFarColors[i * 3 + 2] = brightness;
    }
    
    const fogFarGeo = new THREE.BufferGeometry();
    fogFarGeo.setAttribute('position', new THREE.BufferAttribute(fogFarPositions, 3));
    fogFarGeo.setAttribute('color', new THREE.BufferAttribute(fogFarColors, 3));
    
    // Custom shader material untuk kabut yang TIDAK BISA DIUBAH oleh three.js
    const fogFarMat = new THREE.ShaderMaterial({
      uniforms: {
        opacity: { value: 0.18 },
        size: { value: 30.0 }
      },
      vertexShader: `
        uniform float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float opacity;
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = opacity * (1.0 - dist * 2.0);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    const fogFarParticles = new THREE.Points(fogFarGeo, fogFarMat);
    scene.add(fogFarParticles);
    
    // Simpan original positions
    fogOriginalPositions.far.set(fogFarPositions);

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
    const FADE_IN_FAR = 100;   // objek mulai terlihat dari jauh
    const FADE_IN_NEAR = 50;   // objek terlihat jelas
    const FADE_OUT_NEAR = 15;  // mulai pudar saat dekat kamera
    const FADE_OUT_GONE = 5;   // hilang total
    const REMOVE_DIST = 2;     // hapus dari scene
    const SAFE_ZONE = 15;      // jarak aman dari kamera
    const SUN_SAFE_DISTANCE = 25; // jarak aman dari matahari
    const MAX_OBJECTS = 50;    // lebih banyak objek
    const FADE_IN_DURATION = 4; // fade-in duration
    let nextSpawnDelay = 1.0 + Math.random() * 2.0; // delay random 1-3 detik untuk spawn pertama

    function isPositionSafe(pos: THREE.Vector3, radius: number): boolean {
      const camDist = camera.position.distanceTo(pos);
      if (camDist < SAFE_ZONE + radius) return false;
      
      // Jangan spawn terlalu dekat matahari
      const sunDist = pos.distanceTo(sun.position);
      if (sunDist < SUN_SAFE_DISTANCE + radius) return false;
      
      // Cek tabrakan dengan objek lain
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
        // SPAWN DARI KABUT DI BELAKANG MATAHARI
        // Posisi RELATIF terhadap kamera (sama seperti kabut)
        const spawnOffsetX = (Math.random() - 0.5) * 120; // -60 sampai 60
        const spawnOffsetY = (Math.random() - 0.5) * 80 + 8; // -32 sampai 48
        const spawnOffsetZ = -95 - Math.random() * 50; // -95 sampai -145 (di belakang matahari)

        // Konversi ke world space menggunakan orientasi kamera
        const spawnOffset = new THREE.Vector3(spawnOffsetX, spawnOffsetY, spawnOffsetZ);
        const spawnWorldOffset = spawnOffset.clone().applyQuaternion(camera.quaternion);
        spawnPos = camera.position.clone().add(spawnWorldOffset);

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
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01
      );
      
      // Drift velocity - bergerak dari kabut menuju kamera
      // Arah dari spawn position ke kamera
      const toCamera = camera.position.clone().sub(spawnPos).normalize();
      const driftSpeed = 1.5 + Math.random() * 1.0;
      
      // Tambahkan sedikit variasi ke samping dan atas/bawah
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0);
      
      const driftVel = toCamera.multiplyScalar(driftSpeed)
        .add(right.multiplyScalar((Math.random() - 0.5) * 0.5))
        .add(up.multiplyScalar((Math.random() - 0.5) * 0.3));

      objects.push({ mesh, type, radius, rotSpeed, driftVel, age: 0, baseOpacity });
      return true;
    }

    // Spawn awal - langsung penuh
    for (let i = 0; i < 35; i++) {
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
      composer.setSize(window.innerWidth, window.innerHeight);
      bloomPass.resolution.set(window.innerWidth, window.innerHeight);
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

      // ====== UPDATE KABUT - selalu di belakang matahari ======
      // Kabut mengikuti kamera dengan offset tetap (selalu di belakang matahari)
      const fogWorldOffset = FOG_OFFSET.clone().applyQuaternion(camera.quaternion);
      const fogCenterPos = camera.position.clone().add(fogWorldOffset);
      
      // PENTING: Pastikan kabut SELALU ADA dan TIDAK PERNAH MENGHILANG
      // Reset material properties SETELAH update posisi partikel
      const fogTime = elapsed * 0.3; // kecepatan pergerakan kabut
      
      // Update fog near layer - posisi absolut + animasi lokal
      const fogNearPos = fogNearParticles.geometry.attributes.position;
      for (let i = 0; i < fogNearPos.count; i++) {
        const origX = fogOriginalPositions.near[i * 3];
        const origY = fogOriginalPositions.near[i * 3 + 1];
        const origZ = fogOriginalPositions.near[i * 3 + 2];
        
        // Pergerakan noise di tempat (relatif terhadap center)
        const offsetX = Math.sin(fogTime + i * 0.1) * 2;
        const offsetY = Math.cos(fogTime * 0.7 + i * 0.15) * 1.5;
        const offsetZ = Math.sin(fogTime * 0.5 + i * 0.2) * 1;
        
        // Posisi absolut = center + offset relatif + animasi lokal
        fogNearPos.setXYZ(
          i,
          fogCenterPos.x + origX + offsetX,
          fogCenterPos.y + origY + offsetY,
          fogCenterPos.z + origZ + offsetZ
        );
      }
      fogNearPos.needsUpdate = true;
      fogNearParticles.geometry.attributes.position.needsUpdate = true;
      
      // Update fog mid layer
      const fogMidPos = fogMidParticles.geometry.attributes.position;
      for (let i = 0; i < fogMidPos.count; i++) {
        const origX = fogOriginalPositions.mid[i * 3];
        const origY = fogOriginalPositions.mid[i * 3 + 1];
        const origZ = fogOriginalPositions.mid[i * 3 + 2];
        
        const offsetX = Math.sin(fogTime * 0.8 + i * 0.12) * 2.5;
        const offsetY = Math.cos(fogTime * 0.6 + i * 0.18) * 2;
        const offsetZ = Math.sin(fogTime * 0.4 + i * 0.25) * 1.5;
        
        fogMidPos.setXYZ(
          i,
          fogCenterPos.x + origX + offsetX,
          fogCenterPos.y + origY + offsetY,
          fogCenterPos.z + origZ + offsetZ
        );
      }
      fogMidPos.needsUpdate = true;
      fogMidParticles.geometry.attributes.position.needsUpdate = true;
      
      // Update fog far layer
      const fogFarPos = fogFarParticles.geometry.attributes.position;
      for (let i = 0; i < fogFarPos.count; i++) {
        const origX = fogOriginalPositions.far[i * 3];
        const origY = fogOriginalPositions.far[i * 3 + 1];
        const origZ = fogOriginalPositions.far[i * 3 + 2];
        
        const offsetX = Math.sin(fogTime * 0.6 + i * 0.15) * 3;
        const offsetY = Math.cos(fogTime * 0.5 + i * 0.2) * 2.5;
        const offsetZ = Math.sin(fogTime * 0.3 + i * 0.3) * 2;
        
        fogFarPos.setXYZ(
          i,
          fogCenterPos.x + origX + offsetX,
          fogCenterPos.y + origY + offsetY,
          fogCenterPos.z + origZ + offsetZ
        );
      }
      fogFarPos.needsUpdate = true;
      fogFarParticles.geometry.attributes.position.needsUpdate = true;
      
      // PENTING: Reset material properties SETELAH update posisi partikel
      // Menggunakan ShaderMaterial yang TIDAK BISA DIUBAH oleh three.js
      fogNearMat.uniforms.opacity.value = 0.35;
      fogNearMat.uniforms.size.value = 60.0;
      fogNearMat.uniformsNeedUpdate = true;
      fogNearMat.needsUpdate = true;
      fogNearParticles.visible = true;
      
      fogMidMat.uniforms.opacity.value = 0.25;
      fogMidMat.uniforms.size.value = 45.0;
      fogMidMat.uniformsNeedUpdate = true;
      fogMidMat.needsUpdate = true;
      fogMidParticles.visible = true;
      
      fogFarMat.uniforms.opacity.value = 0.18;
      fogFarMat.uniforms.size.value = 30.0;
      fogFarMat.uniformsNeedUpdate = true;
      fogFarMat.needsUpdate = true;
      fogFarParticles.visible = true;

      // ====== UPDATE MATAHARI - tetap di depan kamera ======
      const sunWorldOffset = SUN_OFFSET.clone().applyQuaternion(camera.quaternion);
      sun.position.copy(camera.position).add(sunWorldOffset);
      
      // Update directional light mengikuti matahari
      mainLight.position.copy(sun.position);
      
      // Update intensity matahari dari slider - SUPER TERANG 2x LIPAT
      if (sunLight) {
        sunLight.intensity = sunIntensityRef.current * 40;
      }
      mainLight.intensity = sunIntensityRef.current * 8.0;
      
      // ====== ANIMASI PARTIKEL MATAHARI ======
      // Animasi solar flare particles - bergerak keluar dari inti
      sun.children.forEach((child) => {
        if (child instanceof THREE.Points) {
          const positions = child.geometry.attributes.position;
          for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            const dist = Math.sqrt(x * x + y * y + z * z);
            
            // Gerak keluar perlahan
            if (dist > 6 && dist < 18) {
              const speed = 0.04;
              const nx = x / dist;
              const ny = y / dist;
              const nz = z / dist;
              positions.setXYZ(i, x + nx * speed, y + ny * speed, z + nz * speed);
            } else if (dist >= 18) {
              // Reset ke permukaan
              const theta = Math.random() * Math.PI * 2;
              const phi = Math.acos(2 * Math.random() - 1);
              const r = 6.1 + Math.random() * 0.3;
              positions.setXYZ(
                i,
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
              );
            }
          }
          positions.needsUpdate = true;
        }
      });
      
      // ====== COLLISION AVOIDANCE - JANGAN TABRAK MATAHARI ======
      const distToSun = camera.position.distanceTo(sun.position);
      if (distToSun < SUN_SAFE_RADIUS) {
        // Push kamera menjauh dari matahari
        const pushDir = camera.position.clone().sub(sun.position).normalize();
        const pushStrength = (SUN_SAFE_RADIUS - distToSun) * 0.3;
        camera.position.add(pushDir.multiplyScalar(pushStrength));
      }

      // ====== UPDATE OBJEK ======
      for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        const dist = camera.position.distanceTo(obj.mesh.position);
        const distToSun = sun.position.distanceTo(obj.mesh.position);

        obj.age += delta;

        obj.mesh.rotation.x += obj.rotSpeed.x;
        obj.mesh.rotation.y += obj.rotSpeed.y;
        obj.mesh.rotation.z += obj.rotSpeed.z;

        obj.mesh.position.add(obj.driftVel.clone().multiplyScalar(delta));

        // ====== ANTI-TABRAKAN: Push menjauh dari kamera dan matahari ======
        if (dist < SAFE_ZONE + obj.radius) {
          // Terlalu dekat kamera - push menjauh
          const pushDir = obj.mesh.position.clone().sub(camera.position).normalize();
          const pushStrength = (SAFE_ZONE + obj.radius - dist) * 0.5;
          obj.mesh.position.add(pushDir.multiplyScalar(pushStrength));
        }
        
        if (distToSun < SUN_SAFE_DISTANCE + obj.radius) {
          // Terlalu dekat matahari - push menjauh
          const pushDir = obj.mesh.position.clone().sub(sun.position).normalize();
          const pushStrength = (SUN_SAFE_DISTANCE + obj.radius - distToSun) * 0.5;
          obj.mesh.position.add(pushDir.multiplyScalar(pushStrength));
        }

        // ====== ANTI-TABRAKAN ANTAR OBJEK ======
        for (let j = 0; j < objects.length; j++) {
          if (i === j) continue; // skip diri sendiri
          const other = objects[j];
          const distBetween = obj.mesh.position.distanceTo(other.mesh.position);
          const minDist = obj.radius + other.radius + 2; // 2 unit buffer
          
          if (distBetween < minDist) {
            // Push menjauh dari objek lain
            const pushDir = obj.mesh.position.clone().sub(other.mesh.position).normalize();
            const pushStrength = (minDist - distBetween) * 0.3;
            obj.mesh.position.add(pushDir.multiplyScalar(pushStrength));
          }
        }

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

      // ====== LOOP SPAWN - random 1-3 detik, bergiliran ======
      spawnTimer += delta;
      
      // Spawn dengan delay random 1-3 detik (bergiliran satu per satu)
      if (objects.length < MAX_OBJECTS && spawnTimer > nextSpawnDelay) {
        spawnObject();
        spawnTimer = 0;
        // Generate delay random baru untuk spawn berikutnya (1-3 detik)
        nextSpawnDelay = 1.0 + Math.random() * 2.0;
      }
      
      // PENTING: Pastikan SELALU ada object di depan kamera
      // Jika tidak ada object dalam jarak 10-50 unit, spawn segera (tapi tetap satu per satu)
      const hasObjectNearby = objects.some(obj => {
        const dist = camera.position.distanceTo(obj.mesh.position);
        return dist < 50 && dist > 10; // antara 10-50 unit dari kamera
      });
      
      if (!hasObjectNearby && objects.length < MAX_OBJECTS && spawnTimer > 0.5) {
        spawnObject();
        spawnTimer = 0;
        nextSpawnDelay = 1.0 + Math.random() * 2.0;
      }

      composer.render();
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
