// Generates "presence" ambience for 気配 -Kehai-: a soft breathing loop plus a
// few short "someone's quietly here" one-shot sounds (sigh / stretch / hum /
// page turn). All procedurally synthesized (noise shaping + tone synthesis),
// not recordings — same technique as 凪's scripts/generate-sounds.js.
'use strict';
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 22050;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'sounds');

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function onePoleLowPass(input, cutoffHz) {
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / SAMPLE_RATE;
  const alpha = dt / (rc + dt);
  const out = new Float32Array(input.length);
  let prev = 0;
  for (let i = 0; i < input.length; i++) {
    prev = prev + alpha * (input[i] - prev);
    out[i] = prev;
  }
  return out;
}

function onePoleHighPass(input, cutoffHz) {
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / SAMPLE_RATE;
  const alpha = rc / (rc + dt);
  const out = new Float32Array(input.length);
  let prevIn = 0;
  let prevOut = 0;
  for (let i = 0; i < input.length; i++) {
    const cur = alpha * (prevOut + input[i] - prevIn);
    out[i] = cur;
    prevIn = input[i];
    prevOut = cur;
  }
  return out;
}

function whiteNoise(rand, n) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = rand() * 2 - 1;
  return out;
}

function normalize(buf, peak = 0.9) {
  let max = 0;
  for (let i = 0; i < buf.length; i++) max = Math.max(max, Math.abs(buf[i]));
  if (max === 0) return buf;
  const gain = peak / max;
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] * gain;
  return out;
}

function scale(buf, g) {
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] * g;
  return out;
}

function mix(...buffers) {
  const n = Math.max(...buffers.map((b) => b.length));
  const out = new Float32Array(n);
  for (const b of buffers) for (let i = 0; i < b.length; i++) out[i] += b[i];
  return out;
}

// Crossfades the tail into the head so the buffer loops with no click.
function makeSeamless(buf, fadeSamples) {
  const n = buf.length - fadeSamples;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = buf[i];
  for (let i = 0; i < fadeSamples; i++) {
    const t = i / fadeSamples;
    out[i] = buf[i] * t + buf[n + i] * (1 - t);
  }
  return out;
}

function writeWav(filePath, samples, sampleRate = SAMPLE_RATE) {
  const numFrames = samples.length;
  const dataSize = numFrames * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numFrames; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filePath, buffer);
  console.log(`wrote ${path.relative(process.cwd(), filePath)}  (${(buffer.length / 1024).toFixed(0)} KB, ${(numFrames / sampleRate).toFixed(1)}s)`);
}

const FADE = Math.round(0.4 * SAMPLE_RATE);

// --- breathing loop --------------------------------------------------------
// 呼吸1回=約4.8秒(1分あたり12.5回)のスウェルを4回ぶん、ループ境界が
// 位相ぴったりで繋がるようにする。
function genBreathLoop() {
  const rand = mulberry32(11);
  const breathHz = 1 / 4.8;
  const cycles = 4;
  const seconds = cycles / breathHz;
  const n = Math.round(SAMPLE_RATE * seconds) + FADE;
  let hiss = whiteNoise(rand, n);
  hiss = onePoleHighPass(hiss, 180);
  hiss = onePoleLowPass(hiss, 750);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const phase = (2 * Math.PI * breathHz * i) / SAMPLE_RATE;
    const swell = 0.22 + 0.78 * Math.pow((Math.sin(phase - Math.PI / 2) + 1) / 2, 1.4);
    out[i] = hiss[i] * swell;
  }
  return normalize(makeSeamless(out, FADE), 0.4);
}

// --- one-shot: soft sigh ----------------------------------------------------
function genSigh() {
  const rand = mulberry32(12);
  const n = Math.round(SAMPLE_RATE * 1.6);
  let breath = whiteNoise(rand, n);
  breath = onePoleHighPass(breath, 200);
  breath = onePoleLowPass(breath, 550);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const decayT = (t - 0.15) / 0.55;
    const env = t < 0.15 ? t / 0.15 : Math.exp(-(decayT * decayT)) * (1 - (t - 0.15) * 0.3);
    out[i] = breath[i] * env;
  }
  return normalize(out, 0.5);
}

// --- one-shot: stretch / fabric rustle --------------------------------------
function genStretch() {
  const rand = mulberry32(13);
  const n = Math.round(SAMPLE_RATE * 1.1);
  const out = new Float32Array(n);
  let t = Math.round(0.02 * SAMPLE_RATE);
  while (t < n - Math.round(0.05 * SAMPLE_RATE)) {
    const len = Math.round((0.03 + rand() * 0.05) * SAMPLE_RATE);
    for (let i = 0; i < len && t + i < n; i++) {
      const env = Math.sin((Math.PI * i) / len);
      out[t + i] += (rand() * 2 - 1) * env * 0.7;
    }
    t += Math.round((0.02 + rand() * 0.06) * SAMPLE_RATE);
  }
  let rustle = onePoleHighPass(out, 1200);
  rustle = onePoleLowPass(rustle, 5000);
  const globalEnv = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t2 = i / n;
    globalEnv[i] = Math.sin(Math.PI * t2) ** 0.6;
  }
  const shaped = new Float32Array(n);
  for (let i = 0; i < n; i++) shaped[i] = rustle[i] * globalEnv[i];
  return normalize(shaped, 0.45);
}

// --- one-shot: gentle hum ----------------------------------------------------
function genHum() {
  const n = Math.round(SAMPLE_RATE * 2.0);
  const out = new Float32Array(n);
  const notes = [329.63, 293.66]; // ゆったりした2音(E4 -> D4)
  const noteLen = n / notes.length;
  notes.forEach((freq, idx) => {
    const start = Math.round(idx * noteLen);
    const len = Math.round(noteLen * 1.15);
    for (let i = 0; i < len && start + i < n; i++) {
      const t = i / SAMPLE_RATE;
      const env = Math.sin((Math.PI * i) / len) * Math.exp(-t * 0.8);
      const s = Math.sin(2 * Math.PI * freq * t) + 0.3 * Math.sin(2 * Math.PI * freq * 2 * t);
      out[start + i] += s * env * 0.22;
    }
  });
  return normalize(out, 0.4);
}

// --- one-shot: page turn -----------------------------------------------------
function genPageTurn() {
  const rand = mulberry32(14);
  const n = Math.round(SAMPLE_RATE * 0.7);
  let noise = whiteNoise(rand, n);
  noise = onePoleHighPass(noise, 2000);
  noise = onePoleLowPass(noise, 7000);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = Math.exp(-t * 6) * (1 - Math.exp(-t * 60));
    out[i] = noise[i] * env;
  }
  return normalize(out, 0.5);
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  writeWav(path.join(OUT_DIR, 'breath_loop.wav'), genBreathLoop());
  writeWav(path.join(OUT_DIR, 'sigh.wav'), genSigh());
  writeWav(path.join(OUT_DIR, 'stretch.wav'), genStretch());
  writeWav(path.join(OUT_DIR, 'hum.wav'), genHum());
  writeWav(path.join(OUT_DIR, 'page_turn.wav'), genPageTurn());
}

main();
