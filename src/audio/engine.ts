import type { WorldId } from "@/config/worlds";

/**
 * Procedural audio (original, synthesised in WebAudio — no licensed files).
 * Nothing is created until the visitor explicitly enables sound.
 */

type Stopper = () => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private hubGain: GainNode | null = null;
  private worldGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private hubStop: Stopper | null = null;
  private worldStop: Stopper | null = null;
  private currentWorld: WorldId | null = null;
  private volume = 0.6;
  private muted = false;
  enabled = false;

  /** Must be called from a user gesture. */
  async enable(volume: number, muted: boolean) {
    this.volume = volume;
    this.muted = muted;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) throw new Error("WebAudio unsupported");
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.hubGain = this.ctx.createGain();
      this.hubGain.gain.value = 0;
      this.hubGain.connect(this.master);
      this.worldGain = this.ctx.createGain();
      this.worldGain.gain.value = 0;
      this.worldGain.connect(this.master);
      this.noiseBuf = this.makeNoise(this.ctx);
      this.hubStop = this.buildHub();
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.enabled = true;
    this.applyVolume();
    this.ramp(this.hubGain!, this.currentWorld ? 0.25 : 1, 1.5);
    if (this.currentWorld) this.setWorld(this.currentWorld, true);
  }

  async disable() {
    this.enabled = false;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      window.setTimeout(() => {
        if (!this.enabled) void this.ctx?.suspend();
      }, 700);
    }
  }

  dispose() {
    this.hubStop?.();
    this.worldStop?.();
    void this.ctx?.close();
    this.ctx = null;
    this.enabled = false;
  }

  setVolume(v: number) {
    this.volume = v;
    this.applyVolume();
  }
  setMuted(m: boolean) {
    this.muted = m;
    this.applyVolume();
  }
  private applyVolume() {
    if (!this.ctx || !this.master) return;
    const target = this.enabled && !this.muted ? this.volume * 0.8 : 0;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.12);
  }
  private ramp(g: GainNode, v: number, t = 1) {
    if (!this.ctx) return;
    g.gain.cancelScheduledValues(this.ctx.currentTime);
    g.gain.setTargetAtTime(v, this.ctx.currentTime, t / 3);
  }

  private makeNoise(ctx: AudioContext) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02; // brown-ish
      d[i] = last * 3.5;
    }
    return buf;
  }

  private noise(out: AudioNode, type: BiquadFilterType, freq: number, gain: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(out);
    src.start();
    return { src, f, g };
  }

  private osc(out: AudioNode, type: OscillatorType, freq: number, gain: number, detune = 0) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    const g = ctx.createGain();
    g.gain.value = gain;
    o.connect(g).connect(out);
    o.start();
    return { o, g };
  }

  private lfo(target: AudioParam, rate: number, depth: number) {
    const ctx = this.ctx!;
    const l = ctx.createOscillator();
    l.frequency.value = rate;
    const g = ctx.createGain();
    g.gain.value = depth;
    l.connect(g).connect(target);
    l.start();
    return l;
  }

  /** Central hub ambience: deep drone + dimensional shimmer */
  private buildHub(): Stopper {
    const ctx = this.ctx!;
    const out = this.hubGain!;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 520;
    lp.connect(out);
    const nodes: (OscillatorNode | AudioBufferSourceNode)[] = [];
    nodes.push(this.osc(lp, "sawtooth", 55, 0.06).o);
    nodes.push(this.osc(lp, "sawtooth", 55.4, 0.06, 6).o);
    nodes.push(this.osc(lp, "triangle", 82.4, 0.09).o);
    nodes.push(this.osc(out, "sine", 27.5, 0.18).o);
    nodes.push(this.lfo(lp.frequency, 0.07, 180));
    const hiss = this.noise(out, "bandpass", 1400, 0.025);
    nodes.push(hiss.src);
    nodes.push(this.lfo(hiss.f.frequency, 0.05, 500));
    return () => nodes.forEach((n) => n.stop());
  }

  /** World-specific ambience, cross-faded over the hub bed. */
  setWorld(id: WorldId | null, force = false) {
    if (!this.ctx || !this.enabled) {
      this.currentWorld = id;
      return;
    }
    if (id === this.currentWorld && !force) return;
    this.currentWorld = id;
    const ctx = this.ctx;
    const old = this.worldStop;
    // fade out previous
    if (old) {
      const g = this.worldGain!;
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      window.setTimeout(old, 1200);
      this.worldStop = null;
    }
    this.ramp(this.hubGain!, id ? 0.25 : 1, 1.2);
    if (!id) return;
    // new layer with its own gain so cross-fade works
    const layer = ctx.createGain();
    layer.gain.value = 0;
    layer.connect(this.master!);
    const stop = this.buildWorld(id, layer);
    layer.gain.setTargetAtTime(1, ctx.currentTime + 0.1, 0.5);
    this.worldStop = () => {
      layer.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      window.setTimeout(() => {
        stop();
        layer.disconnect();
      }, 1200);
    };
  }

  private buildWorld(id: WorldId, out: GainNode): Stopper {
    const ctx = this.ctx!;
    const nodes: (OscillatorNode | AudioBufferSourceNode)[] = [];
    const timers: number[] = [];
    const note = (f: number, dur: number, vol: number, type: OscillatorType = "sine") => {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dur + 0.05);
    };
    if (id === "aether") {
      [220, 329.6, 493.9].forEach((f, i) => {
        const x = this.osc(out, "sine", f, 0.07, i * 4);
        nodes.push(x.o);
        nodes.push(this.lfo(x.g.gain, 0.1 + i * 0.05, 0.05));
      });
      const sh = this.noise(out, "highpass", 4500, 0.012);
      nodes.push(sh.src);
    } else if (id === "abyss") {
      const n = this.noise(out, "lowpass", 280, 0.5);
      nodes.push(n.src);
      nodes.push(this.lfo(n.f.frequency, 0.12, 140));
      nodes.push(this.osc(out, "sine", 41, 0.16).o);
      const call = () => {
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(260, t + 1.2);
        o.frequency.exponentialRampToValueAtTime(110, t + 3.2);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.1, t + 0.8);
        g.gain.linearRampToValueAtTime(0, t + 3.4);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + 3.5);
      };
      call();
      timers.push(window.setInterval(call, 6500));
    } else if (id === "neoverse") {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 600;
      lp.connect(out);
      nodes.push(this.osc(lp, "sawtooth", 110, 0.07).o);
      nodes.push(this.osc(lp, "square", 55, 0.05).o);
      const pulse = this.osc(out, "sine", 440, 0.0);
      nodes.push(pulse.o);
      nodes.push(this.lfo(pulse.g.gain, 2, 0.03));
      nodes.push(this.lfo(lp.frequency, 0.25, 300));
      const n = this.noise(out, "bandpass", 900, 0.03);
      nodes.push(n.src);
    } else if (id === "mythora") {
      const scale = [293.7, 349.2, 440, 523.3, 587.3, 698.5];
      nodes.push(this.osc(out, "triangle", 146.8, 0.06).o);
      nodes.push(this.osc(out, "sine", 220, 0.05, 5).o);
      timers.push(
        window.setInterval(() => note(scale[Math.floor(Math.random() * scale.length)], 2.4, 0.07, "sine"), 700),
      );
    } else {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 900;
      lp.connect(out);
      const a = this.osc(lp, "sawtooth", 70, 0.08);
      nodes.push(a.o);
      nodes.push(this.lfo(a.o.frequency, 0.3, 14));
      nodes.push(this.lfo(lp.frequency, 0.5, 500));
      nodes.push(this.osc(out, "sine", 880, 0.015).o);
      const n = this.noise(out, "bandpass", 2400, 0.03);
      nodes.push(n.src);
    }
    return () => {
      timers.forEach((t) => window.clearInterval(t));
      nodes.forEach((n) => {
        try {
          n.stop();
        } catch {
          /* already stopped */
        }
      });
    };
  }

  /** Short interface / portal sound effects */
  sfx(name: "hover" | "click" | "select" | "back" | "activate" | "transition") {
    if (!this.ctx || !this.master || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const out = this.master;
    const tone = (f0: number, f1: number, dur: number, vol: number, type: OscillatorType = "sine", delay = 0) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, t + delay);
      o.frequency.exponentialRampToValueAtTime(f1, t + delay + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t + delay);
      g.gain.linearRampToValueAtTime(vol, t + delay + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
      o.connect(g).connect(out);
      o.start(t + delay);
      o.stop(t + delay + dur + 0.05);
    };
    const sweep = (f0: number, f1: number, dur: number, vol: number) => {
      const s = ctx.createBufferSource();
      s.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = 2;
      f.frequency.setValueAtTime(f0, t);
      f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + dur * 0.4);
      g.gain.linearRampToValueAtTime(0, t + dur);
      s.connect(f).connect(g).connect(out);
      s.start(t);
      s.stop(t + dur + 0.05);
    };
    switch (name) {
      case "hover":
        tone(880, 1320, 0.12, 0.05);
        break;
      case "click":
        tone(520, 780, 0.09, 0.08, "triangle");
        break;
      case "select":
        sweep(200, 2400, 1.1, 1.6);
        tone(220, 440, 0.9, 0.1, "sawtooth");
        tone(330, 660, 0.9, 0.06, "sine", 0.05);
        break;
      case "back":
        sweep(2000, 200, 0.8, 1.2);
        tone(440, 220, 0.6, 0.07, "triangle");
        break;
      case "activate":
        tone(110, 880, 1.2, 0.12, "sawtooth");
        tone(165, 1320, 1.2, 0.08, "sine");
        sweep(150, 5000, 1.3, 2);
        break;
      case "transition":
        sweep(100, 3000, 1.4, 2.4);
        break;
    }
  }
}

export const audio = new AudioEngine();
