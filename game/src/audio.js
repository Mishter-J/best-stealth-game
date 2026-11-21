// All sound is synthesised with WebAudio: short oscillator tones, no audio
// files, nothing fetched. Footsteps tell you where a warden is; the alert
// sting tells you you have been seen. Created lazily on the first gesture,
// so the page never needs an autoplay permission before the player acts.
export class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  tone(freq, dur, type = 'sine', gain = 0.2, slideTo = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(amp);
    amp.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** A soft footfall; pitch alternates left/right so steps read as walking. */
  footstep(sprint, left) {
    this.tone(sprint ? 150 : 110, 0.07, 'sine', sprint ? 0.16 : 0.09, 70);
    if (left) this.tone(95, 0.05, 'triangle', 0.05, 60);
  }

  /** A warden's boot on stone, a touch louder and lower than the player's. */
  guardStep() {
    this.tone(85, 0.08, 'sine', 0.05, 55);
  }

  /** The two-note sting when a warden spots you. */
  alert() {
    this.tone(660, 0.12, 'square', 0.12);
    this.tone(440, 0.2, 'square', 0.12, null, 0.12);
  }

  /** A warden grows curious: a single questioning blip. */
  suspicious() {
    this.tone(520, 0.1, 'triangle', 0.1, 700);
  }

  pickup() {
    this.tone(880, 0.09, 'sine', 0.16);
    this.tone(1174, 0.09, 'sine', 0.16, null, 0.09);
    this.tone(1568, 0.16, 'sine', 0.16, null, 0.18);
  }

  throwPebble() {
    this.tone(300, 0.05, 'square', 0.08, 180);
  }

  pebbleLand() {
    this.tone(240, 0.06, 'triangle', 0.1, 140);
    this.tone(180, 0.08, 'triangle', 0.08, 110, 0.05);
  }

  doorUnlock() {
    this.tone(392, 0.1, 'sine', 0.14);
    this.tone(523, 0.1, 'sine', 0.14, null, 0.1);
    this.tone(659, 0.2, 'sine', 0.14, null, 0.2);
  }

  levelClear() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, 'sine', 0.15, null, i * 0.11));
  }

  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.15, null, i * 0.13));
  }

  caught() {
    this.tone(392, 0.18, 'sawtooth', 0.12, 300);
    this.tone(311, 0.18, 'sawtooth', 0.12, 220, 0.16);
    this.tone(233, 0.4, 'sawtooth', 0.12, 140, 0.32);
  }
}
