import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import { rt } from "@/runtime";
import { MathUtils } from "three";
import { AdditiveBlending, Color, DoubleSide, ShaderMaterial } from "three";
import { NOISE_GLSL, OUTPUT_GLSL } from "@/shaders/common";

const VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime, uType, uSeed, uOpacity;
uniform vec3 uA, uB;
${NOISE_GLSL}
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  if(r > 1.0) discard;
  float fade = smoothstep(1.0, 0.25, r);
  vec3 col;
  if(uType < 0.5){
    float a = atan(p.y,p.x);
    float s = a + 3.0*log(r+0.2) - uTime*0.03 + uSeed;
    float arms = pow(0.5+0.5*cos(s*2.0), 3.0);
    float n = fbm(p*4.0 + uSeed);
    col = mix(uB, uA, smoothstep(0.0,0.9,r)) * (arms*(0.5+n)) * fade;
    col += exp(-r*7.0) * vec3(1.0,0.95,0.9) * 1.4;
  } else {
    float n = fbm(p*2.2 + uSeed + vec2(uTime*0.01, 0.0));
    float n2 = fbm(p*4.0 - uSeed - n*1.5);
    col = mix(uB, uA, n2) * pow(n*1.6, 2.2) * fade * 1.4;
  }
  gl_FragColor = vec4(col * uOpacity, 1.0);
  ${OUTPUT_GLSL}
}`;

interface Props {
  position: [number, number, number];
  size: number;
  a: string;
  b: string;
  type?: 0 | 1;
  seed?: number;
  tilt?: number;
  opacity?: number;
  /** fade in with the cinematic intro */
  introFade?: boolean;
}

/** Distant galaxy / nebula sprite rendered with a procedural shader. */
export function GalaxyBillboard({ position, size, a, b, type = 0, seed = 1, tilt = 0, opacity = 1, introFade = false }: Props) {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        toneMapped: false,
        uniforms: {
          uTime: { value: 0 },
          uType: { value: type },
          uSeed: { value: seed },
          uOpacity: { value: opacity },
          uA: { value: new Color(a) },
          uB: { value: new Color(b) },
        },
      }),
    [a, b, type, seed, opacity],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime;
    mat.uniforms.uOpacity.value = opacity * (introFade ? MathUtils.smoothstep(rt.introT, 0.15, 0.45) : 1);
  });
  return (
    <Billboard position={position}>
      <mesh rotation={[tilt, 0, 0]} scale={[size, size, 1]}>
        <planeGeometry args={[1, 1]} />
        <primitive object={mat} attach="material" />
      </mesh>
    </Billboard>
  );
}
