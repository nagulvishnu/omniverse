import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, Mesh, ShaderMaterial } from "three";
import { NOISE_GLSL, OUTPUT_GLSL } from "@/shaders/common";
import { rt } from "@/runtime";

const VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uP, uType, uTime, uAspect;
uniform vec3 uC1, uC2;
${NOISE_GLSL}
void main(){
  vec2 c = vUv - 0.5; c.x *= uAspect;
  float r = length(c), ang = atan(c.y, c.x);
  float p = uP, t = uTime;
  float front = p * 1.5;
  float mask = smoothstep(front, front - 0.4, r);
  vec3 col = vec3(0.0); float a = 0.0;

  if(uType < 0.5){ // AETHER — cosmic tunnel / particle vortex
    float tw = ang + 3.0*r*p - t*0.6;
    float n = fbm(vec2(tw*1.6, 0.35/(r+0.06) - t*2.2));
    float st = pow(hash21(vec2(floor(ang*40.0/6.2831), floor(0.4/(r+0.05) - t*3.0))), 10.0);
    col = mix(uC2, uC1, n) * (0.5 + n*1.4) + st*vec3(1.0);
    col += exp(-r*5.0) * vec3(0.8,0.85,1.0) * p;
    a = mask * (0.55 + 0.4*n);
  } else if(uType < 1.5){ // ABYSS — water-like distortion
    vec2 q = c*6.0;
    float w = fbm(q + vec2(t*0.6, -t*0.4)) ;
    float ca = pow(1.0 - abs(2.0*fbm(q*1.5 + w*3.0 + t*0.4) - 1.0), 4.0);
    float rip = 0.5 + 0.5*sin(r*38.0 - t*9.0 - w*6.0);
    col = mix(uC2*0.7, uC1, w) + ca*vec3(0.5,1.0,0.9) + rip*0.12*uC1;
    a = mask * (0.5 + 0.35*w + 0.15*rip);
  } else if(uType < 2.5){ // NEOVERSE — digital grid transition
    vec2 g = vUv * vec2(26.0*uAspect, 26.0);
    vec2 id = floor(g);
    float h = hash21(id);
    float reveal = step(h, p*1.35 - r*0.35);
    vec2 f = abs(fract(g) - 0.5);
    float line = smoothstep(0.44, 0.5, max(f.x,f.y));
    float flick = step(0.8, hash21(id + floor(t*10.0)));
    col = mix(uC2, uC1, hash21(id+3.0)) * (0.35 + flick*1.2) + line*uC1*1.4;
    a = reveal * (0.55 + 0.35*flick) + line*0.4*step(h, p*1.8);
  } else if(uType < 3.5){ // MYTHORA — magical energy wave
    float n = fbm(c*5.0 + vec2(t*0.5, -t*0.3) + ang);
    float ring = smoothstep(0.1, 0.0, abs(r - front*0.85));
    float sp = step(0.93, hash21(floor(c*40.0) + floor(t*6.0))) * mask;
    col = mix(uC2, uC1, n) * (0.6 + n) + ring*vec3(1.0,0.9,0.6)*2.0 + sp*vec3(1.0,0.95,0.7)*2.0;
    a = mask*(0.45 + 0.4*n) + ring*0.6;
  } else { // NEXDRIVE — hyper-speed rings
    float rings = pow(0.5 + 0.5*sin(r*34.0 - t*22.0), 6.0);
    float id = floor(ang*50.0/6.2831);
    float s = pow(hash11(id), 6.0) * pow(0.5 + 0.5*sin(r*10.0 - t*16.0 + hash11(id)*20.0), 3.0);
    col = uC1*rings*1.4 + vec3(0.9,0.97,1.0)*s*2.0 + uC2*0.15;
    a = mask * (0.4 + 0.5*rings + 0.5*s);
  }
  // final cover
  float cover = smoothstep(0.82, 1.0, p);
  col = mix(col, mix(uC1, vec3(0.0), 0.8), cover);
  a = clamp(max(a * smoothstep(0.0, 0.12, p), cover), 0.0, 1.0);
  gl_FragColor = vec4(col, a);
  ${OUTPUT_GLSL}
}`;

/** Full-screen dimensional transition (one shader, five identities). */
export function TransitionOverlay() {
  const ref = useRef<Mesh>(null);
  const { size } = useThree();
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uP: { value: 0 },
          uType: { value: 0 },
          uTime: { value: 0 },
          uAspect: { value: 1 },
          uC1: { value: new Color() },
          uC2: { value: new Color() },
        },
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((s) => {
    const m = ref.current;
    if (!m) return;
    const p = rt.transition.progress;
    m.visible = p > 0.002;
    if (!m.visible) return;
    mat.uniforms.uP.value = p;
    mat.uniforms.uType.value = rt.transition.type;
    mat.uniforms.uTime.value = s.clock.elapsedTime;
    mat.uniforms.uAspect.value = size.width / size.height;
    mat.uniforms.uC1.value.copy(rt.transition.color);
    mat.uniforms.uC2.value.copy(rt.transition.color2);
  });
  return (
    <mesh ref={ref} renderOrder={9999} frustumCulled={false} visible={false}>
      <planeGeometry args={[1, 1]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}
