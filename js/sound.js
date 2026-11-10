// Era "sound sketches": rhythm loops synthesised live with the Web Audio API.
// Nothing here is a recording, so there is no licensing to worry about.

let ctx, master, analyser, delay, delayGain;
let timer = null, step = 0, nextTime = 0, era = null, endAt = 0, onEndCb = null, drone = null;

const D4 = 293.66;
const HIJAZ = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16];
const NAHAWAND = [0, 2, 3, 5, 7, 8, 11, 12, 14, 15];
const hz = (scale, deg, oct = 0) => D4 * Math.pow(2, (scale[deg] + 12 * oct) / 12);

// Maqsoum on 16th-note grid: D . T . . . T . D . . . T . . .
const MAQ_D = [0, 8], MAQ_T = [2, 6, 12];

const ERAS = {
  '70s': { bpm: 100, scale: HIJAZ, lead: 'accordion', drone: true, delay: 0.12,
    mel: [0,null,2,null,3,null,2,1, 0,null,null,null,4,3,2,null, 3,null,4,null,5,null,4,3, 2,null,1,null,0,null,null,null] },
  '80s': { bpm: 84, scale: NAHAWAND, lead: 'mournful', drone: true, delay: 0.35,
    mel: [4,null,null,null,3,null,2,null, 3,null,null,null,null,null,2,1, 2,null,null,null,1,null,0,null, 1,null,null,null,0,null,null,null] },
  '90s': { bpm: 112, scale: HIJAZ, lead: 'synth', drone: false, delay: 0.18,
    mel: [7,null,7,6,7,null,4,null, 5,null,5,4,5,null,2,null, 4,null,4,3,4,null,2,null, 1,null,2,null,0,null,null,null] },
  '00s': { bpm: 132, scale: HIJAZ, lead: 'mahragan', drone: false, delay: 0.15,
    mel: [7,7,null,7,8,null,7,6, 7,null,4,null,5,4,2,null, 7,7,null,7,9,null,8,7, 5,null,4,null,2,1,0,null] }
};

function ensure() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0.55;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  analyser = ctx.createAnalyser(); analyser.fftSize = 1024;
  delay = ctx.createDelay(1); delay.delayTime.value = 0.3;
  delayGain = ctx.createGain(); delayGain.gain.value = 0.2;
  const fb = ctx.createGain(); fb.gain.value = 0.35;
  delay.connect(fb); fb.connect(delay); delay.connect(delayGain); delayGain.connect(master);
  master.connect(comp); comp.connect(analyser); analyser.connect(ctx.destination);
}

let noiseBuf;
function noise() {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; return s;
}
function env(g, t, a, peak, d) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

function dum(t, v = 0.9, low = 55) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(low, t + 0.16);
  env(g, t, 0.004, v, 0.38); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.45);
}
function tak(t, v = 0.45, f = 3600) {
  const n = noise(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
  bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 1.4;
  env(g, t, 0.002, v, 0.07); n.connect(bp); bp.connect(g); g.connect(master); n.start(t); n.stop(t + 0.1);
}
function hat(t, v = 0.15) {
  const n = noise(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
  hp.type = 'highpass'; hp.frequency.value = 7500;
  env(g, t, 0.001, v, 0.035); n.connect(hp); hp.connect(g); g.connect(master); n.start(t); n.stop(t + 0.06);
}
function clap(t, v = 0.5) {
  [0, 0.012, 0.024].forEach(o => tak(t + o, v * 0.7, 1400));
}
function kick808(t, v = 1) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.25);
  env(g, t, 0.003, v, 0.7); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.8);
}
function bass(t, f, dur) {
  const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'square'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 600;
  env(g, t, 0.005, 0.28, dur); o.connect(lp); lp.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}

function lead(t, f, dur, kind) {
  const g = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  const oscs = [];
  const mk = (type, det = 0) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; oscs.push(o); return o; };
  let peak = 0.16, att = 0.02;
  if (kind === 'accordion') { mk('sawtooth', -9); mk('sawtooth', 9); lp.frequency.value = 2000; peak = 0.11; }
  if (kind === 'mournful') { mk('triangle'); mk('sine', 5); lp.frequency.value = 1600; peak = 0.22; att = 0.08; }
  if (kind === 'synth') { mk('square'); mk('sawtooth', 7); lp.frequency.value = 2600; peak = 0.09; att = 0.005; }
  if (kind === 'mahragan') {
    mk('sawtooth', -6); mk('sawtooth', 6); lp.frequency.value = 3400; peak = 0.1; att = 0.003;
    // hard "autotune"-like glide into the note
    oscs.forEach(o => { o.frequency.setValueAtTime(f * 0.94, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.03); });
  }
  // vibrato
  const lfo = ctx.createOscillator(), lg = ctx.createGain();
  lfo.frequency.value = kind === 'mournful' ? 5.5 : 6.5; lg.gain.value = kind === 'mahragan' ? 0 : f * 0.008;
  lfo.connect(lg); oscs.forEach(o => lg.connect(o.frequency));
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + att);
  g.gain.setValueAtTime(peak, t + dur * 0.75);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  oscs.forEach(o => { o.connect(lp); o.start(t); o.stop(t + dur + 0.05); });
  lfo.start(t); lfo.stop(t + dur + 0.05);
  lp.connect(g); g.connect(master); g.connect(delay);
}

function startDrone(cfg) {
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
  o1.type = 'sawtooth'; o2.type = 'sawtooth'; o1.frequency.value = D4 / 4; o2.frequency.value = (D4 / 4) * 1.5; o2.detune.value = 4;
  lp.type = 'lowpass'; lp.frequency.value = 380; g.gain.value = 0;
  g.gain.linearRampToValueAtTime(cfg.lead === 'mournful' ? 0.07 : 0.05, ctx.currentTime + 1);
  o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master); o1.start(); o2.start();
  return { stop() { const t = ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + 0.3); o1.stop(t + 0.35); o2.stop(t + 0.35); } };
}

function schedule(cfg, s, t) {
  const sixteenth = 60 / cfg.bpm / 4;
  const pos = s % 16, bar = Math.floor(s / 16);
  // percussion per era
  if (cfg.lead === 'accordion' || cfg.lead === 'mournful') {
    if (MAQ_D.includes(pos)) dum(t, 0.9);
    if (MAQ_T.includes(pos)) tak(t, cfg.lead === 'mournful' ? 0.3 : 0.45);
    if (cfg.lead === 'accordion' && (pos === 3 || pos === 14)) tak(t, 0.18, 5000);
  }
  if (cfg.lead === 'synth') {
    if (pos === 0 || pos === 8) kick808(t, 0.8);
    if (pos === 4 || pos === 12) clap(t, 0.45);
    if (MAQ_T.includes(pos)) tak(t, 0.3);
    if (pos % 2 === 0) hat(t, 0.08);
    if ([0, 6, 8, 12].includes(pos)) bass(t, hz(cfg.scale, 0, -2), sixteenth * 1.8);
  }
  if (cfg.lead === 'mahragan') {
    if (MAQ_D.includes(pos) || pos === 14) kick808(t, 1);
    if (MAQ_T.includes(pos)) clap(t, 0.55);
    hat(t, pos % 2 ? 0.12 : 0.06);
    if (pos === 0 && bar % 2 === 1) { // rising siren
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(400, t); o.frequency.exponentialRampToValueAtTime(1600, t + sixteenth * 14);
      env(g, t, 0.05, 0.03, sixteenth * 14); o.connect(g); g.connect(master); o.start(t); o.stop(t + sixteenth * 15);
    }
  }
  // melody
  const deg = cfg.mel[s % cfg.mel.length];
  if (deg !== null && deg !== undefined) {
    let len = 1; while (cfg.mel[(s + len) % cfg.mel.length] === null && len < 6) len++;
    lead(t, hz(cfg.scale, deg), sixteenth * len * 0.95, cfg.lead);
  }
}

function tick() {
  const cfg = ERAS[era];
  const sixteenth = 60 / cfg.bpm / 4;
  while (nextTime < ctx.currentTime + 0.12) {
    schedule(cfg, step, nextTime);
    nextTime += sixteenth; step++;
  }
  if (ctx.currentTime > endAt) stop();
}

export async function play(id, onEnd) {
  ensure();
  if (ctx.state === 'suspended') await ctx.resume();
  stop(true);
  era = id; onEndCb = onEnd; step = 0;
  const cfg = ERAS[id];
  delay.delayTime.value = 60 / cfg.bpm * 0.75; delayGain.gain.value = cfg.delay;
  master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(0.55, ctx.currentTime);
  nextTime = ctx.currentTime + 0.06;
  endAt = ctx.currentTime + 16;
  if (cfg.drone) drone = startDrone(cfg);
  timer = setInterval(tick, 25);
}

export function stop(silent) {
  if (timer) { clearInterval(timer); timer = null; }
  if (drone) { drone.stop(); drone = null; }
  if (ctx) { const t = ctx.currentTime; master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0.0001, t + 0.25); }
  const cb = onEndCb; onEndCb = null; era = null;
  if (cb && !silent) cb();
  else if (cb && silent) cb();
}

export const getAnalyser = () => analyser || null;
export const isPlaying = () => !!timer;
