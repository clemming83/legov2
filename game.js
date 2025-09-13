// LEGO Batman – Voxel Builder (Safe Mode v8)
// Rettelser: ingen dobbelt-Batman, forbedret physics (step/snap), vertikal byg, hurtig/sikker raycast.

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

/* -------------------------------- World -------------------------------- */
function GradientSky({ mode="night" }) {
  const { gl } = useThree();
  useEffect(() => { gl.setClearColor(new THREE.Color(mode==="day" ? 0x87b6ff : 0x06080f)); }, [gl, mode]);
  return null;
}
function StarsSimple({ count = 300, visible=true }) {
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
function Ground({ size = 400, groundColor="#2a2a2d" }) {
  return (
    React.createElement('mesh',{rotation:[ -Math.PI / 2, 0, 0 ], receiveShadow:true},
      React.createElement('planeGeometry',{args:[size, size, size, size]}),
      React.createElement('meshStandardMaterial',{color:groundColor})
    )
  );
}
function BlockCell({ position, color, transparent=false, opacity=1 }){
  return React.createElement('group',{position},
    React.createElement('mesh',{castShadow:true,receiveShadow:true, userData:{isBlock:true}},
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
  return React.createElement('group',{name:"WorldBlocks"},
    items.map(({pos, type}) => {
      const c = COLORS.find(k=>k.id===type) || COLORS[0];
      return React.createElement(BlockCell, {
        key:`${pos[0]}|${pos[1]}|${pos[2]}`, position:pos,
        color:c.color, transparent:!!c.transparent, opacity:c.opacity ?? 1
      });
    })
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
        if (y < 0) { if (y <= -1) return true; continue; } // gulv
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
    if (!collidesAt(stepped, size, blocks)) return { ok:true, pos: { ...stepped }, stepHeight:h };
  }
  return { ok:false, pos: tryPos, stepHeight:0 };
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
function aabbVsBlocks(next, size, blocks, current, stepHeight=0.6){
  const pos = { x: next.x, y: next.y, z: next.z };

  // X
  let testX = { x: pos.x, y: current.y, z: pos.z };
  let steppedUp = false;
  if (collidesAt(testX, size, blocks)){
    const stepped = tryStepUp(current, testX, size, blocks, stepHeight);
    if (stepped.ok){ testX = stepped.pos; steppedUp = true; }
    else {
      const dir = Math.sign(testX.x - Math.round(testX.x)) || (testX.x>=0?1:-1);
      let n=0; while (collidesAt(testX, size, blocks) && n++<200) testX.x += dir * 0.01;
    }
  }
  pos.x = testX.x; pos.y = testX.y; pos.z = testX.z;

  // Z
  let testZ = { x: pos.x, y: pos.y, z: pos.z };
  if (collidesAt(testZ, size, blocks)){
    const stepped = tryStepUp({x:testZ.x,y:pos.y,z:testZ.z}, testZ, size, blocks, stepHeight);
    if (stepped.ok){ testZ = stepped.pos; steppedUp = true; }
    else {
      const dir = Math.sign(testZ.z - Math.round(testZ.z)) || (testZ.z>=0?1:-1);
      let n=0; while (collidesAt(testZ, size, blocks) && n++<200) testZ.z += dir * 0.01;
    }
  }
  pos.x = testZ.x; pos.y = testZ.y; pos.z = testZ.z;

  // Y
  let testY = { x: pos.x, y: next.y, z: pos.z };
  if (collidesAt(testY, size, blocks)){
    const dir = Math.sign(testY.y - Math.round(testY.y)) || (testY.y >= current.y ? 1 : -1);
    let n=0; while (collidesAt(testY, size, blocks) && n++<2000) testY.y += (dir===0? (testY.y>=0?1:-1):dir) * 0.01;
  }
  pos.y = testY.y;

  // Snap lodret og centrer X/Z hvis vi lige er steppet op på en top → mindre “skub ud”
  snapToTop(pos, size, blocks);
  if (pos.y < size.y/2) pos.y = size.y/2;
  if (steppedUp || pos.y > current.y + 0.19) {
    // center til nærmeste stud-center
    pos.x = Math.round(pos.x);
    pos.z = Math.round(pos.z);
  }
  return pos;
}

/* ------------------------------- Player -------------------------------- */
function BatmanMinifig(){ // Kun én Batman (ingen prop-position; placeres af PlayerController)
  const body = "#151515", cowl = "#0d0d0d", belt = "#f1c40f", gray = "#444";
  return React.createElement('group',null,
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
function PlayerController({ positionRef, blocks }){
  const ref = useRef(null);
  const vel = useRef(vec3(0,0,0));
  const onGround = useRef(true);

  useEffect(() => {
    const onKeyDown = (e) => { setKey(e.key, true); };
    const onKeyUp = (e) => setKey(e.key, false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, []);

  useFrame((_, _dt) => {
    const dt = Math.min(_dt, 1/60); // clamp
    const speed = 3.8, jumpV = 6.4, gravity = 9.8;

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
    const resolved = aabbVsBlocks(next, {x:0.6,y:1.7,z:0.6}, blocks, p, 0.7);

    const wasFalling = v.y < 0;
    const landed = wasFalling && (resolved.y >= p.y) && Math.abs(resolved.y - p.y) < 0.06;

    if (landed){ v.y = 0; onGround.current = true; }
    else {
      const under = { x: resolved.x, y: resolved.y - 0.02, z: resolved.z };
      const touching = collidesAt(under, {x:0.6,y:1.7,z:0.6}, blocks) || resolved.y <= 0.51;
      onGround.current = touching;
      if (touching && v.y < 0) v.y = 0;
    }

    // Lidt friktion når vi står på top → mindre kant-skub
    if (onGround.current){ v.x *= 0.85; v.z *= 0.85; }

    p.x = resolved.x; p.y = resolved.y; p.z = resolved.z;
    if (p.y < 0.5) { p.y = 0.5; v.y = 0; onGround.current = true; }

    if (ref.current) {
      ref.current.position.set(p.x, p.y, p.z);
      ref.current.rotation.y = yaw;
    }
  });

  return React.createElement('group',{ref},
    React.createElement('group',{position:[0,0,0]}, React.createElement(BatmanMinifig,null))
  );
}
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

/* -------------------------- Build helpers ------------------------------ */
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

/* -------- Raycast placer (med face normal → kan bygge ovenpå/sider) ----- */
function RaycastPlacer({ mode, blocks, setBlocks, bricks, getColor, getBrick, getRot, worldRef }){
  const { camera } = useThree();
  const raycaster = useMemo(()=> new THREE.Raycaster(), []);
  const pointer = useMemo(()=> new THREE.Vector2(), []);
  useEffect(() => {
    const onContext = (e) => e.preventDefault();
    const el = worldRef.current?.parent?.parent?.__r3f?.root?.gl?.domElement || document.querySelector("canvas");
    el?.addEventListener("contextmenu", onContext);
    return () => el?.removeEventListener("contextmenu", onContext);
  }, [worldRef]);

  const cast = (clientX, clientY) => {
    const canvas = document.querySelector("canvas");
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const root = worldRef.current;
    const hits = root ? raycaster.intersectObject(root, true) : [];
    return hits;
  };

  const handlePointerDown = (e) => {
    if (mode !== "build") return;
    const hits = cast(e.clientX, e.clientY);
    const colorId = getColor();
    const brick = BRICK_MAP.get(getBrick());
    const rot = getRot();

    if (e.button === 2) { // fjern
      if (hits.length > 0) {
        // gå op til nærmeste gruppe med position = cell
        let obj = hits[0].object;
        while (obj && !obj.parent?.position) obj = obj.parent;
        if (!obj) return;
        const pos = obj.parent?.position || obj.position;
        const cx = Math.round(pos.x), cy = Math.round(pos.y), cz = Math.round(pos.z);
        setBlocks(prev => {
          const nb = new Map(prev);
          removeBrickAtCell(cx,cy,cz, nb, bricks);
          return nb;
        });
      }
      return;
    }

    if (hits.length > 0) {
      const hit = hits[0];
      const faceN = hit.face?.normal?.clone() ?? new THREE.Vector3(0,1,0);
      const nrm = faceN.applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();

      // placér på cellen ved at flytte 0.5 i normal-retning og snappe til grid
      const place = hit.point.clone().add(nrm.multiplyScalar(0.5)).floor().addScalar(0.5);
      const base = { x: Math.round(place.x), y: Math.round(place.y), z: Math.round(place.z) };

      setBlocks(prev => {
        const nb = new Map(prev);
        addBrickAt(base, brick, colorId, rot, nb, bricks);
        return nb;
      });
      return;
    }

    // fallback: ramte kun jorden (y=0 plane)
    const canvas = document.querySelector("canvas");
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera({x,y}, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
    const p = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, p);
    if (p) {
      const base = { x: Math.round(p.x), y: 0, z: Math.round(p.z) };
      setBlocks(prev => {
        const nb = new Map(prev);
        addBrickAt(base, brick, colorId, rot, nb, bricks);
        return nb;
      });
    }
  };

  useEffect(() => {
    const canvas = document.querySelector("canvas");
    canvas?.addEventListener("mousedown", handlePointerDown);
    return () => canvas?.removeEventListener("mousedown", handlePointerDown);
  }, [mode, worldRef, getColor, getBrick, getRot]);

  return null;
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
    React.createElement('p',{style:{fontSize:12,opacity:.7}},'Tip: R roterer aflange klodser • Højreklik fjerner • Venstreklik placerer')
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

  const worldRef = useRef(); // alle blokke i én gruppe
  const playerPos = useRef(vec3(0,0.5,6));

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

  const getColor = () => COLORS[colorIndex]?.id ?? "yellow";
  const getBrick = () => selectedBrick;
  const getRot = () => brickRot === 1;

  const [showHelp, setShowHelp] = useState(true);
  useEffect(() => { const t = setTimeout(()=>setShowHelp(false), 6000); return () => clearTimeout(t); }, []);

  return React.createElement('div',{style:{width:"100%",height:"100%",position:"relative",background:"#000"}},
    React.createElement(Canvas, {
      shadows:true,
      camera:{ position:[0,2,8], fov:60 },
      dpr:[1, 1.5],
      gl:{ antialias:false, powerPreference:"high-performance", alpha:false, stencil:false, depth:true, preserveDrawingBuffer:false }
    },
      React.createElement(GradientSky,{mode:theme}),
      React.createElement(StarsSimple,{count: 300, visible: theme==="night"}),
      React.createElement('ambientLight',{intensity: theme==="day" ? 0.9 : 0.5}),
      React.createElement('directionalLight',{position:[5,10,5], intensity: theme==="day" ? 1.2 : 0.8, castShadow:true, color: theme==="day" ? "#ffffff" : "#a0b8ff"}),

      React.createElement('group',{ref:worldRef},
        React.createElement(Ground,{groundColor: theme==="day" ? "#3a3a3d" : "#2a2a2d"}),
        React.createElement(Blocks,{blocks})
      ),

      React.createElement(PlayerController,{positionRef:playerPos, blocks}),
      React.createElement(CameraRig,{playerPosRef:playerPos}),
      React.createElement(RaycastPlacer,{ mode, blocks, setBlocks, bricks, getColor, getBrick, getRot, worldRef })
    ),

    React.createElement('div',{className:'crosshair'}),

    React.createElement('div',{className:'topbar-left'},
      React.createElement('button',{className:'button', onClick:()=>setSidebarOpen(v=>!v)}, sidebarOpen?"Skjul":"Klodser (B)"),
      React.createElement('button',{className:'button', onClick:()=>setMode(m=>m==="build"?"gadget":"build")}, `Tilstand: ${mode==="build"?"Byg":"Gadget"} (Q)`),
      React.createElement('button',{className:'button', onClick:()=>setBrickRot(r=>1-r)}, `Rotation (R): ${brickRot? "90°":"0°"}`)
    ),
    React.createElement('div',{className:'topbar-right'},
      React.createElement('button',{className:`toggle ${theme==="day"?"active":""}`, onClick:()=>setTheme(t=>t==="day"?"night":"day")}, theme==="day"?"☀️ Dag":"🌙 Nat"),
      React.createElement('div',{className:'title', style:{marginLeft:8, textAlign:'right'}},
        React.createElement('div',{style:{color:"rgba(255,255,255,.8)",fontSize:12}},'Safe v8'),
        React.createElement('div',{style:{color:"#fff", fontSize:16, fontWeight:600}},'LEGO Batman – Voxel Builder')
      )
    ),

    showHelp && React.createElement('div',{className:'hint'},
      'WASD/Pile: Bevæg • Space/HOP • B: Sidebar • 1–9: Farve • R: Roter • Q: Byg/Gadget • Venstreklik: byg • Højreklik: fjern'
    ),

    React.createElement(Sidebar,{ open:sidebarOpen, setOpen:setSidebarOpen, bricks:BRICKS, selectedBrick, onSelectBrick:setSelectedBrick }),
    React.createElement(ColorHotbar,{ colors:COLORS, selected:colorIndex, onSelect:setColorIndex }),
    React.createElement(TouchControls,null)
  );
}

/* ------------------------------ Mount app ------------------------------ */
createRoot(document.getElementById('root')).render(React.createElement(App));
