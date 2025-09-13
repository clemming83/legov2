// LEGO Batman – Voxel Builder (Safe v11)
// Fixes: præcis top-snap (kan stå på klodser), ingen svæven, auto-center på top,
// roligere kamera, og simpel ben-animering ved gang.

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
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const EPS = 1e-4;

/* ------------------------------- Farver -------------------------------- */
const COLORS = [
  { id: "black",     label: "Black",  color: "#111111" },
  { id: "darkgray",  label: "Dark Gray", color: "#3a3a3a" },
  { id: "lightgray", label: "Light Gray", color: "#9aa0a6" },
  { id: "yellow",    label: "Yellow", color: "#ffd400" },
  { id: "blue",      label: "Blue",   color: "#1565c0" },
  { id: "purple",    label: "Purple", color: "#6a1b9a" },
  { id: "red",       label: "Red",    color: "#d32f2f" },
  { id: "green",     label: "Green",  color: "#2e7d32" },
  { id: "white",     label: "White",  color: "#eeeeee" },
  { id: "trans",     label: "Translucent", color: "#a0d8ff", transparent: true, opacity: 0.5 },
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
function StarsSimple({ count = 250, visible=true }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i=0;i<count;i++){
      const r = 90 + Math.random()*110;
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
    React.createElement('pointsMaterial',{size:0.45, sizeAttenuation:true, color:"#9fc9ff"})
  );
}
function Ground({ size = 400, groundColor="#2a2a2d" }) {
  // Lidt under y=0 for at undgå z-fighting med tiles
  return (
    React.createElement('mesh',{position:[0,-0.51,0], rotation:[ -Math.PI / 2, 0, 0 ], receiveShadow:true},
      React.createElement('planeGeometry',{args:[size, size, size, size]}),
      React.createElement('meshStandardMaterial',{color:groundColor})
    )
  );
}
function BlockCell({ position, color, transparent=false, opacity=1, tile=false }){
  if (tile) {
    return React.createElement('group',{position},
      React.createElement('mesh',{castShadow:false,receiveShadow:true, userData:{isTile:true}},
        React.createElement('boxGeometry',{args:[1,0.06,1]}),
        React.createElement('meshStandardMaterial',{color,transparent,opacity})
      )
    );
  }
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
    items.map(({pos, type, tile}) => {
      const c = COLORS.find(k=>k.id===type) || COLORS[0];
      return React.createElement(BlockCell, {
        key:`${pos[0]}|${pos[1]}|${pos[2]}`,
        position: tile ? [pos[0], 0.03, pos[2]] : pos,
        color:c.color, transparent:!!c.transparent, opacity:c.opacity ?? 1, tile: !!tile
      });
    })
  );
}

/* ----------------------- Collision/physics (robust) --------------------- */
let currentYaw = 0;

/** Returnerer true hvis spiller-AABB overlapper en solid celle */
function collidesAt(p, size, blocks){
  const half = { x: size.x/2, y: size.y/2, z: size.z/2 };
  const minX = Math.floor(p.x - half.x + EPS), maxX = Math.floor(p.x + half.x - EPS);
  const minY = Math.floor(p.y - half.y + EPS), maxY = Math.floor(p.y + half.y - EPS);
  const minZ = Math.floor(p.z - half.z + EPS), maxZ = Math.floor(p.z + half.z - EPS);
  for (let x=minX; x<=maxX; x++){
    for (let y=minY; y<=maxY; y++){
      for (let z=minZ; z<=maxZ; z++){
        if (y < 0) return true; // under gulv er solid
        const cell = blocks.get(`${x}|${y}|${z}`);
        if (cell && cell.solid === true) return true;
      }
    }
  }
  return false;
}

/** Højden (y) på øverste solide celle under (cx,cz); eller -Infinity hvis ingen */
function supportTopAt(cx, cz, blocks){
  // Søg et lille interval omkring nul og opad nogle lag
  let top = -Infinity;
  for (let y=-1; y<=32; y++){
    const c = blocks.get(`${cx}|${y}|${cz}`);
    if (c && c.solid === true) top = Math.max(top, y + 1);
  }
  return top;
}

/** Aksial sweep-resolve + præcis top-snap */
function resolveMovement(p, v, dt, size, blocks, prevPos){
  const next = { x: p.x + v.x * dt, y: p.y + v.y * dt, z: p.z + v.z * dt };

  // 1) X-akse
  let test = { x: next.x, y: p.y, z: p.z };
  if (collidesAt(test, size, blocks)){
    const dir = Math.sign(test.x - p.x) || 1;
    // skub ud til cellegrænse
    test.x = Math.floor(test.x + (dir>0 ? size.x/2 : -size.x/2)) + (dir>0 ? 0.5 - size.x/2 : 0.5 + size.x/2);
    while (collidesAt(test, size, blocks)) test.x -= dir * 0.01;
  }
  p.x = test.x;

  // 2) Z-akse
  test = { x: p.x, y: p.y, z: next.z };
  if (collidesAt(test, size, blocks)){
    const dir = Math.sign(test.z - p.z) || 1;
    test.z = Math.floor(test.z + (dir>0 ? size.z/2 : -size.z/2)) + (dir>0 ? 0.5 - size.z/2 : 0.5 + size.z/2);
    while (collidesAt(test, size, blocks)) test.z -= dir * 0.01;
  }
  p.z = test.z;

  // 3) Y-akse
  test = { x: p.x, y: next.y, z: p.z };
  let hitY = false;
  if (collidesAt(test, size, blocks)){
    hitY = true;
    const dir = Math.sign(test.y - p.y) || 1; // op eller ned
    if (dir > 0){
      // hoved i loft → klem lige under loftet
      test.y = Math.floor(test.y + size.y/2) + 0.5 - size.y/2 - EPS;
      while (collidesAt(test, size, blocks)) test.y -= 0.005;
      v.y = Math.min(v.y, 0);
    } else {
      // land på top: snap til præcis top af støttecellen
      const cx = Math.round(p.x), cz = Math.round(p.z);
      const topY = supportTopAt(cx, cz, blocks);
      if (topY !== -Infinity){
        test.y = topY + size.y/2; // top af cellen + halv spillerhøjde
        while (collidesAt(test, size, blocks)) test.y += 0.002;
      } else {
        // ingen støtte, skub op til lige over gulv ved behov
        test.y = Math.max(test.y, 0 + size.y/2);
      }
      v.y = 0;
    }
  }
  p.y = test.y;

  // 4) Når vi står (v.y≈0, og støtte under os) → auto-center langsomt ind til cellens center
  const cx = Math.round(p.x), cz = Math.round(p.z);
  const topY = supportTopAt(cx, cz, blocks);
  const onTop = topY !== -Infinity && Math.abs((topY + size.y/2) - p.y) < 0.08;
  if (onTop){
    const targetX = cx, targetZ = cz;
    p.x = THREE.MathUtils.lerp(p.x, targetX, 0.35); // glid ind til center → ingen “skub ud”
    p.z = THREE.MathUtils.lerp(p.z, targetZ, 0.35);
  }

  // 5) Gulv-sikkerhed
  if (p.y < size.y/2) p.y = size.y/2;

  // Returner om vi står “på noget”
  return { onGround: onTop };
}

/* ------------------------------- Player -------------------------------- */
function BatmanMinifig({ legRefs }){
  const body = "#151515", cowl = "#0d0d0d", belt = "#f1c40f", gray = "#444";
  return React.createElement('group',null,
    // Ben (referencer til animation)
    React.createElement('mesh',{ref:legRefs.left, position:[ -0.15, 0.25, 0 ], castShadow:true},
      React.createElement('boxGeometry',{args:[0.25,0.5,0.35]}),
      React.createElement('meshStandardMaterial',{color:gray})
    ),
    React.createElement('mesh',{ref:legRefs.right, position:[ 0.15, 0.25, 0 ], castShadow:true},
      React.createElement('boxGeometry',{args:[0.25,0.5,0.35]}),
      React.createElement('meshStandardMaterial',{color:gray})
    ),
    // Torso/arm/segl
    React.createElement('mesh',{position:[0, 0.85, 0], castShadow:true}, React.createElement('boxGeometry',{args:[0.6,0.7,0.35]}), React.createElement('meshStandardMaterial',{color:body})),
    React.createElement('mesh',{position:[0, 0.55, 0], castShadow:true}, React.createElement('boxGeometry',{args:[0.62,0.1,0.37]}), React.createElement('meshStandardMaterial',{color:belt})),
    React.createElement('mesh',{position:[ -0.45, 0.85, 0 ], castShadow:true}, React.createElement('boxGeometry',{args:[0.2,0.5,0.2]}), React.createElement('meshStandardMaterial',{color:body})),
    React.createElement('mesh',{position:[ 0.45, 0.85, 0 ], castShadow:true}, React.createElement('boxGeometry',{args:[0.2,0.5,0.2]}), React.createElement('meshStandardMaterial',{color:body})),
    // Hoved + ører + kappe
    React.createElement('mesh',{position:[0, 1.35, 0], castShadow:true}, React.createElement('boxGeometry',{args:[0.35,0.35,0.3]}), React.createElement('meshStandardMaterial',{color:cowl})),
    React.createElement('mesh',{position:[ -0.12, 1.6, 0 ], castShadow:true}, React.createElement('boxGeometry',{args:[0.07,0.15,0.07]}), React.createElement('meshStandardMaterial',{color:cowl})),
    React.createElement('mesh',{position:[ 0.12, 1.6, 0 ], castShadow:true}, React.createElement('boxGeometry',{args:[0.07,0.15,0.07]}), React.createElement('meshStandardMaterial',{color:cowl})),
    React.createElement('mesh',{position:[0, 0.9, -0.23], castShadow:true}, React.createElement('boxGeometry',{args:[0.6,0.8,0.02]}), React.createElement('meshStandardMaterial',{color:cowl}))
  );
}

function PlayerController({ positionRef, blocks }){
  const ref = useRef(null);
  const vel = useRef(vec3(0,0,0));
  const onGroundRef = useRef(true);
  const walkPhase = useRef(0);
  const legLeft = useRef(null);
  const legRight = useRef(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if ([" ", "space", "arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"].includes(k)) e.preventDefault();
      setKey(e.key, true);
    };
    const onKeyUp = (e) => setKey(e.key, false);
    window.addEventListener("keydown", onKeyDown, { passive:false });
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useFrame((state, _dt) => {
    const dt = Math.min(_dt, 1/60);
    const speedMax = 4.2, jumpV = 6.6, gravity = 12.0;

    // input
    let forward = 0, strafe = 0;
    if (isDown("arrowup") || isDown("w")) forward += 1;
    if (isDown("arrowdown") || isDown("s")) forward -= 1;
    if (isDown("arrowleft") || isDown("a")) strafe -= 1;
    if (isDown("arrowright") || isDown("d")) strafe += 1;

    if (isDown("arrowleft") && !isDown("a")) currentYaw += 1.7 * dt;
    if (isDown("arrowright") && !isDown("d")) currentYaw -= 1.7 * dt;

    // bevægelsesvektor i verdensrum
    const yaw = currentYaw;
    const wish = new THREE.Vector3(strafe, 0, -forward);
    if (wish.lengthSq()>0) wish.normalize();
    wish.applyAxisAngle(new THREE.Vector3(0,1,0), yaw);

    const v = vel.current;
    const accel = 12.0;
    v.x = THREE.MathUtils.lerp(v.x, wish.x * speedMax, 1 - Math.exp(-accel * dt));
    v.z = THREE.MathUtils.lerp(v.z, wish.z * speedMax, 1 - Math.exp(-accel * dt));
    v.y += -gravity * dt;

    // hop
    if (onGroundRef.current && (isDown(" ") || isDown("space"))) { v.y = jumpV; onGroundRef.current = false; }

    // resolve
    const p = positionRef.current;
    const prev = { x:p.x, y:p.y, z:p.z };
    const res = resolveMovement(p, v, dt, {x:0.6,y:1.7,z:0.6}, blocks, prev);
    onGroundRef.current = res.onGround;

    // friktion når vi står
    if (onGroundRef.current){
      v.x *= 0.82; v.z *= 0.82;
    }

    // opdater mesh
    if (ref.current) {
      ref.current.position.set(p.x, p.y, p.z);
      ref.current.rotation.y = yaw;
    }

    // Walk cycle (ben)
    const planarSpeed = Math.hypot(v.x, v.z);
    const moving = planarSpeed > 0.15 && onGroundRef.current;
    const targetSpeed = clamp((planarSpeed / speedMax), 0, 1);
    walkPhase.current += (moving ? 10 : 6) * dt * (0.5 + 0.5*targetSpeed);
    const amp = moving ? (0.6 * targetSpeed) : 0;
    const leftAng = Math.sin(walkPhase.current) * amp;
    const rightAng = -leftAng;

    if (legLeft.current)  legLeft.current.rotation.x = leftAng;
    if (legRight.current) legRight.current.rotation.x = rightAng;
  });

  return React.createElement('group',{ref},
    React.createElement('group',{position:[0,0,0]}, React.createElement(BatmanMinifig,{ legRefs:{left:legLeft, right:legRight} }))
  );
}

function CameraRig({ playerPosRef }){
  const { camera } = useThree();
  const smooth = useRef(new THREE.Vector3());
  useFrame(() => {
    const p = playerPosRef.current;
    // roligt chase-cam
    const offset = new THREE.Vector3(0, 1.95, 4.5).applyAxisAngle(new THREE.Vector3(0,1,0), currentYaw);
    const target = new THREE.Vector3(p.x, p.y + 0.95, p.z);
    const desired = target.clone().add(offset);
    smooth.current.lerp(desired, 0.12);
    camera.position.copy(smooth.current);
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
      const existing = blocks.get(key);
      if (existing && existing.solid === true) return false;   // optaget
      cells.push({cx,cy,cz,key});
    }
  }
  // Erstat evt. tiles (solid:false) ved y=0
  for (const c of cells) blocks.set(c.key, { pos:[c.cx,c.cy,c.cz], type: colorId, brick:id, solid:true, tile:false });
  bricks.set(id, cells.map(c=>c.key));
  return true;
}
function removeBrickAtCell(cx,cy,cz, blocks, bricks){
  const key = toKey(cx,cy,cz);
  const cell = blocks.get(key);
  if (!cell || cell.solid !== true) return false; // fjern kun ægte klodser
  const id = cell.brick;
  const list = bricks.get(id) || [];
  for (const k of list) blocks.delete(k);
  bricks.delete(id);
  return true;
}

/* -------- Raycast placer (face normal → byg ovenpå/sider) -------------- */
function RaycastPlacer({ mode, blocks, setBlocks, bricks, getColor, getBrick, getRot, worldRef }){
  const { camera } = useThree();
  const raycaster = useMemo(()=> new THREE.Raycaster(), []);
  const pointer = useMemo(()=> new THREE.Vector2(), []);

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
      const place = hit.point.clone().add(nrm.multiplyScalar(0.5)).floor().addScalar(0.5);
      const base = { x: Math.round(place.x), y: Math.round(place.y), z: Math.round(place.z) };

      setBlocks(prev => {
        const nb = new Map(prev);
        addBrickAt(base, brick, colorId, rot, nb, bricks);
        return nb;
      });
      return;
    }

    // fallback: jorden
    const canvas = document.querySelector("canvas");
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera({x,y}, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
    const p = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, p);
    if (p) {
      const base = { x: Math.round(p.x), y: 1, z: Math.round(p.z) };
      setBlocks(prev => {
        const nb = new Map(prev);
        addBrickAt(base, brick, colorId, rot, nb, bricks);
        return nb;
      });
    }
  };

  useEffect(() => {
    const canvas = document.querySelector("canvas");
    const onContext = (ev) => ev.preventDefault();
    canvas?.addEventListener("mousedown", handlePointerDown);
    canvas?.addEventListener("contextmenu", onContext);
    return () => {
      canvas?.removeEventListener("mousedown", handlePointerDown);
      canvas?.removeEventListener("contextmenu", onContext);
    };
  }, [mode, worldRef, getColor, getBrick, getRot]);

  return null;
}

/* --------------------------------- UI ---------------------------------- */
function ColorHotbar({ colors, selected, onSelect }){
  return React.createElement('div',{style:{
    display:"flex", gap:8, padding:10, borderRadius:16, background:"rgba(0,0,0,0.35)", backdropFilter:"blur(6px)"
  }},
    colors.map((c, i) => React.createElement('div',{
      key:c.id,
      onClick:()=>onSelect(i),
      title:c.label,
      style:{
        width:28, height:28, borderRadius:999, border:"2px solid rgba(255,255,255,.4)",
        background:c.color, opacity:c.opacity ?? 1, cursor:"pointer",
        outline: i===selected ? "2px solid #fff" : "none"
      }
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
  if (!open) return null;
  return React.createElement('div',{style:{
    position:"absolute", top:0, left:0, height:"100%", width:320, background:"rgba(24,24,27,.92)", color:"#fff",
    padding:16, overflowY:"auto", backdropFilter:"blur(6px)", boxShadow:"0 0 24px rgba(0,0,0,.5)", borderRight:"1px solid rgba(255,255,255,.08)"
  }},
    React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}},
      React.createElement('h2',{style:{fontSize:16,fontWeight:600, margin:0}},'Klodser'),
      React.createElement('button',{onMouseDown:(e)=>e.preventDefault(), tabIndex:-1, onClick:()=>setOpen(false), style:btnU()},'Luk (B)')
    ),
    React.createElement('div',{style:{display:"grid", gridTemplateColumns:"1fr", gap:10}},
      bricks.map(b => React.createElement('div',{
        key:b.id, onClick:()=>onSelectBrick(b.id),
        style:{display:"flex",alignItems:"center",gap:12, background:"rgba(255,255,255,.05)", padding:10, borderRadius:12, border:"1px solid rgba(255,255,255,.1)", cursor:"pointer", outline: selectedBrick===b.id ? "2px solid #fff" : "none"}
      },
        React.createElement('div',{style:{width:84,height:48,borderRadius:10, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", display:"grid", placeItems:"center"}}, React.createElement(BrickPreviewSVG,{w:b.w, l:b.l})),
        React.createElement('div',null,
          React.createElement('div',{style:{fontWeight:600}}, b.id),
          React.createElement('div',{style:{marginTop:6, padding:"6px 10px", borderRadius:999, border:"1px solid rgba(255,255,255,.25)", background:"rgba(255,255,255,.08)"}}, `${b.w}×${b.l} studs`)
        )
      ))
    ),
    React.createElement('hr',{style:{borderColor:"rgba(255,255,255,.1)", margin:"16px 0"}}),
    React.createElement('p',{style:{fontSize:12,opacity:.7}},'Tip: R roterer aflange klodser • Højreklik fjerner • Venstreklik placerer')
  );
}
function TouchControls(){
  const press = (code, down) => { setKey(code, down); };
  const bind = (code) => ({
    onTouchStart:(e)=>{ e.preventDefault(); press(code,true); },
    onTouchEnd:(e)=>{ e.preventDefault(); press(code,false); },
    onMouseDown:(e)=>{ e.preventDefault(); press(code,true); },
    onMouseUp:(e)=>{ e.preventDefault(); press(code,false); },
  });
  return React.createElement('div',{style:{position:"absolute", right:16, bottom:16, display:"flex", gap:10, alignItems:"flex-end"}},
    React.createElement('div',{style:{width:140, height:140, position:"relative"}},
      React.createElement('div',{...bind("ArrowUp"),    style:btnStyle(42,0)}, "▲"),
      React.createElement('div',{...bind("ArrowDown"),  style:btnStyle(42,84)}, "▼"),
      React.createElement('div',{...bind("ArrowLeft"),  style:btnStyle(0,42)}, "◀"),
      React.createElement('div',{...bind("ArrowRight"), style:btnStyle(84,42)}, "▶"),
    ),
    React.createElement('div',{...bind(" "), style:{
      width:88, height:88, borderRadius:18, background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.3)", display:"grid", placeItems:"center", fontWeight:700, userSelect:"none"
    }}, "HOP")
  );
}
function btnStyle(left, top){
  return {
    position:"absolute", left, top, width:56, height:56,
    background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.25)",
    borderRadius:12, display:"grid", placeItems:"center", fontSize:20, userSelect:"none", cursor:"pointer"
  };
}
function btnU(){
  return { padding:"8px 12px", borderRadius:12, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.2)", color:"#fff", cursor:"pointer" };
}

/* --------------------------------- App --------------------------------- */
function App(){
  const [blocks, setBlocks] = useState(() => {
    const m = new Map();
    // Base: dekorative tiles ved y=0 (ikke solide)
    for (let x=-12; x<=12; x++) for (let z=-12; z<=12; z++){
      m.set(`${x}|0|${z}`, { pos:[x,0,z], type: (x+z)%2===0?"darkgray":"lightgray", brick: -1, solid:false, tile:true });
    }
    return m;
  });
  const bricks = useMemo(()=> new Map(), []);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [colorIndex, setColorIndex] = useState(DEFAULT_COLOR_INDEX);
  const [selectedBrick, setSelectedBrick] = useState("2x2");
  const [brickRot, setBrickRot] = useState(0);
  const [mode, setMode] = useState("build");
  const [theme, setTheme] = useState("night");

  const worldRef = useRef();
  const playerPos = useRef(vec3(0,1.1,6));

  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if ([" ", "space", "arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"].includes(k)) e.preventDefault();
      if (k === "b") setSidebarOpen(v => !v);
      if (k === "q") setMode(m => m === "build" ? "gadget" : "build");
      if (k === "r") setBrickRot(r => 1 - r);
      const n = parseInt(k, 10);
      if (!isNaN(n) && n >= 1 && n <= COLORS.length) setColorIndex(n-1);
    };
    window.addEventListener("keydown", onKey, { passive:false });
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const getColor = () => COLORS[colorIndex]?.id ?? "yellow";
  const getBrick = () => selectedBrick;
  const getRot = () => brickRot === 1;

  const [showHelp, setShowHelp] = useState(true);
  useEffect(() => { const t = setTimeout(()=>setShowHelp(false), 6000); return () => clearTimeout(t); }, []);

  const btnPropsNoFocus = { tabIndex:-1, onMouseDown:(e)=>e.preventDefault() };

  return React.createElement('div',{style:{width:"100%",height:"100%",position:"relative",background:"#000", color:"#fff", fontFamily:"system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"}},
    React.createElement(Canvas, {
      shadows:true,
      camera:{ position:[0,2,8], fov:60 },
      dpr:[1, 1.5],
      gl:{ antialias:false, powerPreference:"high-performance", alpha:false, stencil:false, depth:true, preserveDrawingBuffer:false }
    },
      React.createElement(GradientSky,{mode:theme}),
      React.createElement(StarsSimple,{count: 250, visible: theme==="night"}),
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

    // HUD + version
    React.createElement('div',{style:{position:"absolute", top:16, right:16, display:"flex", gap:8, alignItems:"center"}},
      React.createElement('button',{...btnPropsNoFocus, onClick:()=>setTheme(t=>t==="day"?"night":"day"),
        style:toggleStyle(theme==="day")}, theme==="day"?"☀️ Dag":"🌙 Nat"),
      React.createElement('div',{style:{textAlign:'right'}},
        React.createElement('div',{style:{color:"rgba(255,255,255,.8)",fontSize:12}},'Safe v11'),
        React.createElement('div',{style:{color:"#fff", fontSize:16, fontWeight:600}},'LEGO Batman – Voxel Builder')
      )
    ),

    React.createElement('div',{style:{position:"absolute", top:16, left:16, display:"flex", gap:8, flexWrap:"wrap"}},
      React.createElement('button',{...btnPropsNoFocus, onClick:()=>setSidebarOpen(v=>!v), style:btnU()},
        sidebarOpen?"Skjul":"Klodser (B)"),
      React.createElement('button',{...btnPropsNoFocus, onClick:()=>setMode(m=>m==="build"?"gadget":"build"), style:btnU()},
        `Tilstand: ${mode==="build"?"Byg":"Gadget"} (Q)`),
      React.createElement('button',{...btnPropsNoFocus, onClick:()=>setBrickRot(r=>1-r), style:btnU()},
        `Rotation (R): ${brickRot? "90°":"0°"}`)
    ),

    React.createElement('div',{style:{position:"absolute", left:"50%", transform:"translateX(-50%)", bottom:16}},
      React.createElement(ColorHotbar,{ colors:COLORS, selected:colorIndex, onSelect:setColorIndex })
    ),

    React.createElement('div',{style:{position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)", width:16, height:16, borderRadius:999, border:"1px solid rgba(255,255,255,0.7)", pointerEvents:"none"}}),

    React.createElement(Sidebar,{ open:sidebarOpen, setOpen:setSidebarOpen, bricks:BRICKS, selectedBrick, onSelectBrick:setSelectedBrick }),
    React.createElement(TouchControls,null),

    showHelp && React.createElement('div',{style:{position:"absolute", top:16, left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,.5)", padding:"8px 12px", borderRadius:12, fontSize:13}},
      'WASD/Pile: Bevæg • Space/HOP • B: Sidebar • 1–9: Farve • R: Roter • Q: Byg/Gadget • Venstreklik: byg • Højreklik: fjern'
    )
  );
}
function toggleStyle(active){
  return { padding:"6px 10px", borderRadius:10, border:"1px solid rgba(255,255,255,.25)", background:"rgba(255,255,255,.08)", cursor:"pointer", outline: active ? "2px solid #fff" : "none" };
}

/* ------------------------------ Mount app ------------------------------ */
createRoot(document.getElementById('root')).render(React.createElement(App));
