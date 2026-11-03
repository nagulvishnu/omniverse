export const NOISE_GLSL = /* glsl */ `
float hash11(float p){ p = fract(p*.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float a = hash21(i), b = hash21(i+vec2(1.0,0.0)), c = hash21(i+vec2(0.0,1.0)), d = hash21(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5; mat2 m = mat2(1.6,1.2,-1.2,1.6);
  for(int i=0;i<4;i++){ v += a*vnoise(p); p = m*p; a *= 0.5; }
  return v;
}
`;

export const OUTPUT_GLSL = /* glsl */ `
#include <tonemapping_fragment>
#include <colorspace_fragment>
`;
