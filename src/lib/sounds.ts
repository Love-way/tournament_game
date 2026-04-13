let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

/* ─── Goal celebration (used on registration success) ─── */
export function playGoalSound() {
  try {
    const c = getCtx();

    // 1. Crowd roar — filtered white noise that swells
    const bufLen = Math.floor(c.sampleRate * 2.5);
    const buf    = c.createBuffer(1, bufLen, c.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const noise = c.createBufferSource();
    noise.buffer = buf;

    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600;
    filter.Q.value = 0.4;

    const noiseGain = c.createGain();
    noiseGain.gain.setValueAtTime(0, c.currentTime);
    noiseGain.gain.linearRampToValueAtTime(0.35, c.currentTime + 0.25);
    noiseGain.gain.linearRampToValueAtTime(0.55, c.currentTime + 0.8);
    noiseGain.gain.linearRampToValueAtTime(0.15, c.currentTime + 2.5);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(c.destination);
    noise.start(c.currentTime);
    noise.stop(c.currentTime + 2.5);

    // 2. Referee whistle
    const w = c.createOscillator();
    const wg = c.createGain();
    w.type = 'sine';
    w.frequency.setValueAtTime(1500, c.currentTime);
    w.frequency.linearRampToValueAtTime(1900, c.currentTime + 0.12);
    w.frequency.linearRampToValueAtTime(1700, c.currentTime + 0.28);
    wg.gain.setValueAtTime(0.4, c.currentTime);
    wg.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
    w.connect(wg); wg.connect(c.destination);
    w.start(c.currentTime); w.stop(c.currentTime + 0.35);

    // 3. Celebration ascending melody
    const melody = [523, 659, 784, 880, 1047];
    melody.forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = c.currentTime + 0.3 + i * 0.13;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain); gain.connect(c.destination);
      osc.start(t); osc.stop(t + 0.3);
    });
  } catch (_) {}
}

/* kept as alias so existing imports don't break */
export const playRegistrationMelody = playGoalSound;
export function playClickSound() {}
export function playWhistle() {}
export function playChampionFanfare() {}
