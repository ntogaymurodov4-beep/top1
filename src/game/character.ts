import * as THREE from 'three';

export interface CharacterRig {
  root: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  shadow: THREE.Mesh;
  nameSprite?: THREE.Sprite;
  nameCanvas?: HTMLCanvasElement;
  nameContext?: CanvasRenderingContext2D;
  nameTexture?: THREE.CanvasTexture;
}

export function createCharacter(
  colorHex: string = '#3b82f6',
  name: string = 'O\'yinchi',
  isLocal: boolean = false
): CharacterRig {
  const root = new THREE.Group();

  const primaryColor = new THREE.Color(colorHex);
  const skinTone = new THREE.Color('#fcd34d');
  const darkDetail = new THREE.Color('#1e293b');
  const accentColor = new THREE.Color(colorHex).offsetHSL(0.1, 0, 0.1);

  // Materials
  const bodyMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    roughness: 0.4,
    metalness: 0.2,
  });

  const skinMat = new THREE.MeshStandardMaterial({
    color: skinTone,
    roughness: 0.5,
  });

  const detailMat = new THREE.MeshStandardMaterial({
    color: darkDetail,
    roughness: 0.6,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.3,
  });

  // Torso
  const bodyGeo = new THREE.BoxGeometry(0.7, 0.9, 0.5);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.05;
  body.castShadow = true;
  body.receiveShadow = true;
  root.add(body);

  // Belt / stripe on torso
  const beltGeo = new THREE.BoxGeometry(0.72, 0.15, 0.52);
  const belt = new THREE.Mesh(beltGeo, detailMat);
  belt.position.y = -0.32;
  body.add(belt);

  // Emblem on chest
  const emblemGeo = new THREE.BoxGeometry(0.25, 0.25, 0.05);
  const emblem = new THREE.Mesh(emblemGeo, accentMat);
  emblem.position.set(0, 0.1, 0.26);
  body.add(emblem);

  // Head
  const headGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.set(0, 0.75, 0);
  head.castShadow = true;
  body.add(head);

  // Cap / Hair on top
  const capGeo = new THREE.BoxGeometry(0.58, 0.2, 0.58);
  const cap = new THREE.Mesh(capGeo, bodyMat);
  cap.position.y = 0.24;
  head.add(cap);

  // Cap visor
  const visorGeo = new THREE.BoxGeometry(0.52, 0.06, 0.3);
  const visor = new THREE.Mesh(visorGeo, bodyMat);
  visor.position.set(0, 0.18, 0.35);
  head.add(visor);

  // Eyes
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.12, 0.04);
  const leftEye = new THREE.Mesh(eyeGeo, detailMat);
  leftEye.position.set(-0.14, 0.02, 0.28);
  head.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, detailMat);
  rightEye.position.set(0.14, 0.02, 0.28);
  head.add(rightEye);

  // Headphones / Ear details
  const earGeo = new THREE.BoxGeometry(0.12, 0.2, 0.2);
  const leftEar = new THREE.Mesh(earGeo, detailMat);
  leftEar.position.set(-0.3, 0, 0);
  head.add(leftEar);
  const rightEar = new THREE.Mesh(earGeo, detailMat);
  rightEar.position.set(0.3, 0, 0);
  head.add(rightEar);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);
  armGeo.translate(0, -0.35, 0); // pivot at shoulder

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.48, 0.35, 0);
  const leftArm = new THREE.Mesh(armGeo, skinMat);
  leftArm.castShadow = true;
  leftArmPivot.add(leftArm);
  body.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.48, 0.35, 0);
  const rightArm = new THREE.Mesh(armGeo, skinMat);
  rightArm.castShadow = true;
  rightArmPivot.add(rightArm);
  body.add(rightArmPivot);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.26, 0.7, 0.26);
  legGeo.translate(0, -0.35, 0); // pivot at hip

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.2, -0.45, 0);
  const leftLeg = new THREE.Mesh(legGeo, detailMat);
  leftLeg.castShadow = true;
  leftLegPivot.add(leftLeg);
  body.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.2, -0.45, 0);
  const rightLeg = new THREE.Mesh(legGeo, detailMat);
  rightLeg.castShadow = true;
  rightLegPivot.add(rightLeg);
  body.add(rightLegPivot);

  // Shoes
  const shoeGeo = new THREE.BoxGeometry(0.28, 0.16, 0.36);
  const leftShoe = new THREE.Mesh(shoeGeo, accentMat);
  leftShoe.position.set(0, -0.66, 0.05);
  leftLegPivot.add(leftShoe);

  const rightShoe = new THREE.Mesh(shoeGeo, accentMat);
  rightShoe.position.set(0, -0.66, 0.05);
  rightLegPivot.add(rightShoe);

  // Fake Shadow under character
  const shadowGeo = new THREE.CircleGeometry(0.55, 16);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  // Dynamic Floating 3D Name Tag & Block info
  let nameSprite: THREE.Sprite | undefined;
  let nameCanvas: HTMLCanvasElement | undefined;
  let nameContext: CanvasRenderingContext2D | undefined;
  let nameTexture: THREE.CanvasTexture | undefined;

  if (typeof document !== 'undefined') {
    nameCanvas = document.createElement('canvas');
    nameCanvas.width = 320;
    nameCanvas.height = 100;
    const ctx = nameCanvas.getContext('2d');
    if (ctx) {
      nameContext = ctx;
      updateNameTagCanvas(nameCanvas, ctx, name, 0, isLocal, colorHex);
      nameTexture = new THREE.CanvasTexture(nameCanvas);
      nameTexture.minFilter = THREE.LinearFilter;
      const spriteMat = new THREE.SpriteMaterial({
        map: nameTexture,
        transparent: true,
        depthTest: false,
      });
      nameSprite = new THREE.Sprite(spriteMat);
      nameSprite.scale.set(2.4, 0.75, 1);
      nameSprite.position.set(0, 2.3, 0);
      root.add(nameSprite);
    }
  }

  return {
    root,
    body,
    head,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    shadow,
    nameSprite,
    nameCanvas,
    nameContext,
    nameTexture,
  };
}

export function updateNameTagCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  name: string,
  currentBlock: number,
  isLocal: boolean,
  colorHex: string,
  isSpeaking: boolean = false
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Rounded bubble background
  ctx.save();
  ctx.fillStyle = isSpeaking ? 'rgba(5, 46, 22, 0.92)' : 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = isSpeaking ? '#22c55e' : isLocal ? '#38bdf8' : colorHex;
  ctx.lineWidth = isSpeaking ? 6 : 4;

  const x = 10;
  const y = 10;
  const w = canvas.width - 20;
  const h = canvas.height - 20;
  const r = 18;

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Draw name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const prefix = isSpeaking ? '🎙️ ' : isLocal ? '⭐ ' : '🏃 ';
  const label = prefix + (name.length > 12 ? name.substring(0, 11) + '..' : name);
  ctx.fillText(label, canvas.width / 2, y + 26);

  // Draw block info or speaking badge
  if (isSpeaking) {
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`🔊 Gapirmoqda • ${currentBlock}-yercha`, canvas.width / 2, y + 54);
  } else {
    ctx.fillStyle = isLocal ? '#7dd3fc' : '#fbbf24';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`🧱 ${currentBlock}-yercha`, canvas.width / 2, y + 54);
  }

  ctx.restore();
}

export function animateCharacterRig(
  rig: CharacterRig,
  state: string,
  isMoving: boolean,
  isJumping: boolean,
  timeSec: number,
  speed: number = 1
) {
  if (isJumping) {
    // Jump pose: legs tucked slightly, arms raised up
    rig.leftArmPivot.rotation.x = -Math.PI * 0.7;
    rig.rightArmPivot.rotation.x = -Math.PI * 0.7;
    rig.leftArmPivot.rotation.z = -0.3;
    rig.rightArmPivot.rotation.z = 0.3;

    rig.leftLegPivot.rotation.x = 0.4;
    rig.rightLegPivot.rotation.x = 0.6;
    rig.body.position.y = 1.15;
    rig.head.rotation.x = -0.15;
  } else if (isMoving) {
    // Running cycle
    const cycle = timeSec * 12 * Math.min(speed, 1.4);
    const swing = Math.sin(cycle) * 0.75;

    rig.leftArmPivot.rotation.x = swing;
    rig.rightArmPivot.rotation.x = -swing;
    rig.leftArmPivot.rotation.z = 0.1;
    rig.rightArmPivot.rotation.z = -0.1;

    rig.leftLegPivot.rotation.x = -swing;
    rig.rightLegPivot.rotation.x = swing;

    // Bobbing
    rig.body.position.y = 1.05 + Math.abs(Math.sin(cycle)) * 0.12;
    rig.head.rotation.y = Math.sin(cycle * 0.5) * 0.08;
    rig.head.rotation.x = 0.05;
  } else {
    // Idle breathing
    const idleCycle = timeSec * 2.5;
    rig.leftArmPivot.rotation.x = Math.sin(idleCycle) * 0.08;
    rig.rightArmPivot.rotation.x = -Math.sin(idleCycle) * 0.08;
    rig.leftArmPivot.rotation.z = 0.05;
    rig.rightArmPivot.rotation.z = -0.05;

    rig.leftLegPivot.rotation.x = 0;
    rig.rightLegPivot.rotation.x = 0;

    rig.body.position.y = 1.05 + Math.sin(idleCycle) * 0.03;
    rig.head.rotation.y = Math.sin(idleCycle * 0.5) * 0.05;
    rig.head.rotation.x = 0;
  }
}
