// Generates seamless-loop ambient sound assets for "凪 (Nagi)" as WAV files.
//
// These are procedurally synthesized (noise shaping + additive tones), not
// recordings, so there is no licensing question — but they are placeholders.
// Swap them for licensed/recorded nature audio (assets/sounds/*.wav) before
// shipping to the App Store; see assets/sounds/README.md.
'use strict';
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 22050;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'sounds');

// Deterministic PRNG so regenerating the assets is reproducible.
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

// Crossfades the tail into the head so the buffer loops with no click,
// then drops the redundant tail. Output is shorter than input by fadeSamples.
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

function mix(...buffers) {
  const n = Math.max(...buffers.map((b) => b.length));
  const out = new Float32Array(n);
  for (const b of buffers) {
    for (let i = 0; i < b.length; i++) out[i] += b[i];
  }
  return out;
}

function writeWav(filePath, samples, sampleRate = SAMPLE_RATE) {
  const numFrames = samples.length;
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample; // mono
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numFrames; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filePath, buffer);
  console.log(`wrote ${path.relative(process.cwd(), filePath)}  (${(buffer.length / 1024).toFixed(0)} KB, ${(numFrames / sampleRate).toFixed(1)}s)`);
}

const FADE = Math.round(0.35 * SAMPLE_RATE); // 350ms crossfade for noise-based loops

// --- 1. white noise -------------------------------------------------------
function genWhiteNoise() {
  const rand = mulberry32(1);
  const n = SAMPLE_RATE * 4 + FADE;
  const raw = whiteNoise(rand, n);
  return normalize(makeSeamless(raw, FADE), 0.5);
}

// --- 2. rain ---------------------------------------------------------------
function genRain() {
  const rand = mulberry32(2);
  const n = SAMPLE_RATE * 6 + FADE;
  let hiss = whiteNoise(rand, n);
  hiss = onePoleHighPass(hiss, 900);
  hiss = onePoleLowPass(hiss, 7000);
  // sparse droplet transients
  const drops = new Float32Array(n);
  const guard = FADE + SAMPLE_RATE * 0.2;
  let t = 0;
  while (t < n - guard) {
    t += Math.floor((0.01 + rand() * 0.05) * SAMPLE_RATE);
    if (t >= n - guard) break;
    const len = Math.floor(0.02 * SAMPLE_RATE);
    for (let i = 0; i < len && t + i < n; i++) {
      const env = Math.exp(-i / (len * 0.25));
      drops[t + i] += (rand() * 2 - 1) * env * 0.6;
    }
  }
  const filteredDrops = onePoleHighPass(onePoleLowPass(drops, 5000), 1200);
  const buf = mix(scale(hiss, 0.35), scale(filteredDrops, 0.9));
  return normalize(makeSeamless(buf, FADE), 0.55);
}

function scale(buf, g) {
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] * g;
  return out;
}

// --- 3. waves ----------------------------------------------------------
function genWaves() {
  const rand = mulberry32(3);
  const lfoHz = 0.125; // one swell every 8s
  const cycles = 2;
  const seconds = cycles / lfoHz; // exact multiple -> envelope loops cleanly
  const n = Math.round(SAMPLE_RATE * seconds) + FADE;
  let brown = whiteNoise(rand, n);
  brown = onePoleLowPass(brown, 900);
  brown = normalize(brown, 0.8);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const phase = (2 * Math.PI * lfoHz * i) / SAMPLE_RATE;
    const swell = 0.45 + 0.55 * Math.pow((Math.sin(phase - Math.PI / 2) + 1) / 2, 1.6);
    out[i] = brown[i] * swell;
  }
  return normalize(makeSeamless(out, FADE), 0.7);
}

// --- 4. campfire -------------------------------------------------------
function genCampfire() {
  const rand = mulberry32(4);
  const n = SAMPLE_RATE * 8 + FADE;
  let hiss = whiteNoise(rand, n);
  hiss = onePoleLowPass(hiss, 2200);
  const crackle = new Float32Array(n);
  const guard = FADE + SAMPLE_RATE * 0.15;
  let t = 0;
  while (t < n - guard) {
    t += Math.floor((0.05 + rand() * 0.18) * SAMPLE_RATE);
    if (t >= n - guard) break;
    const len = Math.floor((0.008 + rand() * 0.01) * SAMPLE_RATE);
    for (let i = 0; i < len && t + i < n; i++) {
      const env = Math.exp(-i / (len * 0.2));
      crackle[t + i] += (rand() * 2 - 1) * env;
    }
  }
  const pop = onePoleHighPass(crackle, 800);
  const buf = mix(scale(hiss, 0.25), scale(pop, 1.1));
  return normalize(makeSeamless(buf, FADE), 0.55);
}

// --- 5. cafe murmur ------------------------------------------------------
function genCafe() {
  const rand = mulberry32(5);
  const n = SAMPLE_RATE * 7 + FADE;
  let murmur = whiteNoise(rand, n);
  murmur = onePoleHighPass(murmur, 250);
  murmur = onePoleLowPass(murmur, 1800);
  // slow random-walk amplitude so it swells like distant conversation
  const env = new Float32Array(n);
  let level = 0.6;
  for (let i = 0; i < n; i++) {
    level += (rand() - 0.5) * 0.01;
    level = Math.max(0.35, Math.min(1, level));
    env[i] = level;
  }
  const clink = new Float32Array(n);
  const guard = FADE + SAMPLE_RATE * 0.2;
  let t = 0;
  while (t < n - guard) {
    t += Math.floor((0.4 + rand() * 1.4) * SAMPLE_RATE);
    if (t >= n - guard) break;
    const freq = 1800 + rand() * 1400;
    const len = Math.floor(0.12 * SAMPLE_RATE);
    for (let i = 0; i < len && t + i < n; i++) {
      const decay = Math.exp(-i / (len * 0.18));
      clink[t + i] += Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE) * decay * 0.15;
    }
  }
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = murmur[i] * env[i] * 0.5 + clink[i];
  return normalize(makeSeamless(out, FADE), 0.45);
}

// --- 6. wind chimes ------------------------------------------------------
function genWindChimes() {
  const rand = mulberry32(6);
  const seconds = 22;
  const n = Math.round(SAMPLE_RATE * seconds);
  const out = new Float32Array(n);
  const bed = onePoleLowPass(whiteNoise(mulberry32(60), n), 500);
  for (let i = 0; i < n; i++) out[i] = bed[i] * 0.03; // faint air/wind bed

  // pentatonic scale (A major pentatonic-ish) for pleasant, non-dissonant hits
  const scaleFreqs = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  const decaySeconds = 3.2;
  const lastHitLimit = n - Math.round((decaySeconds + 0.3) * SAMPLE_RATE); // let every note ring out before loop end
  let t = Math.round(0.4 * SAMPLE_RATE);
  while (t < lastHitLimit) {
    const freq = scaleFreqs[Math.floor(rand() * scaleFreqs.length)];
    const len = Math.round(decaySeconds * SAMPLE_RATE);
    const amp = 0.12 + rand() * 0.1;
    for (let i = 0; i < len && t + i < n; i++) {
      const decay = Math.exp(-i / (SAMPLE_RATE * 1.1));
      const s =
        Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE) * 1.0 +
        Math.sin((2 * Math.PI * freq * 2.76 * i) / SAMPLE_RATE) * 0.35 +
        Math.sin((2 * Math.PI * freq * 5.4 * i) / SAMPLE_RATE) * 0.15;
      out[t + i] += s * decay * amp;
    }
    t += Math.round((1.2 + rand() * 3.0) * SAMPLE_RATE);
  }
  return normalize(out, 0.55); // no crossfade needed: starts/ends near silence
}

// --- 7. sleeping breath ----------------------------------------------------
// 「隣で誰かが眠っている」気配を作る、ゆっくり深い寝息のループ。
// 気配アプリの breath_loop(4.8秒/回、やや起きている気配)より周期を長く・
// 帯域を低くこもらせて、熟睡している人の呼吸らしい質感にしている。
function genSleepingBreath() {
  const rand = mulberry32(21);
  const breathHz = 1 / 6.4; // 1分あたり約9.4回、深い眠りのゆったりした呼吸
  const cycles = 3;
  const seconds = cycles / breathHz;
  const n = Math.round(SAMPLE_RATE * seconds) + FADE;
  let hiss = whiteNoise(rand, n);
  hiss = onePoleHighPass(hiss, 120);
  hiss = onePoleLowPass(hiss, 480);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const phase = (2 * Math.PI * breathHz * i) / SAMPLE_RATE;
    const swell = 0.18 + 0.82 * Math.pow((Math.sin(phase - Math.PI / 2) + 1) / 2, 1.8);
    out[i] = hiss[i] * swell;
  }
  return normalize(makeSeamless(out, FADE), 0.35);
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  writeWav(path.join(OUT_DIR, 'white_noise.wav'), genWhiteNoise());
  writeWav(path.join(OUT_DIR, 'rain.wav'), genRain());
  writeWav(path.join(OUT_DIR, 'waves.wav'), genWaves());
  writeWav(path.join(OUT_DIR, 'campfire.wav'), genCampfire());
  writeWav(path.join(OUT_DIR, 'cafe.wav'), genCafe());
  writeWav(path.join(OUT_DIR, 'wind_chimes.wav'), genWindChimes());
  writeWav(path.join(OUT_DIR, 'sleeping_breath.wav'), genSleepingBreath());
}

main();
