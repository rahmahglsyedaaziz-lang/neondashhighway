/**
 * Procedural WebAudio sound - no external assets, instant load.
 * Engine hum, lane switch, near miss, coin, crash + a looping music bed.
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private _muted = false;

  get muted() {
    return this._muted;
  }

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  unlock() {
    this.ensure();
  }

  setMuted(muted: boolean) {
    this._muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
  }

  private blip(freq: number, dur: number, type: OscillatorType, vol = 0.2, slideTo?: number) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain).connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  startEngine() {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.engineOsc) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 70;
    gain.gain.value = 0.05;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 380;
    osc.connect(filter).connect(gain).connect(this.master);
    osc.start();
    this.engineOsc = osc;
    this.engineGain = gain;
  }

  setEngineIntensity(t: number) {
    if (!this.engineOsc || !this.ctx) return;
    this.engineOsc.frequency.setTargetAtTime(65 + t * 85, this.ctx.currentTime, 0.2);
    this.engineGain?.gain.setTargetAtTime(0.04 + t * 0.03, this.ctx.currentTime, 0.2);
  }

  stopEngine() {
    try {
      this.engineOsc?.stop();
    } catch {
      /* already stopped */
    }
    this.engineOsc = null;
    this.engineGain = null;
  }

  laneSwitch() {
    this.blip(420, 0.12, "triangle", 0.12, 700);
  }

  nearMiss(combo: number) {
    this.blip(660 + Math.min(combo, 8) * 60, 0.16, "square", 0.1);
  }

  coin() {
    this.blip(880, 0.09, "square", 0.12);
    window.setTimeout(() => this.blip(1320, 0.12, "square", 0.1), 70);
  }

  powerup() {
    this.blip(520, 0.3, "sawtooth", 0.12, 1200);
  }

  crash() {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const dur = 0.7;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.2);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
    this.blip(120, 0.5, "sawtooth", 0.25, 40);
  }

  countdownTick(final: boolean) {
    this.blip(final ? 880 : 520, final ? 0.3 : 0.14, "triangle", 0.15);
  }

  startMusic() {
    if (this.musicTimer !== null) return;
    this.ensure();
    const bass = [55, 55, 73.42, 65.41];
    const lead = [220, 293.66, 261.63, 329.63, 246.94, 293.66, 220, 196];
    this.musicTimer = window.setInterval(() => {
      const step = this.musicStep++;
      this.blip(bass[step % bass.length], 0.28, "triangle", 0.09);
      if (step % 2 === 0) this.blip(lead[step % lead.length], 0.22, "sine", 0.055);
    }, 300);
  }

  stopMusic() {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  dispose() {
    this.stopMusic();
    this.stopEngine();
    void this.ctx?.close();
    this.ctx = null;
  }
}
