// /src/characters/Batman.js  (v14.3 – fix: Box3.min usage, safer post-process)
// - Vender Batman 180°
// - Fod-align med samlet bbox (bruger box.min, ikke getMin())
// - Mapper ansigt/torso teksturer via materiale-/mesh-navne (fail-soft)
// - Fallback-minifig beholdes

import React, { useEffect, useRef } from "https://esm.sh/react@18.3.1";
import * as THREE from "https://esm.sh/three@0.160.0";
import { MTLLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/OBJLoader.js";

export function BatmanOBJ({ hipRef, legLRef, legRRef }) {
  const group = useRef();

  useEffect(() => {
    let mounted = true;
    const showErr = (m, s) => window.__showErrorOverlay?.(m, s);

    // Forudlæs teksturer (fail-soft)
    let tFace = null, tTorso = null;
    try {
      const texLoader = new THREE.TextureLoader();
      tFace  = texLoader.load("assets/Batman/textures/decoration/3626d783.png", undefined, undefined, ()=>{});
      tTorso = texLoader.load("assets/Batman/textures/decoration/3814d676.png", undefined, undefined, ()=>{});
      if (tFace)  tFace.colorSpace  = THREE.SRGBColorSpace;
      if (tTorso) tTorso.colorSpace = THREE.SRGBColorSpace;
    } catch {/* ignore */}

    try {
      const mtlLoader = new MTLLoader();
      mtlLoader.setResourcePath("assets/Batman/");
      mtlLoader.setMaterialOptions({ side: THREE.DoubleSide, ignoreZeroRGBs: false });

      mtlLoader.load("assets/Batman/Untitled Model.mtl", (mtls) => {
        if (!mounted) return;
        try {
          mtls.preload();
          const objLoader = new OBJLoader();
          objLoader.setMaterials(mtls);
          objLoader.load(
            "assets/Batman/Untitled Model.obj",
            (obj) => {
              if (!mounted) return;
              try {
                // Standardiser materialer + navnemapping
                obj.traverse((c) => {
                  if (!c.isMesh) return;
                  c.castShadow = true; c.receiveShadow = true;

                  const baseMat = new THREE.MeshStandardMaterial({
                    color: (c.material?.color) ? c.material.color.clone() : new THREE.Color("#333"),
                    roughness: 0.55,
                    metalness: 0.05,
                    transparent: false,
                    opacity: 1.0,
                    side: THREE.DoubleSide
                  });

                  const mName = (c.material && c.material.name) ? String(c.material.name).toLowerCase() : "";
                  const name  = (c.name || "").toLowerCase();

                  const isHead  = /head|face|mask|helmet/.test(mName) || /head|face|mask|helmet/.test(name);
                  const isTorso = /torso|body|chest/.test(mName) || /torso|body|chest/.test(name);

                  if (isHead && tFace)  { baseMat.map = tFace;  baseMat.map.needsUpdate = true; }
                  if (isTorso && tTorso){ baseMat.map = tTorso; baseMat.map.needsUpdate = true; }

                  c.material = baseMat;
                });

                // Skaler til ~1.7 høj
                const box = new THREE.Box3().setFromObject(obj);
                const size = new THREE.Vector3(); box.getSize(size);
                const scale = (size.y > 1e-4) ? (1.7 / size.y) : 1.0;
                obj.scale.setScalar(scale);

                // Fod-align via samlet bbox (brug box.min, ikke getMin())
                const box2 = new THREE.Box3().setFromObject(obj);
                const minY = box2.min.y;                // <-- fix
                const colliderHalf = 0.85;              // 1.7 / 2
                const deltaY = (-colliderHalf - minY);
                obj.position.y += deltaY;

                // Vend 180°, så han kigger væk fra kameraet
                obj.rotation.y = Math.PI;

                // Parent under hofte, så game.js hofte-bob virker på OBJ
                if (hipRef?.current) hipRef.current.add(obj);
                else group.current?.add(obj);
              } catch (e) {
                console.error("Batman OBJ post-process error", e);
                showErr("Batman model post-process fejlede", e.stack);
              }
            },
            undefined,
            (e) => {
              console.warn("OBJ load failed", e);
              // Ikke fatal – fallback i game.js
            }
          );
        } catch (e) {
          console.error("OBJ setup error", e);
          showErr("Batman loader fejlede under opsætning", e.stack);
        }
      },
      undefined,
      (e) => {
        console.warn("MTL load failed", e);
        // Ikke fatal – fallback i game.js
      });
    } catch (e) {
      console.error("Batman loader fatal", e);
      showErr("Batman loader kunne ikke initialiseres", e.stack);
    }

    return () => { mounted = false; };
  }, []);

  // Noder som game.js bruger til hofte/ben
  return React.createElement('group',{ref:group, position:[0,0,0]},
    React.createElement('group',{ref:hipRef, position:[0,0,0]}),
    React.createElement('group',{ref:legLRef, position:[-0.14, 0.48, 0]}),
    React.createElement('group',{ref:legRRef, position:[ 0.14, 0.48, 0]})
  );
}

export function BatmanMiniFallback({ hipRef, legLRef, legRRef }){
  const body = "#151515", cowl = "#0d0d0d", belt = "#f1c40f", gray = "#444";
  return React.createElement('group',null,
    React.createElement('group',{ref:hipRef, position:[0,0,0]},
      React.createElement('group',{ref:legLRef, position:[-0.18, 0.50, 0]},
        React.createElement('mesh',{position:[0,-0.25,0], castShadow:true},
          React.createElement('boxGeometry',{args:[0.26,0.5,0.35]}),
          React.createElement('meshStandardMaterial',{color:gray})
        )
      ),
      React.createElement('group',{ref:legRRef, position:[ 0.18, 0.50, 0]},
        React.createElement('mesh',{position:[0,-0.25,0], castShadow:true},
          React.createElement('boxGeometry',{args:[0.26,0.5,0.35]}),
          React.createElement('meshStandardMaterial',{color:gray})
        )
      ),
      React.createElement('mesh',{position:[0, 0.85, 0], castShadow:true},
        React.createElement('boxGeometry',{args:[0.6,0.7,0.35]}),
        React.createElement('meshStandardMaterial',{color:body})
      ),
      React.createElement('mesh',{position:[0, 0.55, 0], castShadow:true},
        React.createElement('boxGeometry',{args:[0.62,0.1,0.37]}),
        React.createElement('meshStandardMaterial',{color:belt})
      ),
      React.createElement('mesh',{position:[ -0.45, 0.85, 0 ], castShadow:true},
        React.createElement('boxGeometry',{args:[0.2,0.5,0.2]}),
        React.createElement('meshStandardMaterial',{color:body})
      ),
      React.createElement('mesh',{position:[ 0.45, 0.85, 0 ], castShadow:true},
        React.createElement('boxGeometry',{args:[0.2,0.5,0.2]}),
        React.createElement('meshStandardMaterial',{color:body})
      ),
      React.createElement('mesh',{position:[0, 1.35, 0], castShadow:true},
        React.createElement('boxGeometry',{args:[0.35,0.35,0.3]}),
        React.createElement('meshStandardMaterial',{color:cowl})
      ),
      React.createElement('mesh',{position:[ -0.12, 1.6, 0 ], castShadow:true},
        React.createElement('boxGeometry',{args:[0.07,0.15,0.07]}),
        React.createElement('meshStandardMaterial',{color:cowl})
      ),
      React.createElement('mesh',{position:[ 0.12, 1.6, 0 ], castShadow:true},
        React.createElement('boxGeometry',{args:[0.07,0.15,0.07]}),
        React.createElement('meshStandardMaterial',{color:cowl})
      ),
      React.createElement('mesh',{position:[0, 0.9, -0.23], castShadow:true},
        React.createElement('boxGeometry',{args:[0.6,0.8,0.02]}),
        React.createElement('meshStandardMaterial',{color:cowl})
      )
    )
  );
}
