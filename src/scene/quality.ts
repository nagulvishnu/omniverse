import type { QualityLevel } from "@/store";

export interface QualityPreset {
  dprMin: number;
  dprMax: number;
  bloom: boolean;
  bloomRes: number;
  msaa: number;
  reflector: boolean;
  particles: number; // multiplier
  floaters: number;
  pillars: number;
}

export const QUALITY: Record<QualityLevel, QualityPreset> = {
  low: { dprMin: 0.6, dprMax: 1, bloom: false, bloomRes: 256, msaa: 0, reflector: false, particles: 0.35, floaters: 14, pillars: 24 },
  medium: { dprMin: 0.8, dprMax: 1.5, bloom: true, bloomRes: 384, msaa: 0, reflector: false, particles: 0.7, floaters: 28, pillars: 40 },
  high: { dprMin: 1, dprMax: 2, bloom: true, bloomRes: 512, msaa: 4, reflector: true, particles: 1, floaters: 44, pillars: 60 },
};
