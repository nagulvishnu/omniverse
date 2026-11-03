import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, DoubleSide, ShaderMaterial } from "three";
import { NOISE_GLSL, OUTPUT_GLSL } from "@/shaders/common";
import type { WorldConfig } from "@/config/worlds";

const VERT = /* glsl */ `
varying vec2 vP;
void main(){
  vP = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vP;
uniform float uTime, uHover, uFocus, uPattern, uShape;
uniform vec3 uColorA, uColorB, uColorC;
${NOISE_GLSL}

float sdBox(vec2 p, vec2 b){ vec2 d = abs(p)-b; return length(max(d,0.0)) + min(max(d.x,d.y),0.0); }
float sdHex(vec2 p, float r){
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p); p -= 2.0*min(dot(k.xy,p),0.0)*k.xy;
  p -= vec2(clamp(p.x, -k.z*r, k.z*r), r);
  return length(p)*sign(p.y);
}
float shapeSD(vec2 p){
  if(uShape < 0.5) return length(p) - 5.0;
  if(uShape < 1.5){
    vec2 q = p/vec2(4.0,5.6);
    float w = 1.0 + 0.025*sin(p.y*2.2 + uTime*2.0) + 0.02*sin(p.x*3.0 - uTime*1.6);
    return (length(q) - w) * 4.2;
  }
  if(uShape < 2.5) return sdBox(p, vec2(3.1,4.7)) - 0.5;
  if(uShape < 3.5){
    float a = sdBox(p - vec2(0.0,-1.5), vec2(3.4,3.5));
    float c = length(p - vec2(0.0,2.0)) - 3.4;
    return min(a,c);
  }
  return sdHex(p, 4.4);
}

vec3 galaxy(vec2 p, float t){
  float r = length(p);
  float sw = 0.35*sin(t*0.3 + r);
  float a = atan(p.y,p.x) + sw*(1.0-smoothstep(0.0,5.0,r));
  float s = a + 2.2*log(r+0.3) - t*0.35;
  float arms = pow(0.5+0.5*cos(s*2.0), 2.0);
  float dust = fbm(vec2(r*0.9, a*1.4 + t*0.1) + p*0.25);
  vec3 col = mix(uColorB, uColorA, smoothstep(0.0,5.0,r)) * (arms*1.1 + 0.18) * (0.4 + dust*1.5);
  col += exp(-r*0.85) * vec3(1.0,0.92,1.0) * 1.3;
  vec2 g = p*9.0; vec2 id = floor(g); float h = hash21(id);
  float star = step(0.93,h) * smoothstep(0.28,0.0,length(fract(g)-0.5)) * (0.5+0.5*sin(t*3.0+h*40.0));
  col += star * uColorC * 1.6;
  return col;
}

vec3 water(vec2 p, float t){
  vec2 q = p*0.32;
  vec2 w = vec2(fbm(q + vec2(0.0,t*0.25)), fbm(q + vec2(5.2,1.3) - t*0.2));
  float c = fbm(q*2.0 + 3.0*w + t*0.15);
  float ca = pow(1.0 - abs(2.0*fbm(q*3.0 + w*2.0 + vec2(t*0.2,-t*0.3)) - 1.0), 5.0);
  vec3 col = mix(uColorB*0.6, uColorA, c) + ca*uColorC*0.9;
  col += (sin(length(p)*3.0 - t*2.0)*0.5+0.5) * 0.08 * uColorA;
  vec2 sp = p*4.0; sp.y -= t*0.5; vec2 id = floor(sp); float h = hash21(id);
  col += step(0.9,h) * smoothstep(0.22,0.0,length(fract(sp)-0.5)) * uColorC * (0.6+0.4*sin(t*2.0+h*30.0)) * 1.6;
  col *= 0.65 + 0.5*smoothstep(-5.0,5.0,p.y);
  return col;
}

vec3 grid(vec2 p, float t){
  vec2 f = abs(fract(p*1.25) - 0.5);
  float line = smoothstep(0.43, 0.5, max(f.x,f.y));
  float colId = floor(p.x*3.0); float h = hash11(colId);
  float y = fract(p.y*0.14 + t*(0.2+h*0.4) + h*10.0);
  float rain = pow(y,6.0) * step(0.45,h);
  float band = smoothstep(0.03, 0.0, abs(fract(p.y*0.09 - t*0.12) - 0.5) - 0.0);
  float scan = 0.85 + 0.15*sin(p.y*14.0 - t*4.0);
  vec3 base = mix(vec3(0.02,0.03,0.1), uColorB*0.35, smoothstep(-5.0,5.0,p.y));
  vec3 col = base + line*mix(uColorA,uColorB,0.5+0.5*sin(t+p.y*0.4))*0.9 + rain*uColorC*1.4 + band*uColorA*0.5;
  float hex = step(0.985, hash21(floor(p*vec2(2.0,3.0)) + floor(t*2.0)));
  col += hex*uColorC;
  return col*scan;
}

vec3 mythic(vec2 p, float t){
  float r = length(p), a = atan(p.y,p.x);
  vec2 q = p*0.4;
  float n = fbm(q + vec2(t*0.2,-t*0.15) + fbm(q*2.0 - t*0.1)*1.5);
  vec3 col = mix(uColorB*0.55, uColorA, n*1.25);
  float r1 = smoothstep(0.07,0.0,abs(r-3.0)), r2 = smoothstep(0.06,0.0,abs(r-1.9)), r3 = smoothstep(0.06,0.0,abs(r-4.2));
  float tk1 = step(0.5, fract(a*12.0/6.2831 + t*0.08)), tk2 = step(0.5, fract(a*18.0/6.2831 - t*0.12));
  float tk3 = step(0.35, fract(a*9.0/6.2831 + t*0.05));
  col += (r1*(0.4+0.6*tk1) + r2*tk2 + r3*tk3) * uColorC * 1.6;
  col += pow(n,3.0)*uColorA*1.4 + exp(-r*0.7)*uColorC*0.7;
  vec2 sp = p*5.0 + vec2(0.0,-t*0.8); float h = hash21(floor(sp));
  col += step(0.92,h) * smoothstep(0.2,0.0,length(fract(sp)-0.5)) * uColorC * 1.5;
  return col;
}

vec3 speedRings(vec2 p, float t){
  float r = length(p), a = atan(p.y,p.x);
  float rings = pow(0.5+0.5*sin(r*3.0 - t*5.0), 8.0);
  float id = floor(a*28.0/6.2831); float h = hash11(id);
  float s = pow(fract(r*0.22 - t*(0.6+h) + h*7.0), 4.0) * step(0.35,h);
  float arc = pow(1.0 - abs(2.0*fbm(vec2(a*3.0 + t*0.2, r*0.8 - t*1.2)) - 1.0), 9.0);
  vec3 col = mix(vec3(0.015,0.04,0.09), uColorA*0.35, smoothstep(0.0,5.0,r));
  col += uColorA*(rings*0.7 + arc*1.2) + uColorB*s*1.3;
  col += exp(-r*1.1) * uColorC * 1.2;
  return col;
}

void main(){
  float d = shapeSD(vP);
  float alpha = smoothstep(0.0, -0.12, d);
  if(alpha < 0.01) discard;
  float t = uTime * (1.0 + uHover*0.6 + uFocus*1.4);
  vec2 p = vP;
  vec3 col;
  if(uPattern < 0.5) col = galaxy(p,t);
  else if(uPattern < 1.5) col = water(p,t);
  else if(uPattern < 2.5) col = grid(p,t);
  else if(uPattern < 3.5) col = mythic(p,t);
  else col = speedRings(p,t);
  float boost = 0.85 + uHover*0.6 + uFocus*0.9;
  float edge = exp(-abs(d)*4.5);
  col = col*boost + edge*uColorC*(0.9 + uHover*1.2 + uFocus*1.0);
  gl_FragColor = vec4(col, alpha*0.97);
  ${OUTPUT_GLSL}
}`;

export interface SurfaceHandle {
  hover: number;
  focus: number;
}

export function PortalSurface({ world, state }: { world: WorldConfig; state: SurfaceHandle }) {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        side: DoubleSide,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uTime: { value: 0 },
          uHover: { value: 0 },
          uFocus: { value: 0 },
          uPattern: { value: world.portal.pattern },
          uShape: { value: world.portal.shape },
          uColorA: { value: new Color(world.colors.primary) },
          uColorB: { value: new Color(world.colors.secondary) },
          uColorC: { value: new Color(world.colors.accent) },
        },
      }),
    [world],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime + world.index * 7.3;
    mat.uniforms.uHover.value = state.hover;
    mat.uniforms.uFocus.value = state.focus;
  });
  return (
    <mesh>
      <planeGeometry args={[12, 13]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}
