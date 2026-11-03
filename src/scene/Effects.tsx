import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { effectiveQuality, useStore } from "@/store";
import { QUALITY } from "./quality";

/** Selective post-processing: bloom + vignette (disabled on the low preset). */
export function Effects() {
  const level = useStore((s) => effectiveQuality(s));
  const q = QUALITY[level];
  if (!q.bloom) return null;
  return (
    <EffectComposer multisampling={q.msaa} enableNormalPass={false}>
      <Bloom intensity={level === "high" ? 1.0 : 0.8} luminanceThreshold={0.62} luminanceSmoothing={0.25} mipmapBlur radius={0.7} />
      <Vignette offset={0.25} darkness={0.75} />
    </EffectComposer>
  );
}
