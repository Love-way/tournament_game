let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return ctx;
}

/* ─── Whistle (page load) ─── */
export function playWhistle() {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1800, c.currentTime + 0.08);
    osc.frequency.exponentialRampToValueAtTime(1400, c.currentTime + 0.25);
    osc.frequency.exponentialRampToValueAtTime(1800, c.currentTime + 0.4);
    gain.gain.setValueAtTime(0.35, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.6);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.6);
  } catch (_) {}
}

/* ─── Registration melody (ascending scale) ─── */
export function playRegistrationMelody() {
  try {
    const c = getCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = 'sine';
      const t = c.currentTime + i * 0.13;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  } catch (_) {}
}

/* ─── Button click ─── */
export function playClickSound() {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.12);
  } catch (_) {}
}

/* ─── Champion fanfare ─── */
export function playChampionFanfare() {
  try {
    const c = getCtx();
    const melody = [
      { f: 523.25, t: 0, d: 0.18 },
      { f: 523.25, t: 0.18, d: 0.18 },
      { f: 523.25, t: 0.36, d: 0.18 },
      { f: 523.25, t: 0.54, d: 0.35 },
      { f: 415.3,  t: 0.54, d: 0.35 },
      { f: 659.25, t: 0.9, d: 0.35 },
      { f: 523.25, t: 1.25, d: 0.35 },
      { f: 659.25, t: 1.6, d: 0.35 },
      { f: 783.99, t: 1.95, d: 0.8 },
      { f: 1046.5, t: 2.75, d: 1.0 },
    ];
    melody.forEach(({ f, t, d }) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = 'sawtooth';
      const start = c.currentTime + t;
      osc.frequency.setValueAtTime(f, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, start + d);
      osc.start(start);
      osc.stop(start + d + 0.05);
    });
  } catch (_) {}
}
