/**
 * LEGO Batman – Voxel Builder (Stable v5)
 * =========================================================
 * Index over ændringer (siden “stabil v1”):
 * 1) Stabil CDN-opsætning uden drei (kun react, react-dom, three, @react-three/fiber)
 * 2) Sidebar: klods-typer 2x2 / 2x4 / 2x6 / 4x4 / 4x6 + visuelle previews (stud-ikon)
 * 3) Farvevælger i bund (runde cirkler) + 1–9 genveje
 * 4) Rotation (R) af aflange klodser (90° toggle)
 * 5) Dag/Nat-toggle + dynamisk lys/himmel (Gradient+stjerner)
 * 6) Lyd: Musik on/off (rigtig musik via URL ?music=...), SFX on/off (place/remove/throw)
 * 7) Kollision med step-up (kan gå op på 1-blok kanter), bedre “onGround”, snap til top
 * 8) Batarang “E” fjerner hele klodser (alle celler i multi-brick)
 * 9) Simpel “villain” AI (Joker, Riddler, Penguin, Mr. Freeze, Harley) – wander/undvig
 * 10) iPad/mobile: Touch-piletaster + HOP i nederste højre hjørne
 * 11) Altid jord: stor plane + basefliser ved y=0 (ingen uendeligt fald)
 * 12) Struktureret i ekstern fil (game.js) for nem opdatering
 * =========================================================
 */

import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import * as THREE from "https://esm.sh/three@0.160.0";
import { Canvas, useFrame, useThree } from "https://esm.sh/@react-three/fiber@8.15.16?bundle&deps=react@18.3.1,react-dom@18.3.1,three@0.160.0";

/* ---------------------------- Utils & State ---------------------------- */
const keyState = new Map();
const setKey = (code, down) => keyState.set(code.toLowerCase(), down);
const isDown = (code) => keyState.get(code.toLowerCase()) === true;
const vec3 = (x=0,y=0,z=0) => ({x,y,z});
const toKey = (x,y,z) => `${x}|${y}|${z}`;

/* ------------------------------- Farver -------------------------------- */
const COLORS = [
  { id: "black", label: "Black", color: "#111111" },
  { id: "darkgray", label: "Dark Gray", color: "#3a3a3a" },
  { id: "lightgray", label: "Light Gray", color: "#9aa0a6" },
  { id: "yellow", label: "Yellow", color: "#ffd400" },
  { id: "blue", label: "Blue", color: "#1565c0" },
  { id: "purple", label: "Purple", color: "#6a1b9a" },
  { id: "red", label: "Red", color: "#d32f2f" },
  { id: "green", label: "Green", color: "#2e7d32" },
  { id: "white", label: "White", color: "#eeeeee" },
  { id: "trans", label: "Translucent", color: "#a0d8ff", transparent: true, opacity: 0.5 },
];
const DEFAULT_COLOR_INDEX = 3;

/* ------------------------------ Klodser -------------------------------- */
const BRICKS = [
  { id:"2x2", w:2, l:2 },
  { id:"2x4", w:2, l:4 },
  { id:"2x6", w:2, l:6 },
  { id:"4x4", w:4, l:4 },
  { id:"4x6", w:4, l:6 },
];
const BRICK_MAP = new Map(BRICKS.map(b=>[b.id,b]));
let BRICK_ID = 1;

/* ------------------------------- Audio --------------------------------- */
function useAudio(){
  const ctxRef = useRef(null);
  const bgGain = useRef(null);
  const sfxGain = useRef(null);
  let audioEl = null;
  const ensureCtx = () => {
    if (!ctxRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;
      bgGain.current = ctx.createGain(); bgGain.current.gain.value = 0.0; bgGain.current.connect(ctx.destination);
      sfxGain.current = ctx.createGain(); sfxGain.current.gain.value = 0.6; sfxGain.current.connect(ctx.destination);
    }
    return ctxRef.current;
  };
  const getMusicURL = () => {
    const urlParam = new URLSearchParams(location.search).get("music");
    return window.MUSIC_URL || urlParam || "";
  };
  const setBGEnabled = async (on) => {
    const ctx = ensureCtx();
    const url = getMusicURL();
    if (on){
      if (url) {
        if (!audioEl) {
          audioEl = new Audio(url);
          audioEl.loop = true;
          audioEl.crossOrigin = "anonymous";
          const src = ctx.createMediaElementSource(audioEl);
          src.connect(bgGain.current);
        }
        try { await audioEl.play(); } catch {}
        bgGain.current.gain.linearRampToValueAtTime(0.6, ctx.currentTime+0.8);
      } else {
        // fallback synth
        const o1 = ctx.createOscillator(); const g1 = ctx.createGain();
        o1.type="sine"; o1.frequency.value=174.61; g1.gain.value=0.0; o1.connect(g1); g1.connect(bgGain.current); o1.start();
        const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
        o2.type="triangle"; o2.frequency.value=174.61*1.5; g2.gain.value=0.0; o2.connect(g2); g2.connect(bgGain.current); o2.start();
        bgGain.current.gain.linearRampToValueAtTime(0.45, ctx.currentTime+1.2);
        g1.gain.linearRampToValueAtTime(0.05, ctx.currentTime+2);
        g2.gain.linearRampToValueAtTime(0.04, ctx.currentTime+3);
      }
    } else {
      if (audioEl) { audioEl.pause(); }
      bgGain.current.gain.linearRampToValueAtTime(0.0, ctx.currentTime+0.5);
    }
  };
  const setSFXEnabled = (on) => {
    const ctx = ensureCtx();
    sfxGain.current.gain.linearRampToValueAtTime(on ? 0.6 : 0.0, ctx.currentTime+0.05);
  };
  const playSFX = (type="place") => {
    const ctx = ensureCtx();
    const g = ctx.createGain(); g.connect(sfxGain.current); g.gain.value = 0.0;
    const o = ctx.createOscillator();
    if (type==="place"){ o.type="square"; o.frequency.value=660; }
    else if (type==="remove"){ o.type="square"; o.frequency.value=440; }
    else if (type==="throw"){ o.type="sawtooth"; o.frequency.value=880; }
    else { o.type="sine"; o.frequency.value=520; }
    o.connect(g); o.start();
    const now = ctx.currentTime;
    g.gain.linearRampToValueAtTime(0.14, now+0.02);
    if (type==="throw"){ o.frequency.exponentialRampToValueAtTime(220, now+0.25); g.gain.linearRampToValueAtTime(0.0, now+0.26); o.stop(now+0.27); }
    else { g.gain.linearRampToValueAtTime(0.0, now+0.12); o.stop(now+0.13); }
  };
  useEffect(() => {
    const onFirst = () => { ensureCtx(); window.removeEventListener("pointerdown", onFirst); };
    window.addEventListener("pointerdown", onFirst);
    return () => window.removeEventListener("pointerdown", onFirst);
  }, []);
  return { setBGEnabled, playSFX, setSFXEnabled };
}

/* -------------------------------- World -------------------------------- */
function Ground({ size = 400, groundColor="#2a2a2d" }) {
  const { scene } = useThree();
  useEffect(() => { scene.fog = null; }, [scene]);
  return (
    React.createElement('mesh',{rotation:[ -Math.PI / 2, 0, 0 ], receiveShadow:true},
      React.createElement('planeGeometry',{args:[size, size, size, size]}),
      React.createElement('meshStandardMaterial',{color:groundColor})
    )
  );
}
function GradientSky({ mode="night" }) {
  const { gl } = useThree();
  useEffect(() => { gl.setClearColor(new THREE.Color(mode==="day" ? 0x87b6ff : 0x06080f)); }, [gl, mode]);
  return null;
}
function StarsSimple({ count = 600, visible=true }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i=0;i<count;i++){
      const r = 80 + Math.random()*120;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2*Math.random()-1);
      arr[i*3+0] = r * Math.sin(p) * Math.cos(t);
      arr[i*3+1] = r * Math.sin(p) * Math.sin(t);
      arr[i*3+2] = r * Math.cos(p);
    }
    return arr;
  }, [count]);
  if (!visible) return null;
  return React.createElement('points',null,
    React.createElement('bufferGeometry',null,
      React.createElement('bufferAttribute',{attach:"attributes-position", array:positions, itemSize:3, count:positions.length/3})
    ),
    React.createElement('pointsMaterial',{size:0.5, sizeAttenuation:true, color:"#9fc9ff"})
  );
}
function BlockCell({ position, color, transparent=false, opacity=1 }){
  return React.createElement('group',{position},
    React.createElement('mesh',{castShadow:true,receiveShadow:true},
      React.createElement('boxGeometry',{args:[1,1,1]}),
      React.createElement('meshStandardMaterial',{color,transparent,opacity})
    ),
    [-0.25,0.25].map(sx => [-0.25,0.25].map(sz =>
      React.createElement('mesh',{key:`${sx}-${sz}`,position:[sx,0.55,sz],castShadow:true},
        React.createElement('cylinderGeometry',{args:[0.12,0.12,0.1,16]}),
        React.createElement('meshStandardMaterial',{color,transparent,opacity})
      )
    ))
  );
}
function Blocks({ blocks }){
  const items = [...blocks.values()];
  return React.createElement('group',null,
    items.map(({pos, type}) => {
      const c = COLORS.find(k=>k.id===type) || COLORS[0];
      return React.createElement(BlockCell, {
        key:`${pos[0]}|${pos[1]}|${pos[2]}`, position:pos,
        color:c.color, transparent:!!c.transparent, opacity:c.opacity ?? 1
      });
    })
  );
}
function BatmanMinifig({ position }){
  const body = "#151515", cowl = "#0d0d0d", belt = "#f1c40f", gray = "#444";
  return React.createElement('group',{position},
    React.createElement('mesh',{position:[ -0.15, 0.25, 0 ], castShadow:true}, React.createElement('boxGeometry',{args:[0.25,0.5,0.35]}), React.createElement('meshStandardMaterial',{color:gray})),
    React.createElement('mesh',{position:[ 0.15, 0.25, 0 ], castShadow:true}, React.createElement('boxGeometry',{args:[0.25,0.5,0.35]}), React.createElement('meshStandardMaterial',{color:gray})),
    React.createElement('mesh',{position:[0, 0.85, 0], castShadow:true}, React.createElement('boxGeometry',{args:[0.6,0.7,0.35]}), React.createElement('meshStandardMaterial',{color:body})),
    React.createElement('mesh',{position:[0, 0.55, 0], castShadow:true}, React.createElement('boxGeometry',{args:[0.62,0.1,0.37]}), React.createElement('meshStandardMaterial',{color:belt})),
    React.createElement('mesh',{position:[ -0.45, 0.85, 0 ], castShadow:true}, React.createElement('boxGeometry',{args:[0.2,0.5,0.2]}), React.createElement('meshStandardMaterial',{color:body})),
    React.createElement('mesh',{position:[ 0.45, 0.85, 0 ], castShadow:true}, React.createElement('boxGeometry',{args:[0.2,0.5,0.2]}), React.createElement('meshStandardMaterial',{color:body})),
    React.createElement('mesh',{position:[0, 1.35, 0], castShadow:true}, React.createElement('boxGeometry',{args:[0.35,0.35,0.3]}), React.createElement('meshStandardMaterial',{color:cowl})),
    React.createElement('mesh',{position:[ -0.12, 1.6, 0 ], castShadow:true}, React.createElement('boxGeometry',{args:[0.07,0.15,0.07]}), React.createElement('meshStandardMaterial',{color:cowl})),
    React.createElement('mesh',{position:[ 0.12, 1.6, 0 ], castShadow:true}, React.createElement('boxGeometry',{args:[0.07,0.15,0.07]}), React.createElement('meshStandardMaterial',{color:cowl})),
    React.createElement('mesh',{position:[0, 0.9, -0.23], castShadow:true}, React.createElement('boxGeometry',{args:[0.6,0.8,0.02]}), React.createElement('meshStandardMaterial',{color:cowl}))
  );
}

/* ----------------------- Collision/physics w/ step ---------------------- */
let currentYaw = 0;
function collidesAt(p, size, blocks){
  const half = { x: size.x/2, y: size.y/2, z: size.z/2 };
  const minX = Math.floor(p.x - half.x), maxX = Math.floor(p.x + half.x);
  const minY = Math.floor(p.y - half.y), maxY = Math.floor(p.y + half.y);
  const minZ = Math.floor(p.z - half.z), maxZ = Math.floor(p.z + half.z);
  for (let x=minX; x<=maxX; x++){
    for (let y=minY; y<=maxY; y++){
      for (let z=minZ; z<=maxZ; z++){
        if (y < 0) { // gulv
          if (y <= -1) return true;
          continue;
        }
        if (blocks.has(`${x}|${y}|${z}`)) return true;
      }
    }
  }
  return false;
}
function tryStepUp(basePos, tryPos, size, blocks, maxStep=0.6){
  const inc = 0.1;
  const stepped = { x: tryPos.x, y: basePos.y, z: tryPos.z };
  for (let h=inc; h<=maxStep+1e-6; h+=inc){
    stepped.y = basePos.y + h;
    if (!collidesAt(stepped, size, blocks)) return { ok:true, pos: { ...stepped } };
  }
  return { ok:false, pos: tryPos };
}
function snapToTop(pos, size, blocks){
  const belowY = Math.floor(pos.y - size.y/2 - 0.001);
  const cx = Math.round(pos.x), cz = Math.round(pos.z);
  if (belowY < 0) { pos.y = 0 + size.y/2; return; }
  for (let dy=0; dy<=2; dy++){
    const y = belowY - dy;
    if (blocks.has(`${cx}|${y}|${cz}`)){
      const top = y + 1 + size.y/2;
      if (pos.y < top + 0.12){ pos.y = top; }
      break;
    }
  }
}
function aabbVsBlocks(next, size, blocks, currentY, stepHeight=0.6){
  const pos = { x: next.x, y: next.y, z: next.z };
  let testX = { x: pos.x, y: currentY, z: pos.z };
  if (collidesAt(testX, size, blocks)){
    const stepped = tryStepUp({x:testX.x, y:currentY, z:testX.z}, testX, size, blocks, stepHeight);
    if (stepped.ok){ testX = stepped.pos; }
    else {
      const dir = Math.sign(testX.x - Math.round(testX.x)) || (testX.x>=0?1:-1);
      while (collidesAt(testX, size, blocks)) testX.x += dir * 0.01;
    }
  }
  pos.x = testX.x; pos.y = testX.y; pos.z = testX.z;

  let testZ = { x: pos.x, y: pos.y, z: pos.z };
  if (collidesAt(testZ, size, blocks)){
    const stepped = tryStepUp({x:testZ.x, y:pos.y, z:testZ.z}, testZ, size, blocks, stepHeight);
    if (stepped.ok){ testZ = stepped.pos; }
    else {
      const dir = Math.sign(testZ.z - Math.round(testZ.z)) || (testZ.z>=0?1:-1);
      while (collidesAt(testZ, size, blocks)) testZ.z += dir * 0.01;
    }
  }
  pos.x = testZ.x; pos.y = testZ.y; pos.z = testZ.z;

  let testY = { x: pos.x, y: next.y, z: pos.z };
  if (collidesAt(testY, size, blocks)){
    const dir = Math.sign(testY.y - Math.round(testY.y)) || (testY.y >= currentY ? 1 : -1);
    let n=0; while (collidesAt(testY, size, blocks) && n++<2000) testY.y += (dir===0? (testY.y>=0?1:-1):dir) * 0.01;
  }
  pos.y = testY.y;
  snapToTop(pos, size, blocks);
  if (pos.y < size.y/2) pos.y = size.y/2;
  return pos;
}

/* ------------------------------- Player -------------------------------- */
function PlayerController({ positionRef, blocks }){
  const ref = useRef(null);
  const vel = useRef(vec3(0,0,0));
  const onGround = useRef(true);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","w","a","s","d","b","1","2","3","4","5","6","7","8","9","q","e","r"].includes(e.key.toLowerCase()) || e.key === " ") {
        e.preventDefault();
      }
      setKey(e.key, true);
    };
    const onKeyUp = (e) => setKey(e.key, false);
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useFrame((_, dt) => {
    const speed = 3.8;
    const jumpV = 6.4;
    const gravity = 9.8;

    let forward = 0, strafe = 0;
    if (isDown("arrowup") || isDown("w")) forward += 1;
    if (isDown("arrowdown") || isDown("s")) forward -= 1;
    if (isDown("arrowleft") || isDown("a")) strafe -= 1;
    if (isDown("arrowright") || isDown("d")) strafe += 1;

    if (isDown("arrowleft") && !isDown("a")) currentYaw += 1.7 * dt;
    if (isDown("arrowright") && !isDown("d")) currentYaw -= 1.7 * dt;

    const yaw = currentYaw;
    const dir = new THREE.Vector3(strafe, 0, -forward);
    if (dir.lengthSq()>0) dir.normalize();
    dir.applyAxisAngle(new THREE.Vector3(0,1,0), yaw);

    const v = vel.current;
    v.x = dir.x * speed; v.z = dir.z * speed; v.y += -gravity * dt;
    if (!onGround.current) { v.x *= 0.9; v.z *= 0.9; }

    if (onGround.current && (isDown(" ") || isDown("space"))) { v.y = jumpV; onGround.current = false; }

    const p = positionRef.current;
    const next = { x: p.x + v.x * dt, y: p.y + v.y * dt, z: p.z + v.z * dt };
    const resolved = aabbVsBlocks(next, {x:0.6,y:1.7,z:0.6}, blocks, p.y, 0.6);

    const wasFalling = v.y < 0;
    const landed = wasFalling && (resolved.y >= p.y) && Math.abs(resolved.y - p.y) < 0.05;

    if (landed){ v.y = 0; onGround.current = true; }
    else {
      const under = { x: resolved.x, y: resolved.y - 0.02, z: resolved.z };
      const touching = collidesAt(under, {x:0.6,y:1.7,z:0.6}, blocks) || resolved.y <= 0.51;
      onGround.current = touching;
      if (touching && v.y < 0) v.y = 0;
    }

    p.x = resolved.x; p.y = resolved.y; p.z = resolved.z;
    if (p.y < 0.5) { p.y = 0.5; v.y = 0; onGround.current = true; }

    if (ref.current) { ref.current.position.set(p.x, p.y, p.z); ref.current.rotation.y = yaw; }
  });

  return React.createElement('group',{ref},
    React.createElement(BatmanMinifig,{position:[0,0,0]})
  );
}

/* -------------------------------- Camera ------------------------------- */
function CameraRig({ playerPosRef }){
  const { camera } = useThree();
  useFrame(() => {
    const p = playerPosRef.current;
    const offset = new THREE.Vector3(0, 1.8, 4).applyAxisAngle(new THREE.Vector3(0,1,0), currentYaw);
    const target = new THREE.Vector3(p.x, p.y + 0.9, p.z);
    const desired = target.clone().add(offset);
    camera.position.lerp(desired, 0.18);
    camera.lookAt(target);
  });
  return null;
}

/* -------------------------- Multi-cell bricks -------------------------- */
function addBrickAt(base, brick, colorId, rot, blocks, bricks){
  const id = BRICK_ID++;
  const w = rot ? brick.l : brick.w;
  const l = rot ? brick.w : brick.l;
  const cells = [];
  for (let dx=0; dx<w; dx++){
    for (let dz=0; dz<l; dz++){
      const cx = Math.round(base.x) + dx;
      const cy = Math.round(base.y);
      const cz = Math.round(base.z) + dz;
      if (cy < 0) return false;
      const key = toKey(cx,cy,cz);
      if (blocks.has(key)) return false;
      cells.push({cx,cy,cz,key});
    }
  }
  for (const c of cells) blocks.set(c.key, { pos:[c.cx,c.cy,c.cz], type: colorId, brick:id });
  bricks.set(id, cells.map(c=>c.key));
  return true;
}
function removeBrickAtCell(cx,cy,cz, blocks, bricks){
  const key = toKey(cx,cy,cz);
  const cell = blocks.get(key);
  if (!cell) return false;
  const id = cell.brick;
  const list = bricks.get(id) || [];
  for (const k of list) blocks.delete(k);
  bricks.delete(id);
  return true;
}

/* -------------------------------- Build -------------------------------- */
function RaycastPlacer({ mode, blocks, setBlocks, bricks, getColor, getBrick, getRot, sfx }){
  const { camera, gl, scene } = useThree();
  const raycaster = useMemo(()=> new THREE.Raycaster(), []);
  const pointer = useMemo(()=> new THREE.Vector2(), []);

  useEffect(() => {
    const onContext = (e) => e.preventDefault();
    gl.domElement.addEventListener("contextmenu", onContext);
    return () => gl.domElement.removeEventListener("contextmenu", onContext);
  }, [gl]);

  const handlePointerDown = (e) => {
    if (mode !== "build") return;
    const rect = gl.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const blockMeshes = [];
    scene.traverse(obj => { if (obj.type === "Group" && obj.children?.length) blockMeshes.push(obj); });
    const intersectsBlocks = raycaster.intersectObjects(blockMeshes, true);

    if (e.button === 2) {
      if (intersectsBlocks.length > 0) {
        const parent = intersectsBlocks[0].object.parent;
        const pos = parent.position;
        const cx = Math.round(pos.x), cy = Math.round(pos.y), cz = Math.round(pos.z);
        setBlocks(prev => {
          const nb = new Map(prev);
          const ok = removeBrickAtCell(cx,cy,cz, nb, bricks);
          if (ok && sfx) sfx("remove");
          return nb;
        });
      }
      return;
    }

    const colorId = getColor();
    const brick = BRICK_MAP.get(getBrick());
    const rot = getRot();
    if (intersectsBlocks.length > 0) {
      const hit = intersectsBlocks[0];
      const normal = hit.face?.normal?.clone() ?? new THREE.Vector3(0,1,0);
      const worldNormal = normal.applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();
      const place = hit.point.clone().add(worldNormal.multiplyScalar(0.5)).floor().addScalar(0.5);
      const base = { x: Math.round(place.x), y: Math.round(place.y), z: Math.round(place.z) };
      setBlocks(prev => {
        const nb = new Map(prev);
        const ok = addBrickAt(base, brick, colorId, rot, nb, bricks);
        if (ok && sfx) sfx("place");
        return nb;
      });
      return;
    }
    const ground = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(ground, intersection);
    if (intersection) {
      const base = { x: Math.round(intersection.x), y: 0, z: Math.round(intersection.z) };
      setBlocks(prev => {
        const nb = new Map(prev);
        const ok = addBrickAt(base, brick, colorId, rot, nb, bricks);
        if (ok && sfx) sfx("place");
        return nb;
      });
    }
  };

  useEffect(() => {
    const el = gl.domElement;
    el.addEventListener("mousedown", handlePointerDown);
    return () => el.removeEventListener("mousedown", handlePointerDown);
  }, [gl, camera, scene, mode, getColor, getBrick, getRot, sfx]);

  return null;
}

/* ------------------------------- Batarang ------------------------------- */
function BatarangSystem({ blocks, setBlocks, bricks, sfx }){
  const { camera } = useThree();
  const [bats, setBats] = useState([]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === "e"){
        const dir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
        const pos = camera.position.clone().add(dir.clone().multiplyScalar(0.6)).add(new THREE.Vector3(0,-0.1,0));
        const speed = 12;
        setBats(prev => [...prev, { id: Math.random(), pos, vel: dir.multiplyScalar(speed), ttl: 2.0 }]);
        sfx && sfx("throw");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [camera, sfx]);

  useFrame((_, dt) => {
    if (bats.length === 0) return;
    setBats(prev => {
      const next = [];
      for (const b of prev){
        const np = b.pos.clone().add(b.vel.clone().multiplyScalar(dt));
        const cx = Math.round(np.x), cy = Math.round(np.y), cz = Math.round(np.z);
        const key = `${cx}|${cy}|${cz}`;
        let hit = false;
        if (blocks.has(key)){
          hit = true;
          setBlocks((p)=>{ const m = new Map(p);
            const cell = m.get(key);
            if (cell && cell.brick){ const list = bricks.get(cell.brick) || []; for (const k of list) m.delete(k); bricks.delete(cell.brick); }
            return m;
          });
        }
        const nt = b.ttl - dt;
        if (!hit && nt > 0){ next.push({ ...b, pos: np, ttl: nt }); }
      }
      return next;
    });
  });

  return React.createElement('group',null,
    bats.map(b => React.createElement('mesh',{key:b.id, position:b.pos, castShadow:true},
      React.createElement('torusGeometry',{args:[0.15, 0.05, 8, 16]}),
      React.createElement('meshStandardMaterial',{color:"#f1c40f"})
    ))
  );
}

/* -------------------------------- Villains ----------------------------- */
const VILLAIN_LIST = [
  { name:"Joker", color:"#8e24aa" },
  { name:"Riddler", color:"#2e7d32" },
  { name:"Penguin", color:"#0d47a1" },
  { name:"Mr. Freeze", color:"#64b5f6" },
  { name:"Harley", color:"#d32f2f" },
];
function Villains({ count=5, playerPosRef }){
  const refs = useRef([...Array(count)].map(()=>({ pos: new THREE.Vector3(
    (Math.random()*30-15)|0, 0.5, (Math.random()*30-15)|0
  ), dir: Math.random()*Math.PI*2 })));
  const data = useMemo(()=> Array.from({length:count}, (_,i)=> VILLAIN_LIST[i%VILLAIN_LIST.length]), [count]);

  useFrame((_, dt) => {
    const player = playerPosRef.current;
    for (const r of refs.current){
      const toPlayer = new THREE.Vector3(player.x - r.pos.x, 0, player.z - r.pos.z);
      const dist = toPlayer.length();
      if (dist < 4){ toPlayer.normalize(); r.dir = Math.atan2(-toPlayer.x, -toPlayer.z); }
      else if (Math.random() < 0.01){ r.dir += (Math.random()-0.5)*0.8; }
      const speed = 1.3;
      r.pos.x += Math.sin(r.dir) * speed * dt;
      r.pos.z += Math.cos(r.dir) * speed * dt;
      r.pos.y = 0.5;
    }
  });

  return React.createElement('group', null,
    refs.current.map((r,i) =>
      React.createElement('group',{ key:i, position:[r.pos.x, r.pos.y, r.pos.z] },
        React.createElement('mesh',{castShadow:true},
          React.createElement('boxGeometry',{args:[0.8,1.2,0.6]}),
          React.createElement('meshStandardMaterial',{color:data[i].color})
        ),
        React.createElement('mesh',{position:[0,0.8,0.35], castShadow:true},
          React.createElement('boxGeometry',{args:[0.6,0.4,0.02]}),
          React.createElement('meshStandardMaterial',{color:"#000"})
        )
      )
    )
  );
}

/* --------------------------------- UI ---------------------------------- */
function ColorHotbar({ colors, selected, onSelect }){
  return React.createElement('div',{className:'hud'},
    colors.map((c, i) => React.createElement('div',{
      key:c.id, className:`dot ${i===selected?'active':''}`,
      onClick:()=>onSelect(i),
      title:c.label,
      style:{ background: c.color, opacity: c.opacity ?? 1 }
    }))
  );
}
function BrickPreviewSVG({ w, l }) {
  const cell = 10, pad = 6, W = w*cell + pad*2, H = l*cell + pad*2;
  const studs = [];
  for(let x=0;x<w;x++) for(let y=0;y<l;y++) studs.push([pad + x*cell + cell/2, pad + y*cell + cell/2]);
  return React.createElement('svg',{width:84, height:48, viewBox:`0 0 ${W} ${H}`},
    React.createElement('rect',{x:1,y:1,width:W-2,height:H-2,rx:8,ry:8,fill:"rgba(255,255,255,0.06)", stroke:"rgba(255,255,255,0.15)"}),
    studs.map((s,i)=> React.createElement('circle',{ key:i, cx:s[0], cy:s[1], r:2.2, fill:"rgba(255,255,255,0.6)"}))
  );
}
function Sidebar({ open, setOpen, bricks, selectedBrick, onSelectBrick }){
  return open ? React.createElement('div',{className:'sidebar'},
    React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}},
      React.createElement('h2',{style:{fontSize:16,fontWeight:600}},'Klodser'),
      React.createElement('button',{className:'button',onClick:()=>setOpen(false)},'Luk (B)')
    ),
    React.createElement('div',{className:'bricklist'},
      bricks.map(b => React.createElement('div',{
        key:b.id, className:`brick-item ${selectedBrick===b.id?'active':''}`, onClick:()=>onSelectBrick(b.id)
      },
        React.createElement('div',{className:'brick-preview'}, React.createElement(BrickPreviewSVG,{w:b.w, l:b.l})),
        React.createElement('div',null,
          React.createElement('div',{style:{fontWeight:600}}, b.id),
          React.createElement('div',{className:'pill', style:{marginTop:6}}, `${b.w}×${b.l} studs`)
        )
      ))
    ),
    React.createElement('hr',{style:{borderColor:"rgba(255,255,255,.1)", margin:"16px 0"}}),
    React.createElement('p',{style:{fontSize:12,opacity:.7}},'Tip: R roterer aflange klodser • Højreklik fjerner en hel klods • Venstreklik placerer')
  ) : null;
}
function TouchControls(){
  const press = (code, down) => { setKey(code, down); };
  const bind = (code) => ({
    onTouchStart:(e)=>{ e.preventDefault(); press(code,true); },
    onTouchEnd:(e)=>{ e.preventDefault(); press(code,false); },
    onMouseDown:(e)=>{ e.preventDefault(); press(code,true); },
    onMouseUp:(e)=>{ e.preventDefault(); press(code,false); },
  });
  return React.createElement('div',{className:'touch-controls touch-hide-desktop'},
    React.createElement('div',{className:'dpad'},
      React.createElement('div',{className:'arrow up btn',    ...bind("ArrowUp")},    "▲"),
      React.createElement('div',{className:'arrow down btn',  ...bind("ArrowDown")},  "▼"),
      React.createElement('div',{className:'arrow left btn',  ...bind("ArrowLeft")},  "◀"),
      React.createElement('div',{className:'arrow right btn', ...bind("ArrowRight")}, "▶"),
    ),
    React.createElement('div',{className:'jump btn', ...bind(" ")}, "HOP")
  );
}

/* --------------------------------- App --------------------------------- */
function App(){
  const [blocks, setBlocks] = useState(() => {
    const m = new Map();
    // basefliser ved y=0
    for (let x=-12; x<=12; x++) for (let z=-12; z<=12; z++)
      m.set(`${x}|0|${z}`, { pos:[x,0,z], type: (x+z)%2===0?"darkgray":"lightgray", brick: 0 });
    return m;
  });
  const bricks = useMemo(()=> new Map(), []);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [colorIndex, setColorIndex] = useState(DEFAULT_COLOR_INDEX);
  const [selectedBrick, setSelectedBrick] = useState("2x2");
  const [brickRot, setBrickRot] = useState(0);
  const [mode, setMode] = useState("build");
  const [theme, setTheme] = useState("night");
  const [bgOn, setBgOn] = useState(false);
  const [sfxOn, setSfxOn] = useState(true);
  const audio = useAudio();

  useEffect(()=>{ audio.setBGEnabled(bgOn); }, [bgOn]);
  useEffect(()=>{ audio.setSFXEnabled(sfxOn); }, [sfxOn]);

  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if (k === "b") setSidebarOpen(v => !v);
      if (k === "q") setMode(m => m === "build" ? "gadget" : "build");
      if (k === "r") setBrickRot(r => 1 - r);
      const n = parseInt(k, 10);
      if (!isNaN(n) && n >= 1 && n <= COLORS.length) setColorIndex(n-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const playerPos = useRef(vec3(0,0.5,6));

  const getColor = () => COLORS[colorIndex]?.id ?? "yellow";
  const getBrick = () => selectedBrick;
  const getRot = () => brickRot === 1;

  const [showHelp, setShowHelp] = useState(true);
  useEffect(() => { const t = setTimeout(()=>setShowHelp(false), 6000); return () => clearTimeout(t); }, []);

  return React.createElement('div',{style:{width:"100%",height:"100%",position:"relative",background:"#000"}},
    React.createElement(Canvas, { shadows:true, camera:{ position:[0,2,8], fov:60 } },
      React.createElement(GradientSky,{mode:theme}),
      React.createElement(StarsSimple,{count:800, visible: theme==="night"}),
      React.createElement('ambientLight',{intensity: theme==="day" ? 0.9 : 0.5}),
      React.createElement('directionalLight',{position:[5,10,5], intensity: theme==="day" ? 1.2 : 0.8, castShadow:true, color: theme==="day" ? "#ffffff" : "#a0b8ff"}),
      React.createElement(Ground,{groundColor: theme==="day" ? "#3a3a3d" : "#2a2a2d"}),
      React.createElement(Blocks,{blocks}),
      React.createElement(BatmanMinifig,{position:[playerPos.current.x, playerPos.current.y, playerPos.current.z]}),
      React.createElement(PlayerController,{positionRef:playerPos, blocks}),
      React.createElement(CameraRig,{playerPosRef:playerPos}),
      React.createElement(RaycastPlacer,{
        mode, blocks, setBlocks, bricks,
        getColor, getBrick, getRot,
        sfx: sfxOn ? audio.playSFX : null
      }),
      React.createElement(BatarangSystem,{blocks, setBlocks, bricks, sfx: sfxOn ? audio.playSFX : null}),
      React.createElement(Villains,{count:5, playerPosRef:playerPos})
    ),

    React.createElement('div',{className:'crosshair'}),

    React.createElement('div',{className:'topbar-left'},
      React.createElement('button',{className:'button', onClick:()=>setSidebarOpen(v=>!v)}, sidebarOpen?"Skjul":"Klodser (B)"),
      React.createElement('button',{className:'button', onClick:()=>setMode(m=>m==="build"?"gadget":"build")}, `Tilstand: ${mode==="build"?"Byg":"Gadget"} (Q)`),
      React.createElement('button',{className:'button', onClick:()=>setBrickRot(r=>1-r)}, `Rotation (R): ${brickRot? "90°":"0°"}`)
    ),
    React.createElement('div',{className:'topbar-right'},
      React.createElement('button',{className:`toggle ${theme==="day"?"active":""}`, onClick:()=>setTheme(t=>t==="day"?"night":"day")}, theme==="day"?"☀️ Dag":"🌙 Nat"),
      React.createElement('button',{className:`toggle ${bgOn?"active":""}`, onClick:()=>setBgOn(v=>!v)}, bgOn?"🎵 Musik: Til":"🎵 Musik: Fra"),
      React.createElement('button',{className:`toggle ${sfxOn?"active":""}`, onClick:()=>setSfxOn(v=>!v)}, sfxOn?"🔊 SFX: Til":"🔇 SFX: Fra"),
      React.createElement('div',{className:'title', style:{marginLeft:8, textAlign:'right'}},
        React.createElement('div',{style:{color:"rgba(255,255,255,.8)",fontSize:12}},'Stable v5'),
        React.createElement('div',{style:{color:"#fff", fontSize:16, fontWeight:600}},'LEGO Batman – Voxel Builder')
      )
    ),

    showHelp && React.createElement('div',{className:'hint'},
      'WASD/Pile: Bevæg • Space/HOP • B: Sidebar • 1–9: Farve • R: Roter • Q: Byg/Gadget • E: Batarang'
    ),

    React.createElement(Sidebar,{
      open:sidebarOpen,
      setOpen:setSidebarOpen,
      bricks:BRICKS,
      selectedBrick,
      onSelectBrick:setSelectedBrick
    }),

    React.createElement(ColorHotbar,{
      colors:COLORS,
      selected:colorIndex,
      onSelect:setColorIndex
    }),

    React.createElement(TouchControls,null)
  );
}

/* ------------------------------ Mount app ------------------------------ */
createRoot(document.getElementById('root')).render(React.createElement(App));
