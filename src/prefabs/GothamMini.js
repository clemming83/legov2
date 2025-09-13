import React, { useEffect, useRef } from "https://esm.sh/react@18.3.1";
import * as THREE from "https://esm.sh/three@0.160.0";

export function GothamMini({ theme="night" }){
  const g = useRef();

  useEffect(()=>{
    if (!g.current) return;
    const group = g.current;
    const neon = (hex) => new THREE.MeshBasicMaterial({
      color: new THREE.Color(hex),
      transparent:true,
      opacity:0.9,
      blending:THREE.AdditiveBlending
    });
    const addBox = (x,y,z, w,h,d, color="#222") => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w,h,d),
        new THREE.MeshStandardMaterial({ color, roughness:0.9, metalness:0.05 })
      );
      m.position.set(x,y + h/2,z);
      m.castShadow = true; m.receiveShadow = true;
      group.add(m); return m;
    };
    const addNeon = (x,y,z, w,h, color) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w,h), neon(color));
      m.position.set(x,y,z); m.rotation.y = Math.PI/2;
      group.add(m); return m;
    };

    // Enkelt “gadehjørne”
    addBox(-6,0, -4, 4, 6, 4, "#3b3f46");
    addNeon(-4.1, 3.5, -4, 2.2, 0.7, "#ff3e7a");
    addNeon(-3.9, 2.2, -4, 1.6, 0.5, "#39e7ff");

    addBox(6,0, -6, 4, 5, 4, "#28303a");
    addNeon(4.1, 3.0, -6, 2.0, 0.6, "#aaff33");

    addBox(0,0, -12, 6, 10, 6, "#262a31");
    addNeon(3.1, 7.0, -12, 3.0, 1.0, "#ffd400");

    return ()=>{ while(group.children.length) group.remove(group.children[0]); };
  },[theme]);

  return React.createElement('group',{ref:g});
}