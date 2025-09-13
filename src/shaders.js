// Toon + Fresnel "wet plastic" shader til LEGO look
import * as THREE from "https://esm.sh/three@0.160.0";

export const ToonPlastic = {
  uniforms: {
    uColor: { value: new THREE.Color("#ffd400") },
    uTime: { value: 0 },
    uLightDir: { value: new THREE.Vector3(0.4, 1.0, 0.2).normalize() },
    uRimStrength: { value: 1.2 },
    uRimPower: { value: 2.6 },
    uHueJitter: { value: 0.02 },
    uOpacity: { value: 1.0 }
  },
  vertex: `
    varying vec3 vN;
    varying vec3 vWPos;
    void main(){
      vN = normalize(normalMatrix * normal);
      vec4 wp = modelMatrix * vec4(position,1.0);
      vWPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragment: `
    precision highp float;
    varying vec3 vN;
    varying vec3 vWPos;
    uniform vec3 uLightDir;
    uniform vec3 uColor;
    uniform float uRimStrength;
    uniform float uRimPower;
    uniform float uHueJitter;
    uniform float uOpacity;

    vec3 hueShift(vec3 c, float a){
      const mat3 toYCbCr = mat3(
        0.299, 0.587, 0.114,
       -0.168736, -0.331264, 0.5,
        0.5, -0.418688, -0.081312
      );
      vec3 ycc = toYCbCr * c;
      float ang = a * 6.28318;
      float cs = cos(ang), sn = sin(ang);
      mat2 R = mat2(cs,-sn,sn,cs);
      ycc.yz = R * ycc.yz;
      const mat3 toRGB = mat3(
        1.0, 0.0, 1.402,
        1.0, -0.344136, -0.714136,
        1.0, 1.772, 0.0
      );
      return clamp(toRGB * ycc, 0.0, 1.0);
    }

    void main(){
      vec3 N = normalize(vN);
      vec3 L = normalize(uLightDir);
      float ndl = max(dot(N,L), 0.0);

      float ramp = step(0.7, ndl)*1.0 + step(0.35, ndl)*0.35 + step(0.08, ndl)*0.12;
      float rim = pow(1.0 - max(dot(N, normalize(-cameraPosition + vWPos)), 0.0), uRimPower) * uRimStrength;

      vec3 base = hueShift(uColor, uHueJitter);
      vec3 col = base * (0.15 + 0.85*ramp) + vec3(1.0)*rim*0.45;

      gl_FragColor = vec4(col, uOpacity);
    }
  `
};

export function makeToonMaterial(hex, opacity=1){
  const mat = new THREE.ShaderMaterial({
    vertexShader: ToonPlastic.vertex,
    fragmentShader: ToonPlastic.fragment,
    uniforms: THREE.UniformsUtils.clone(ToonPlastic.uniforms),
    transparent: opacity < 1.0,
  });
  mat.uniforms.uColor.value = new THREE.Color(hex);
  mat.uniforms.uOpacity.value = opacity;
  return mat;
}