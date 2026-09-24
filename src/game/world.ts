import * as THREE from 'three';
import { PlatformData } from '../types/game';

// Generate 120 rectangular platforms with progressive difficulty
export function generatePlatforms(): PlatformData[] {
  const platforms: PlatformData[] = [];

  // Platform 0: Start area (wide & safe)
  platforms.push({
    id: 0,
    x: 0,
    y: 0,
    z: 0,
    width: 6,
    height: 1,
    depth: 6,
    type: 'normal',
    color: '#3b82f6',
  });

  const blockColors = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#8b5cf6', // purple
    '#f59e0b', // amber
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#6366f1', // indigo
  ];

  let curZ = -7;
  let curY = 0;
  let curX = 0;

  for (let i = 1; i <= 150; i++) {
    // Determine platform characteristics based on block index
    let type: PlatformData['type'] = 'normal';
    let width = 4.2;
    let depth = 4.2;
    let height = 0.8;
    let moveSpeed: number | undefined;
    let moveRange: number | undefined;
    let moveAxis: 'x' | 'y' | undefined;

    // Checkpoint every 10 blocks
    if (i % 10 === 0) {
      type = 'checkpoint';
      width = 5.5;
      depth = 5.5;
    } else if (i > 15 && i % 4 === 0) {
      // Moving platform
      type = 'moving';
      moveSpeed = 1.2 + (i / 150) * 1.5;
      moveRange = 2.5 + Math.min(2.5, i * 0.03);
      moveAxis = 'x';
    } else if (i > 8 && i % 7 === 0) {
      // Bouncy platform
      type = 'bouncy';
    } else if (i > 30 && i % 3 === 0) {
      // Narrower platform for challenge
      width = 3.2;
      depth = 3.2;
      type = 'narrow';
    }

    // Progression: vary X and Y slightly
    if (i % 10 !== 0) {
      const xOffset = (Math.sin(i * 1.3) * 2.2);
      curX = xOffset;
      // Slight elevation changes every few blocks
      if (i % 5 === 0) {
        curY += (Math.random() > 0.4 ? 0.6 : -0.4);
      }
    } else {
      curX = 0; // align checkpoints to center
    }

    const gap = 3.5 + Math.min(2.5, (i / 150) * 2.2); // progressive gap
    curZ -= (gap + depth / 2);

    const color =
      type === 'checkpoint'
        ? '#eab308' // Gold for checkpoint
        : type === 'bouncy'
        ? '#10b981' // Green spring
        : blockColors[i % blockColors.length];

    platforms.push({
      id: i,
      x: curX,
      y: curY,
      z: curZ,
      width,
      height,
      depth,
      type,
      color,
      moveSpeed,
      moveRange,
      moveAxis,
      initialX: curX,
      initialY: curY,
    });

    curZ -= depth / 2;
  }

  return platforms;
}

export interface PlatformMeshGroup {
  group: THREE.Group;
  mesh: THREE.Mesh;
  border: THREE.LineSegments;
  data: PlatformData;
  indicator?: THREE.Mesh;
  gem?: THREE.Mesh;
}

export function buildPlatformMesh(data: PlatformData): PlatformMeshGroup {
  const group = new THREE.Group();
  group.position.set(data.x, data.y, data.z);

  // Main rectangular slab
  const geo = new THREE.BoxGeometry(data.width, data.height, data.depth);
  const color = new THREE.Color(data.color);

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.15,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Glowing wireframe border
  const edges = new THREE.EdgesGeometry(geo);
  const borderMat = new THREE.LineBasicMaterial({
    color: data.type === 'checkpoint' ? 0xffea00 : data.type === 'bouncy' ? 0x00ff88 : 0xffffff,
    linewidth: 2,
  });
  const border = new THREE.LineSegments(edges, borderMat);
  group.add(border);

  // Top surface markings / Number label texture
  const topPadGeo = new THREE.PlaneGeometry(data.width * 0.85, data.depth * 0.85);
  topPadGeo.rotateX(-Math.PI / 2);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = data.type === 'checkpoint' ? '#713f12' : '#0f172a';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = data.color;
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 236, 236);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.id === 0 ? 'START' : `${data.id}`, 128, 110);

    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = data.type === 'checkpoint' ? '#fde047' : data.type === 'bouncy' ? '#4ade80' : '#94a3b8';
    const sub = data.id === 0 ? '🏁' : data.type === 'checkpoint' ? '👑 CHECK' : data.type === 'bouncy' ? '⚡ SAKRASH' : 'YERCHA';
    ctx.fillText(sub, 128, 175);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const topMat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
  });

  const topPad = new THREE.Mesh(topPadGeo, topMat);
  topPad.position.y = data.height / 2 + 0.01;
  topPad.receiveShadow = true;
  group.add(topPad);

  // Optional floating gem above normal or checkpoint blocks
  let gem: THREE.Mesh | undefined;
  if (data.id > 0 && data.id % 2 === 0) {
    const gemGeo = new THREE.OctahedronGeometry(0.35, 0);
    const gemMat = new THREE.MeshStandardMaterial({
      color: data.type === 'checkpoint' ? 0xffd700 : 0x38bdf8,
      emissive: data.type === 'checkpoint' ? 0x996515 : 0x0284c7,
      roughness: 0.1,
      metalness: 0.8,
    });
    gem = new THREE.Mesh(gemGeo, gemMat);
    gem.position.set(0, data.height / 2 + 1.2, 0);
    group.add(gem);
  }

  return {
    group,
    mesh,
    border,
    data,
    gem,
  };
}
