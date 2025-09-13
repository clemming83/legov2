
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Sky, Stars, PointerLockControls } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";

/**
 * LEGO Batman Voxel Prototype — v2
 *
 * Nyheder i denne version:
 * ✅ First-person toggle (F1) med Pointer Lock (klik i canvas for at låse/åbne)
 * ✅ Grundlæggende kollision mod blokke (AABB) så spilleren ikke går gennem byggeri
 * ✅ Gadget: Batarang (E) – kastes frem og fjerner første blok den rammer
 * ✅ Bygge-/Gadget-tilstand (Q) — skift mellem Byg og Gadget uden at åbne sidebar
 *
 * Stadig med:
 * - 3D voxel-bygning, hotbar (1–9), sidebar (B), WASD/piletaster + hop (Space)
 *
 * Note: Ingen officielle LEGO-aktiver — alt er originale, stiliserede former.
 */

// ---------- Utils ----------
const keyState = new Map();
const setKey = (code, down) => keyState.set(code.toLowerCase(), down);
const isDown = (code) => keyState.get(code.toLowerCase()) === true;

const vec3 = (x=0,y=0,z=0) => ({x,y,z});
const toKey = (x,y,z) => `${x}|${y}|${z}`;

// Block palette
const BLOCK_TYPES = [
  { id: "black", label: "Black", color: "#111111" },
  { id: "darkgray", label: "Dark Gray", color: "#3a3a3a" },
  { id: "lightgray", label: "Light Gray", color: "#9aa0a6" },
  { id: "yellow", label: "Yellow", color: "#ffd400" },
  { id: "blue", label: "Blue", color: "#1565c0" },
  { id: "purple", label: "Purple", color: "#6a1b9a" },
  { id: "transparent", label: "Translucent", color: "#a0d8ff", transparent: true, opacity: 0.5 },
];

// Hotbar defaults (9 slots)
const DEFAULT_HOTBAR = ["black","darkgray","lightgray","yellow","blue","purple","transparent","black","yellow"];

// ---------- 3D Components ----------
function Ground({ size = 200 }) {
  const { scene } = useThree();
  useEffect(() => { scene.fog = null; }, [scene]);
  return (
    <mesh rotation={[ -Math.PI / 2, 0, 0 ]} receiveShadow>
      <planeGeometry args={[size, size, size, size]} />
      <meshStandardMaterial color="#2a2a2d" />
    </mesh>
  );
}

function BlockMesh({ position, color, transparent=false, opacity=1 }){
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1,1,1]} />
        <meshStandardMaterial color={color} transparent={transparent} opacity={opacity} />
      </mesh>
      {[-0.25, 0.25].map((sx) => (
        [-0.25, 0.25].map((sz) => (
          <mesh key={`${sx}-${sz}`} position={[sx, 0.55, sz]} castShadow>
            <cylinderGeometry args={[0.12,0.12,0.1,16]} />
            <meshStandardMaterial color={color} transparent={transparent} opacity={opacity} />
          </mesh>
        ))
      ))}
    </group>
  );
}

function Blocks({ blocks }){
  const items = [...blocks.values()];
  return (
    <group>
      {items.map(({pos, type}) => {
        const bt = BLOCK_TYPES.find(b=>b.id===type) || BLOCK_TYPES[0];
        return (
          <BlockMesh key={`${pos[0]}|${pos[1]}|${pos[2]}`} position={pos} color={bt.color} transparent={!!bt.transparent} opacity={bt.opacity ?? 1} />
        );
      })}
    </group>
  );
}

function BatmanMinifig({ position }){
  const body = "#151515";
  const cowl = "#0d0d0d";
  const belt = "#f1c40f";
  const gray = "#444";
  return (
    <group position={position}>
      <mesh position={[ -0.15, 0.25, 0 ]} castShadow>
        <boxGeometry args={[0.25,0.5,0.35]} />
        <meshStandardMaterial color={gray} />
      </mesh>
      <mesh position={[ 0.15, 0.25, 0 ]} castShadow>
        <boxGeometry args={[0.25,0.5,0.35]} />
        <meshStandardMaterial color={gray} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[0.6,0.7,0.35]} />
        <meshStandardMaterial color={body} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.62,0.1,0.37]} />
        <meshStandardMaterial color={belt} />
      </mesh>
      <mesh position={[ -0.45, 0.85, 0 ]} castShadow>
        <boxGeometry args={[0.2,0.5,0.2]} />
        <meshStandardMaterial color={body} />
      </mesh>
      <mesh position={[ 0.45, 0.85, 0 ]} castShadow>
        <boxGeometry args={[0.2,0.5,0.2]} />
        <meshStandardMaterial color={body} />
      </mesh>
      <mesh position={[0, 1.35, 0]} castShadow>
        <boxGeometry args={[0.35,0.35,0.3]} />
        <meshStandardMaterial color={cowl} />
      </mesh>
      <mesh position={[ -0.12, 1.6, 0 ]} castShadow>
        <boxGeometry args={[0.07,0.15,0.07]} />
        <meshStandardMaterial color={cowl} />
      </mesh>
      <mesh position={[ 0.12, 1.6, 0 ]} castShadow>
        <boxGeometry args={[0.07,0.15,0.07]} />
        <meshStandardMaterial color={cowl} />
      </mesh>
      <mesh position={[0, 0.9, -0.23]} castShadow>
        <boxGeometry args={[0.6,0.8,0.02]} />
        <meshStandardMaterial color={cowl} />
      </mesh>
    </group>
  );
}

// Global yaw/pitch
let currentYaw = 0;

// ---------- Collision Helpers ----------
function aabbVsBlocks(next, size, blocks){
  const half = { x: size.x/2, y: size.y/2, z: size.z/2 };
  const collides = (p) => {
    const minX = Math.floor(p.x - half.x), maxX = Math.floor(p.x + half.x);
    const minY = Math.floor(p.y - half.y), maxY = Math.floor(p.y + half.y);
    const minZ = Math.floor(p.z - half.z), maxZ = Math.floor(p.z + half.z);
    for (let x=minX; x<=maxX; x++){
      for (let y=minY; y<=maxY; y++){
        for (let z=minZ; z<=maxZ; z++){
          const key = `${x}|${y}|${z}`;
          if (blocks.has(key)) return true;
        }
      }
    }
    return false;
  };

  const pos = { ...next };
  const tryX = { x: pos.x, y: pos.y, z: pos.z };
  if (collides(tryX)){
    const dir = Math.sign(tryX.x - Math.round(tryX.x));
    while (collides(tryX)) tryX.x += (dir===0? (pos.x>=0?1:-1):dir) * 0.01;
  }
  pos.x = tryX.x;

  const tryZ = { x: pos.x, y: pos.y, z: pos.z };
  if (collides(tryZ)){
    const dir = Math.sign(tryZ.z - Math.round(tryZ.z));
    while (collides(tryZ)) tryZ.z += (dir===0? (pos.z>=0?1:-1):dir) * 0.01;
  }
  pos.z = tryZ.z;

  const tryY = { x: pos.x, y: pos.y, z: pos.z };
  if (collides(tryY)){
    const dir = Math.sign(tryY.y - Math.round(tryY.y));
    while (collides(tryY)) tryY.y += (dir===0?1:dir) * 0.01;
  }
  pos.y = tryY.y;

  return pos;
}

// ---------- Player ----------
function PlayerController({ positionRef, blocks, firstPerson, cameraRef }){
  const ref = useRef(null);
  const vel = useRef(vec3(0,0,0));
  const onGround = useRef(true);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","w","a","s","d","b","1","2","3","4","5","6","7","8","9","f1","q","e"].includes(e.key.toLowerCase()) || e.key === " ") {
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
    const speed = 3.6;
    const jumpV = 6.2;

    let forward = 0, strafe = 0;
    if (isDown("arrowup") || isDown("w")) forward += 1;
    if (isDown("arrowdown") || isDown("s")) forward -= 1;
    if (isDown("arrowleft") || isDown("a")) strafe -= 1;
    if (isDown("arrowright") || isDown("d")) strafe += 1;

    if (!firstPerson){
      if (isDown("arrowleft") && !isDown("a")) currentYaw += 1.5 * dt;
      if (isDown("arrowright") && !isDown("d")) currentYaw -= 1.5 * dt;
    }

    const yaw = firstPerson && cameraRef.current ? cameraRef.current.rotation.y : currentYaw;
    const dir = new THREE.Vector3(strafe, 0, -forward);
    if (dir.lengthSq()>0) dir.normalize();
    dir.applyAxisAngle(new THREE.Vector3(0,1,0), yaw);

    const v = vel.current;
    v.x = dir.x * speed;
    v.z = dir.z * speed;

    v.y += -9.8 * dt;

    if (onGround.current && (isDown(" ") || isDown("space"))) {
      v.y = jumpV;
      onGround.current = false;
    }

    const p = positionRef.current;
    const next = { x: p.x + v.x * dt, y: p.y + v.y * dt, z: p.z + v.z * dt };
    const resolved = aabbVsBlocks(next, {x:0.6,y:1.7,z:0.6}, blocks);

    if (resolved.y <= 0.5) { resolved.y = 0.5; v.y = 0; onGround.current = true; }
    if (Math.abs(resolved.y - p.y) < 1e-3 && v.y < 0) { v.y = 0; onGround.current = true; }

    p.x = resolved.x; p.y = resolved.y; p.z = resolved.z;

    if (ref.current) {
      ref.current.position.set(p.x, p.y, p.z);
      if (!firstPerson) ref.current.rotation.y = yaw;
    }
  });

  return (
    <group ref={ref}>
      {!firstPerson && <BatmanMinifig position={[0,0,0]} />}
    </group>
  );
}

function FollowCamera3P({ targetRef }){
  const { camera } = useThree();
  useFrame(() => {
    const target = targetRef.current;
    if (!target) return;
    const offset = new THREE.Vector3(0, 1.8, 4);
    const worldPos = new THREE.Vector3();
    target.getWorldPosition(worldPos);
    const desired = worldPos.clone().add(offset.applyAxisAngle(new THREE.Vector3(0,1,0), currentYaw));
    camera.position.lerp(desired, 0.18);
    camera.lookAt(worldPos.x, worldPos.y + 0.8, worldPos.z);
  });
  return null;
}

// ---------- Building & Gadgets ----------
function RaycastPlacer({ mode, blocks, setBlocks, getSelected, cameraRef }){
  const { camera, gl, scene } = useThree();
  const raycaster = useMemo(()=> new THREE.Raycaster(), []);
  const pointer = useMemo(()=> new THREE.Vector2(), []);
  const activeCam = cameraRef.current ?? camera;

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

    raycaster.setFromCamera(pointer, activeCam);

    const blockMeshes = [];
    scene.traverse(obj => {
      if (obj.geometry && obj.type === "Mesh" && obj.parent && obj.parent.type === "Group") {
        if (obj.parent.children.length >= 1 && obj.parent.position) blockMeshes.push(obj.parent);
      }
    });

    const intersectsBlocks = raycaster.intersectObjects(blockMeshes, true);

    if (e.button === 2) {
      if (intersectsBlocks.length > 0) {
        const parent = intersectsBlocks[0].object.parent;
        const pos = parent.position;
        const key = toKey(Math.round(pos.x), Math.round(pos.y), Math.round(pos.z));
        setBlocks(prev => {
          const m = new Map(prev);
          m.delete(key);
          return m;
        });
        return;
      }
    } else {
      if (intersectsBlocks.length > 0) {
        const hit = intersectsBlocks[0];
        const normal = hit.face?.normal?.clone() ?? new THREE.Vector3(0,1,0);
        const worldNormal = normal.applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();
        const place = hit.point.clone().add(worldNormal.multiplyScalar(0.5)).floor().addScalar(0.5);
        const key = toKey(Math.round(place.x), Math.round(place.y), Math.round(place.z));
        setBlocks(prev => {
          const m = new Map(prev);
          if (!m.has(key)) m.set(key, { pos: [Math.round(place.x),Math.round(place.y),Math.round(place.z)], type: getSelected() });
          return m;
        });
        return;
      }
    }

    const ground = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(ground, intersection);
    if (intersection) {
      const place = intersection.clone().add(new THREE.Vector3(0,0.5,0)).floor().addScalar(0.5);
      const key = toKey(Math.round(place.x), Math.round(place.y), Math.round(place.z));
      setBlocks(prev => {
        const m = new Map(prev);
        if (!m.has(key)) m.set(key, { pos: [Math.round(place.x), Math.round(place.y), Math.round(place.z)], type: getSelected() });
        return m;
      });
    }
  };

  useEffect(() => {
    const el = gl.domElement;
    el.addEventListener("mousedown", handlePointerDown);
    return () => el.removeEventListener("mousedown", handlePointerDown);
  }, [gl, activeCam, scene, mode]);

  return null;
}

// ---------- Batarang ----------
let BAT_ID = 1;
function useBatarangs(blocks, setBlocks, cameraRef){
  const [bats, setBats] = useState([]);
  const { scene } = useThree();
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === "e"){
        const cam = cameraRef.current; if (!cam) return;
        const dir = new THREE.Vector3(0,0,-1).applyQuaternion(cam.quaternion).normalize();
        const pos = cam.position.clone().add(dir.clone().multiplyScalar(0.6)).add(new THREE.Vector3(0,-0.1,0));
        const speed = 12;
        setBats(prev => [...prev, { id: BAT_ID++, pos, vel: dir.multiplyScalar(speed), ttl: 2.0 }]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cameraRef]);

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
          setBlocks((p)=>{
            const m = new Map(p); m.delete(key); return m;
          });
        }
        const nt = b.ttl - dt;
        if (!hit && nt > 0){ next.push({ ...b, pos: np, ttl: nt }); }
      }
      return next;
    });
  });

  return bats;
}

function BatarangMeshes({ bats }){
  return (
    <group>
      {bats.map(b => (
        <mesh key={b.id} position={b.pos} castShadow>
          <torusGeometry args={[0.15, 0.05, 8, 16]} />
          <meshStandardMaterial color="#f1c40f" />
        </mesh>
      ))}
    </group>
  );
}

// ---------- UI (Minimal styles without Tailwind) ----------
function Hotbar({ hotbar, selected, setSelected }){
  useEffect(() => {
    const onKey = (e) => {
      const n = parseInt(e.key, 10);
      if (!isNaN(n) && n >= 1 && n <= 9) setSelected(n-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSelected]);

  return (
    <div className="hud">
      {hotbar.map((id, i) => {
        const bt = BLOCK_TYPES.find(b=>b.id===id);
        const active = i===selected;
        return (
          <button
            key={i}
            onClick={() => setSelected(i)}
            title={`${bt.label} (${i+1})`}
            style={{
              width: 48, height: 48, borderRadius: 12,
              border: active ? "2px solid white" : "1px solid rgba(255,255,255,.3)",
              transform: active ? "scale(1.05)" : "scale(1.0)",
              background: bt.color, opacity: bt.opacity ?? 1, transition: "transform .15s"
            }}
          />
        );
      })}
    </div>
  );
}

function Sidebar({ open, setOpen, setHotbar }){
  const [dragIndex, setDragIndex] = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key.toLowerCase() === "b") setOpen(!open); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      {open && (
        <div style={{ position:"absolute", top:0, left:0, height:"100%", width:288,
          background:"rgba(24,24,27,.9)", color:"#fff", padding:16, overflowY:"auto",
          backdropFilter:"blur(6px)", boxShadow:"0 0 24px rgba(0,0,0,.5)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h2 style={{ fontSize:16, fontWeight:600 }}>Klodser</h2>
            <button className="button" onClick={()=>setOpen(false)}>Luk (B)</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {BLOCK_TYPES.map((bt) => (
              <div key={bt.id} style={{ display:"flex", gap:8, alignItems:"center",
                    background:"rgba(255,255,255,.05)", padding:8, borderRadius:12, border:"1px solid rgba(255,255,255,.1)" }}>
                <div style={{ width:24, height:24, borderRadius:6, background: bt.color, opacity: bt.opacity ?? 1 }} />
                <div style={{ fontSize:13 }}>{bt.label}</div>
              </div>
            ))}
          </div>
          <hr style={{ borderColor:"rgba(255,255,255,.1)", margin:"16px 0" }} />
          <p style={{ fontSize:12, opacity:.7 }}>Tip: 1–9 vælger blok • Højreklik fjerner • Venstreklik placerer • Q skifter tilstand • E kaster batarang</p>
        </div>
      )}
    </>
  );
}

// ---------- Main ----------
export default function LegoBatmanVoxelGame(){
  const [blocks, setBlocks] = useState(() => {
    const m = new Map();
    for (let x=-6; x<=6; x++) {
      for (let z=-6; z<=6; z++) {
        m.set(`${x}|0|${z}`, { pos:[x,0,z], type: (x+z)%2===0?"darkgray":"lightgray" });
      }
    }
    for (let y=1; y<4; y++) { m.set(`2|${y}|2`, { pos:[2,y,2], type: "yellow" }); }
    return m;
  });

  const [hotbar, setHotbar] = useState([...DEFAULT_HOTBAR]);
  const [selected, setSelected] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode] = useState("build");
  const [firstPerson, setFirstPerson] = useState(false);

  const playerPos = useRef(vec3(0,0.5,6));
  const playerRef = useRef(null);
  const cameraRef = useRef(null);

  const getSelected = () => hotbar[selected] ?? "black";

  const bats = useBatarangs(blocks, setBlocks, cameraRef);

  const [showHelp, setShowHelp] = useState(true);
  useEffect(() => { const t = setTimeout(()=>setShowHelp(false), 6000); return () => clearTimeout(t); }, []);

  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if (k === "q") setMode(m => m === "build" ? "gadget" : "build");
      if (k === "f1") setFirstPerson(v=>!v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div style={{ width:"100%", height:"100%", position:"relative", background:"#000" }}>
      <Canvas shadows camera={{ position:[0,2,8], fov:60 }} onCreated={({ camera }) => { (cameraRef).current = camera; }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5,10,5]} intensity={1.1} castShadow />
        <Sky distance={450000} sunPosition={[0.5,1,0.25]} turbidity={4} rayleigh={2} mieCoefficient={0.01} mieDirectionalG={0.9} />
        <Stars radius={100} depth={50} count={3000} factor={4} fade />

        <Ground />
        <Blocks blocks={blocks} />

        <PlayerController positionRef={playerPos} blocks={blocks} firstPerson={firstPerson} cameraRef={cameraRef} />

        {!firstPerson && (
          <>
            <FollowCamera3P targetRef={playerRef} />
            <group ref={playerRef} position={[playerPos.current.x, playerPos.current.y, playerPos.current.z]} />
          </>
        )}
        {firstPerson && (
          <PointerLockControls selector="#game-root" />
        )}

        <RaycastPlacer mode={mode} blocks={blocks} setBlocks={setBlocks} getSelected={getSelected} cameraRef={cameraRef} />

        <BatarangMeshes bats={bats} />
      </Canvas>

      <div className="crosshair" />

      <div style={{ position:"absolute", top:16, left:16, display:"flex", gap:8, flexWrap:"wrap" }}>
        <button className="button" onClick={()=>setSidebarOpen(v=>!v)}>{sidebarOpen?"Skjul":"Klodser"} (B)</button>
        <button className="button" onClick={()=>setMode(m=>m==="build"?"gadget":"build")}>Tilstand: {mode==="build"?"Byg":"Gadget"} (Q)</button>
        <button className="button" onClick={()=>setFirstPerson(v=>!v)}>{firstPerson?"3rd Person":"1st Person"} (F1)</button>
      </div>

      {showHelp && (
        <div style={{ position:"absolute", top:16, left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,.5)", padding:"8px 12px", borderRadius:12 }}>
          <div style={{ fontSize:13 }}>
            WASD/Pile: Bevæg • Space: Hop • B: Sidebar • 1–9: Vælg blok • Q: Byg/Gadget • E: Batarang • F1: First-person • Klik i canvas for at låse musen
          </div>
        </div>
      )}

      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} setHotbar={setHotbar} />
      <Hotbar hotbar={hotbar} selected={selected} setSelected={setSelected} />

      <div style={{ position:"absolute", top:16, right:16, textAlign:"right" }}>
        <div style={{ color:"rgba(255,255,255,.8)", fontSize:12 }}>Prototype v2</div>
        <div style={{ color:"#fff", fontSize:18, fontWeight:600 }}>LEGO Batman – Voxel Builder</div>
      </div>

      <div id="game-root" style={{ position:"absolute", inset:0 }} />
    </div>
  );
}
