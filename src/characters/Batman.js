import React, { useEffect, useRef } from "https://esm.sh/react@18.3.1";
import * as THREE from "https://esm.sh/three@0.160.0";
import { MTLLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/OBJLoader.js";

export function BatmanOBJ({ hipRef, legLRef, legRRef }) {
  const group = useRef();

  useEffect(() => {
    let mounted = true;
    const showErr = (m, s) => window.__showErrorOverlay?.(m, s);

    // Forud-læs teksturer
    const texLoader = new THREE.TextureLoader();
    const tFace  = texLoader.load("assets/Batman/textures/decoration/3626d783.png");
    const tTorso = texLoader.load("assets/Batman/textures/decoration/3814d676.png");
    // Korrekt farverum til PBR i nyere three
    if (tFace)  tFace.colorSpace  = THREE.SRGBColorSpace;
    if (tTorso) tTorso.colorSpace = THREE.SRGBColorSpace;
    // OBJ/UV’er bruger typisk flipY=true (default). Vi lader dem stå.

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
          objLoader.load("assets/Batman/Untitled Model.obj", (obj) => {
            if (!mounted) return;
            try {
              // Tving materialer til Standard + sæt maps for head/torso via simple heuristik (størrelser)
              obj.traverse((c) => {
                if (!c.isMesh) return;
                c.castShadow = true; c.receiveShadow = true;

                // Base standard-materiale
                const baseMat = new THREE.MeshStandardMaterial({
                  color: (c.material?.color) ? c.material.color.clone() : new THREE.Color("#333"),
                  roughness: 0.55, metalness: 0.05, transparent: false, opacity: 1.0, side: THREE.DoubleSide
                });

                // Mål mesh'en for at gætte head/torso
                c.geometry.computeBoundingBox?.();
                const bb = c.geometry.boundingBox;
                if (bb) {
                  const size = new THREE.Vector3();
                  bb.getSize(size);
                  const sx = size.x, sy = size.y, sz = size.z;

                  // Heuristik: hoved ~ næsten kube, h ~0.3–0.45
                  const looksLikeHead =
                    sy > 0.28 && sy < 0.48 &&
                    Math.abs(sx - sy) < 0.2 && Math.abs(sz - sy) < 0.2;

                  // Heuristik: torso ~ rektangulær, h ~0.6–0.9, bredde ~0.5–0.7, dybde ~0.25–0.45
                  const looksLikeTorso =
                    sy > 0.55 && sy < 0.95 &&
                    sx > 0.45 && sx < 0.75 &&
                    sz > 0.22 && sz < 0.48;

                  if (looksLikeHead && tFace) {
                    baseMat.map = tFace;
                    baseMat.needsUpdate = true;
                  } else if (looksLikeTorso && tTorso) {
                    baseMat.map = tTorso;
                    baseMat.needsUpdate = true;
                  }
                }

                c.material = baseMat;
              });

              // Skaler til ~1.7 høj
              const box = new THREE.Box3().setFromObject(obj);
              const size = new THREE.Vector3(); box.getSize(size);
              const scale = (size.y > 0.0001) ? (1.7 / size.y) : 1.0;
              obj.scale.setScalar(scale);

              // Recenter (center.y -> 0.85)
              const box2 = new THREE.Box3().setFromObject(obj);
              const center = new THREE.Vector3(); box2.getCenter(center);
              obj.position.y += (0.85 - center.y);

              // Vend 180°, så han kigger væk fra kameraet
              obj.rotation.y = Math.PI;

              group.current?.add(obj);
            } catch (e) {
              console.error("Batman OBJ post-process error", e);
              showErr("Batman model post-process fejlede", e.stack);
            }
          }, undefined, (e) => {
            console.warn("OBJ load failed", e);
            // Ikke fatal – fallback-figur vises fra game.js hvis nødvendig.
          });
        } catch (e) {
          console.error("OBJ setup error", e);
          showErr("Batman loader fejlede under opsætning", e.stack);
        }
      }, undefined, (e) => {
        console.warn("MTL load failed", e);
        // Ikke fatal – fallback-figur vises fra game.js hvis nødvendig.
      });
    } catch (e) {
      console.error("Batman loader fatal", e);
      showErr("Batman loader kunne ikke initialiseres", e.stack);
    }

    return () => { mounted = false; };
  }, []);

  // Noder som game.js bruger til ben/hofte animation
  return React.createElement('group',{ref:group, position:[0,0,0]},
    React.createElement('group',{ref:hipRef, position:[0,0,0]}),
    React.createElement('group',{ref:legLRef, position:[-0.14, 0.48, 0]}),
    React.createElement('group',{ref:legRRef, position:[ 0.14, 0.48, 0]})
  );
}

    return () => { mounted = false; };
  }, []);

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
