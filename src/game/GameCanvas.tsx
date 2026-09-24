import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { PlayerNetState, UserProfile } from '../types/game';
import { createCharacter, CharacterRig, animateCharacterRig, updateNameTagCanvas } from './character';
import { generatePlatforms, buildPlatformMesh, PlatformMeshGroup } from './world';
import { sound } from '../utils/audio';

interface GameCanvasProps {
  user: UserProfile;
  remotePlayers: Record<string, PlayerNetState>;
  isLocalSpeaking?: boolean;
  onSendMove: (data: {
    x: number;
    y: number;
    z: number;
    rotY: number;
    isJumping: boolean;
    animState: string;
    currentBlock: number;
    score: number;
  }) => void;
  onSendRecord: (score: number, distance: number) => void;
  onSendFell: (currentBlock: number) => void;
  onSendEmoji?: (emoji: string) => void;
  onSelectPlayer?: (player: PlayerNetState, screenPos?: { x: number; y: number }) => void;
  joystickInput: { x: number; y: number };
  mobileJumpTrigger: number;
  onBlockChange: (currentBlock: number, maxBlock: number, distance: number) => void;
  respawnTrigger: number;
  checkpointRespawnTrigger: number;
}

interface RemotePlayerEntry {
  rig: CharacterRig;
  target: {
    x: number;
    y: number;
    z: number;
    rotY: number;
    isJumping: boolean;
    animState: string;
    currentBlock: number;
  };
  current: {
    x: number;
    y: number;
    z: number;
    rotY: number;
  };
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  user,
  remotePlayers,
  isLocalSpeaking = false,
  onSendMove,
  onSendRecord,
  onSendFell,
  onSelectPlayer,
  joystickInput,
  mobileJumpTrigger,
  onBlockChange,
  respawnTrigger,
  checkpointRespawnTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // References to keep state across renders
  const stateRef = useRef({
    // Player state
    pos: new THREE.Vector3(0, 1.5, 0),
    vel: new THREE.Vector3(0, 0, 0),
    rotY: 0,
    isGrounded: true,
    isJumping: false,
    currentBlock: 0,
    maxBlock: user.bestScore || 0,
    lastCheckpoint: 0,
    distance: 0,
    lastSentMoveTime: 0,
    keys: {
      KeyW: false,
      KeyA: false,
      KeyS: false,
      KeyD: false,
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
      Space: false,
    },
    cameraAngleH: 0,
    cameraAngleV: 0.35,
    cameraDistance: 7.5,
    isDragging: false,
    prevMouseX: 0,
    prevMouseY: 0,
    pointerDownPos: { x: 0, y: 0 },
  });

  const remotePlayersMap = useRef<Map<string, RemotePlayerEntry>>(new Map());
  const platformsRef = useRef<PlatformMeshGroup[]>([]);
  const localRigRef = useRef<CharacterRig | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  interface LandingParticle {
    mesh: THREE.Mesh;
    vx: number;
    vy: number;
    vz: number;
    rotX: number;
    rotY: number;
    rotZ: number;
    initialScale: number;
  }

  interface LandingEffectInstance {
    ring: THREE.Mesh;
    particles: LandingParticle[];
    platformGroup?: THREE.Group;
    startTime: number;
    duration: number;
  }

  const landingEffectsRef = useRef<LandingEffectInstance[]>([]);

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
        return;
      }
      if (e.code in stateRef.current.keys) {
        stateRef.current.keys[e.code as keyof typeof stateRef.current.keys] = true;
      }
      if (e.code === 'Space') {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code in stateRef.current.keys) {
        stateRef.current.keys[e.code as keyof typeof stateRef.current.keys] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle Respawn triggers
  useEffect(() => {
    if (respawnTrigger > 0) {
      resetPlayer(0);
    }
  }, [respawnTrigger]);

  useEffect(() => {
    if (checkpointRespawnTrigger > 0) {
      resetPlayer(stateRef.current.lastCheckpoint);
    }
  }, [checkpointRespawnTrigger]);

  // Handle Mobile Jump Trigger
  const prevJumpTrigger = useRef(mobileJumpTrigger);
  useEffect(() => {
    if (mobileJumpTrigger > prevJumpTrigger.current) {
      doJump();
    }
    prevJumpTrigger.current = mobileJumpTrigger;
  }, [mobileJumpTrigger]);

  function resetPlayer(targetBlockId: number) {
    const targetPlatform = platformsRef.current.find((p) => p.data.id === targetBlockId) || platformsRef.current[0];
    if (targetPlatform) {
      stateRef.current.pos.set(
        targetPlatform.group.position.x,
        targetPlatform.group.position.y + targetPlatform.data.height / 2 + 1.2,
        targetPlatform.group.position.z
      );
      stateRef.current.vel.set(0, 0, 0);
      stateRef.current.currentBlock = targetBlockId;
      stateRef.current.isGrounded = true;
      stateRef.current.isJumping = false;
    }
  }

  function doJump(multiplier: number = 1) {
    const s = stateRef.current;
    if (s.isGrounded) {
      s.vel.y = 11.8 * multiplier;
      s.isGrounded = false;
      s.isJumping = true;
      if (multiplier > 1.2) {
        sound.playBouncy();
      } else {
        sound.playJump();
      }
    }
  }

  function triggerLandingEffects(
    x: number,
    y: number,
    z: number,
    baseColor: string = '#38bdf8',
    platform?: PlatformMeshGroup
  ) {
    const scene = sceneRef.current;
    if (!scene) return;

    // 1. Expanding neon shockwave ring on platform surface
    const ringGeo = new THREE.RingGeometry(0.12, 0.38, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(baseColor),
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, y + 0.04, z);
    scene.add(ring);

    // 2. Multi-color spark particle burst
    const particleColors = ['#38bdf8', '#fbbf24', '#34d399', '#f43f5e', '#a855f7', '#ffffff', '#ec4899'];
    const particles: LandingParticle[] = [];
    const pCount = 16;
    const boxGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);

    for (let i = 0; i < pCount; i++) {
      const col = particleColors[Math.floor(Math.random() * particleColors.length)];
      const pMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(col),
        transparent: true,
        opacity: 1,
      });
      const pMesh = new THREE.Mesh(boxGeo, pMat);
      pMesh.position.set(
        x + (Math.random() - 0.5) * 0.25,
        y + 0.06,
        z + (Math.random() - 0.5) * 0.25
      );

      const angle = (i / pCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 3.6 + 1.8;

      particles.push({
        mesh: pMesh,
        vx: Math.cos(angle) * speed,
        vy: Math.random() * 4.2 + 2.2,
        vz: Math.sin(angle) * speed,
        rotX: (Math.random() - 0.5) * 12,
        rotY: (Math.random() - 0.5) * 12,
        rotZ: (Math.random() - 0.5) * 12,
        initialScale: Math.random() * 0.4 + 0.8,
      });

      scene.add(pMesh);
    }

    // 3. Platform squash micro-effect
    if (platform) {
      platform.group.scale.y = 0.92;
    }

    landingEffectsRef.current.push({
      ring,
      particles,
      platformGroup: platform?.group,
      startTime: performance.now(),
      duration: 0.45,
    });
  }

  // Mouse camera rotation handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    stateRef.current.isDragging = true;
    stateRef.current.prevMouseX = e.clientX;
    stateRef.current.prevMouseY = e.clientY;
    stateRef.current.pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!stateRef.current.isDragging) return;
    const deltaX = e.clientX - stateRef.current.prevMouseX;
    const deltaY = e.clientY - stateRef.current.prevMouseY;
    stateRef.current.prevMouseX = e.clientX;
    stateRef.current.prevMouseY = e.clientY;

    stateRef.current.cameraAngleH -= deltaX * 0.006;
    stateRef.current.cameraAngleV = Math.max(
      0.05,
      Math.min(1.3, stateRef.current.cameraAngleV + deltaY * 0.006)
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const downPos = stateRef.current.pointerDownPos;
    stateRef.current.isDragging = false;

    // Detect if this was a click/tap (not a camera pan)
    if (downPos && cameraRef.current && onSelectPlayer && containerRef.current) {
      const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      if (dist < 10) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, cameraRef.current);

        const candidateMeshes: THREE.Object3D[] = [];
        remotePlayersMap.current.forEach((entry) => {
          candidateMeshes.push(entry.rig.root);
        });

        const intersects = raycaster.intersectObjects(candidateMeshes, true);
        if (intersects.length > 0) {
          let curr: THREE.Object3D | null = intersects[0].object;
          let foundPlayerId: string | null = null;
          while (curr) {
            if (curr.userData && curr.userData.playerId) {
              foundPlayerId = curr.userData.playerId;
              break;
            }
            curr = curr.parent;
          }
          if (foundPlayerId && remotePlayers[foundPlayerId]) {
            onSelectPlayer(remotePlayers[foundPlayerId], { x: e.clientX, y: e.clientY });
          }
        }
      }
    }
  };

  // Main Three.js setup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#0b0f19');
    scene.fog = new THREE.FogExp2(0x0b0f19, 0.012);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 500);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 120;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 1.5, 50);
    pointLight.position.set(0, 10, -5);
    scene.add(pointLight);

    // Cosmic Backdrop Elements / Stars & Floating Particles
    const starGeo = new THREE.BufferGeometry();
    const starCount = 400;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 200;
      starPos[i + 1] = Math.random() * 80 - 10;
      starPos[i + 2] = -Math.random() * 300 + 20;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.8,
      transparent: true,
      opacity: 0.8,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // Infinite Neon Grid far below
    const gridHelper = new THREE.GridHelper(400, 80, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -18;
    scene.add(gridHelper);

    // Generate and add platforms
    const platformDatas = generatePlatforms();
    const platformMeshes = platformDatas.map((data) => {
      const pm = buildPlatformMesh(data);
      scene.add(pm.group);
      return pm;
    });
    platformsRef.current = platformMeshes;

    // Build Local Player Character Rig
    const localRig = createCharacter(user.color || '#3b82f6', user.name, true);
    scene.add(localRig.root);
    localRigRef.current = localRig;

    // Reset player position on start platform
    resetPlayer(0);

    // Animation Loop Variables
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05); // cap delta time
      lastTime = now;
      const s = stateRef.current;

      // 1. Update moving platforms
      platformMeshes.forEach((pm) => {
        if (pm.data.type === 'moving' && pm.data.moveSpeed && pm.data.moveRange && pm.data.initialX !== undefined) {
          const newX = pm.data.initialX + Math.sin(now * 0.001 * pm.data.moveSpeed) * pm.data.moveRange;
          pm.group.position.x = newX;
        }
        if (pm.gem) {
          pm.gem.rotation.y += dt * 1.5;
          pm.gem.rotation.x = Math.sin(now * 0.002) * 0.2;
        }
      });

      // 2. Process Player Movement & Input
      const moveVec = new THREE.Vector2(0, 0);

      // Keyboard input
      if (s.keys.KeyW || s.keys.ArrowUp) moveVec.y += 1;
      if (s.keys.KeyS || s.keys.ArrowDown) moveVec.y -= 1;
      if (s.keys.KeyA || s.keys.ArrowLeft) moveVec.x -= 1;
      if (s.keys.KeyD || s.keys.ArrowRight) moveVec.x += 1;

      // Joystick input
      if (Math.abs(joystickInput.x) > 0.1 || Math.abs(joystickInput.y) > 0.1) {
        moveVec.x += joystickInput.x;
        moveVec.y += joystickInput.y;
      }

      // Space jump
      if (s.keys.Space && s.isGrounded) {
        doJump();
      }

      const isMoving = moveVec.lengthSq() > 0.01;
      const moveSpeed = 8.5; // units per second

      // Calculate camera forward & right vectors
      const camForward = new THREE.Vector3(-Math.sin(s.cameraAngleH), 0, -Math.cos(s.cameraAngleH)).normalize();
      const camRight = new THREE.Vector3(Math.cos(s.cameraAngleH), 0, -Math.sin(s.cameraAngleH)).normalize();

      const targetVelocity = new THREE.Vector3();
      if (isMoving) {
        moveVec.normalize();
        targetVelocity.addScaledVector(camRight, moveVec.x * moveSpeed);
        targetVelocity.addScaledVector(camForward, moveVec.y * moveSpeed);

        // Smoothly rotate character toward movement direction
        const targetRotY = Math.atan2(targetVelocity.x, targetVelocity.z);
        let diff = targetRotY - s.rotY;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        s.rotY += diff * Math.min(1, dt * 14);
      }

      // Accelerate horizontal velocity
      s.vel.x = THREE.MathUtils.lerp(s.vel.x, targetVelocity.x, dt * 12);
      s.vel.z = THREE.MathUtils.lerp(s.vel.z, targetVelocity.z, dt * 12);

      // Gravity
      const gravity = 27;
      s.vel.y -= gravity * dt;

      // Apply velocity
      s.pos.x += s.vel.x * dt;
      s.pos.z += s.vel.z * dt;
      s.pos.y += s.vel.y * dt;

      // 3. Platform Collision Detection & Grounding
      let standingOnPlatform: PlatformMeshGroup | null = null;
      const playerRadius = 0.45;
      const playerFeetY = s.pos.y;

      for (const pm of platformMeshes) {
        const platPos = pm.group.position;
        const halfW = pm.data.width / 2;
        const halfD = pm.data.depth / 2;
        const topY = platPos.y + pm.data.height / 2;

        // Bounding box check
        const inX = s.pos.x >= platPos.x - halfW - playerRadius && s.pos.x <= platPos.x + halfW + playerRadius;
        const inZ = s.pos.z >= platPos.z - halfD - playerRadius && s.pos.z <= platPos.z + halfD + playerRadius;

        if (inX && inZ) {
          // Check if falling onto top surface
          if (s.vel.y <= 0 && playerFeetY <= topY + 0.35 && playerFeetY >= topY - 0.7) {
            standingOnPlatform = pm;
            s.pos.y = topY;
            s.vel.y = 0;
            if (!s.isGrounded) {
              sound.playLand();
              s.isGrounded = true;
              s.isJumping = false;
              triggerLandingEffects(s.pos.x, topY, s.pos.z, user.color || '#38bdf8', pm);
            }

            // If standing on moving platform, stick with platform
            if (pm.data.type === 'moving' && pm.data.moveSpeed && pm.data.moveRange) {
              const prevPlatX = pm.data.initialX! + Math.sin((now - dt * 1000) * 0.001 * pm.data.moveSpeed) * pm.data.moveRange;
              const platDeltaX = platPos.x - prevPlatX;
              s.pos.x += platDeltaX;
            }

            // Bouncy platform effect
            if (pm.data.type === 'bouncy') {
              doJump(1.6);
            }

            break;
          }
        }
      }

      if (!standingOnPlatform && s.isGrounded && s.vel.y <= 0) {
        // Just walked off an edge
        s.isGrounded = false;
      }

      // Track current block
      if (standingOnPlatform) {
        const blockId = standingOnPlatform.data.id;
        if (blockId !== s.currentBlock) {
          s.currentBlock = blockId;

          // Update checkpoint
          if (standingOnPlatform.data.type === 'checkpoint' && blockId > s.lastCheckpoint) {
            s.lastCheckpoint = blockId;
            sound.playCheckpoint();
          }

          // Check if new record
          if (blockId > s.maxBlock) {
            s.maxBlock = blockId;
            sound.playNewRecord();
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 },
            });
            onSendRecord(s.maxBlock, Math.floor(Math.abs(s.pos.z)));
          }

          // Update 3D name tag
          if (localRig.nameCanvas && localRig.nameContext && localRig.nameTexture) {
            updateNameTagCanvas(
              localRig.nameCanvas,
              localRig.nameContext,
              user.name,
              s.currentBlock,
              true,
              user.color
            );
            localRig.nameTexture.needsUpdate = true;
          }
        }
      }

      // Distance calculation
      s.distance = Math.floor(Math.abs(s.pos.z));
      onBlockChange(s.currentBlock, s.maxBlock, s.distance);

      // 4. Fall Detection (Void)
      if (s.pos.y < -12) {
        sound.playFall();
        onSendFell(s.currentBlock);
        // Reset to last checkpoint or start
        resetPlayer(s.lastCheckpoint);
      }

      // 5. Update Local Character Model
      localRig.root.position.copy(s.pos);
      localRig.root.rotation.y = s.rotY;

      const animState = !s.isGrounded ? 'jumping' : isMoving ? 'running' : 'idle';
      animateCharacterRig(localRig, animState, isMoving, !s.isGrounded, now * 0.001, moveVec.length());

      // 6. Camera Follow
      const targetCamPos = new THREE.Vector3();
      targetCamPos.x = s.pos.x + Math.sin(s.cameraAngleH) * s.cameraDistance * Math.cos(s.cameraAngleV);
      targetCamPos.y = s.pos.y + 1.8 + Math.sin(s.cameraAngleV) * s.cameraDistance;
      targetCamPos.z = s.pos.z + Math.cos(s.cameraAngleH) * s.cameraDistance * Math.cos(s.cameraAngleV);

      camera.position.lerp(targetCamPos, dt * 10);
      camera.lookAt(s.pos.x, s.pos.y + 1.4, s.pos.z);

      // Update light position near player for crisp shadows
      dirLight.position.set(s.pos.x + 15, s.pos.y + 30, s.pos.z + 15);
      dirLight.target.position.copy(s.pos);
      dirLight.target.updateMatrixWorld();
      pointLight.position.set(s.pos.x, s.pos.y + 5, s.pos.z - 3);

      // 7. Network: Send Move updates (throttled ~25-30ms)
      if (now - s.lastSentMoveTime > 35) {
        s.lastSentMoveTime = now;
        onSendMove({
          x: parseFloat(s.pos.x.toFixed(2)),
          y: parseFloat(s.pos.y.toFixed(2)),
          z: parseFloat(s.pos.z.toFixed(2)),
          rotY: parseFloat(s.rotY.toFixed(2)),
          isJumping: !s.isGrounded,
          animState,
          currentBlock: s.currentBlock,
          score: s.maxBlock,
        });
      }

      // 8. Update Remote Players (Smooth Interpolation & Rig Animation)
      for (const [id, rp] of remotePlayersMap.current) {
        // Interpolate position
        rp.current.x = THREE.MathUtils.lerp(rp.current.x, rp.target.x, dt * 14);
        rp.current.y = THREE.MathUtils.lerp(rp.current.y, rp.target.y, dt * 14);
        rp.current.z = THREE.MathUtils.lerp(rp.current.z, rp.target.z, dt * 14);

        // Interpolate rotation
        let dRot = rp.target.rotY - rp.current.rotY;
        while (dRot < -Math.PI) dRot += Math.PI * 2;
        while (dRot > Math.PI) dRot -= Math.PI * 2;
        rp.current.rotY += dRot * Math.min(1, dt * 12);

        rp.rig.root.position.set(rp.current.x, rp.current.y, rp.current.z);
        rp.rig.root.rotation.y = rp.current.rotY;

        const remoteMoving = Math.abs(rp.target.x - rp.current.x) > 0.02 || Math.abs(rp.target.z - rp.current.z) > 0.02;
        animateCharacterRig(
          rp.rig,
          rp.target.animState,
          remoteMoving,
          rp.target.isJumping,
          now * 0.001
        );
      }

      // 9. Update Landing Shockwaves & Colorful Spark Particles
      for (let i = landingEffectsRef.current.length - 1; i >= 0; i--) {
        const eff = landingEffectsRef.current[i];
        const elapsed = (now - eff.startTime) * 0.001;
        const progress = Math.min(1, elapsed / eff.duration);

        // Expand and fade shockwave ring
        const ringScale = 1 + progress * 4.2;
        eff.ring.scale.set(ringScale, ringScale, 1);
        (eff.ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - progress) * 0.95);

        // Animate spark particles
        for (const p of eff.particles) {
          p.mesh.position.x += p.vx * dt;
          p.mesh.position.y += p.vy * dt;
          p.mesh.position.z += p.vz * dt;
          p.vy -= 20 * dt; // Gravity pull down
          p.mesh.rotation.x += p.rotX * dt;
          p.mesh.rotation.y += p.rotY * dt;
          p.mesh.rotation.z += p.rotZ * dt;
          const pScale = Math.max(0, p.initialScale * (1 - progress));
          p.mesh.scale.setScalar(pScale);
        }

        // Restore platform squash smoothly
        if (eff.platformGroup) {
          eff.platformGroup.scale.y = THREE.MathUtils.lerp(eff.platformGroup.scale.y, 1.0, dt * 18);
        }

        // Effect expired -> cleanup resources
        if (progress >= 1) {
          scene.remove(eff.ring);
          eff.ring.geometry.dispose();
          (eff.ring.material as THREE.Material).dispose();

          for (const p of eff.particles) {
            scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            (p.mesh.material as THREE.Material).dispose();
          }

          if (eff.platformGroup) {
            eff.platformGroup.scale.y = 1.0;
          }

          landingEffectsRef.current.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle Window Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      // Clean up remote rigs
      remotePlayersMap.current.forEach((rp) => {
        scene.remove(rp.rig.root);
      });
      remotePlayersMap.current.clear();
    };
  }, [user.color, user.name]);

  // Sync Remote Players dictionary with Three.js scene
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentMap = remotePlayersMap.current;
    const incomingIds = new Set(Object.keys(remotePlayers));

    // Remove disconnected players
    for (const [id, entry] of currentMap) {
      if (!incomingIds.has(id)) {
        scene.remove(entry.rig.root);
        currentMap.delete(id);
      }
    }

    // Add or update incoming players
    Object.values(remotePlayers).forEach((netPlayer) => {
      let entry = currentMap.get(netPlayer.id);
      if (!entry) {
        // Create new character rig for remote player
        const rig = createCharacter(netPlayer.color || '#10b981', netPlayer.name, false);
        rig.root.userData = { playerId: netPlayer.id, name: netPlayer.name };
        rig.root.traverse((child) => {
          child.userData = { playerId: netPlayer.id, name: netPlayer.name };
        });
        scene.add(rig.root);

        entry = {
          rig,
          target: {
            x: netPlayer.x,
            y: netPlayer.y,
            z: netPlayer.z,
            rotY: netPlayer.rotY,
            isJumping: netPlayer.isJumping,
            animState: netPlayer.animState,
            currentBlock: netPlayer.currentBlock,
          },
          current: {
            x: netPlayer.x,
            y: netPlayer.y,
            z: netPlayer.z,
            rotY: netPlayer.rotY,
          },
        };
        currentMap.set(netPlayer.id, entry);
      } else {
        // Update targets
        entry.target.x = netPlayer.x;
        entry.target.y = netPlayer.y;
        entry.target.z = netPlayer.z;
        entry.target.rotY = netPlayer.rotY;
        entry.target.isJumping = netPlayer.isJumping;
        entry.target.animState = netPlayer.animState;

        const wasSpeaking = (entry as any).lastSpeaking;
        const speakingChanged = wasSpeaking !== netPlayer.isSpeaking;

        if (entry.target.currentBlock !== netPlayer.currentBlock || speakingChanged) {
          entry.target.currentBlock = netPlayer.currentBlock;
          (entry as any).lastSpeaking = netPlayer.isSpeaking;
          if (entry.rig.nameCanvas && entry.rig.nameContext && entry.rig.nameTexture) {
            updateNameTagCanvas(
              entry.rig.nameCanvas,
              entry.rig.nameContext,
              netPlayer.name,
              netPlayer.currentBlock,
              false,
              netPlayer.color,
              netPlayer.isSpeaking
            );
            entry.rig.nameTexture.needsUpdate = true;
          }
        }
      }
    });
  }, [remotePlayers]);

  // Sync Local Player Speaking indicator
  useEffect(() => {
    const localRig = localRigRef.current;
    if (localRig && localRig.nameCanvas && localRig.nameContext && localRig.nameTexture) {
      updateNameTagCanvas(
        localRig.nameCanvas,
        localRig.nameContext,
        user.name,
        stateRef.current.currentBlock,
        true,
        user.color,
        isLocalSpeaking
      );
      localRig.nameTexture.needsUpdate = true;
    }
  }, [isLocalSpeaking, user.name, user.color]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative select-none cursor-grab active:cursor-grabbing touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
};
