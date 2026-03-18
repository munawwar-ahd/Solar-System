/**
 * ═══════════════════════════════════════════════════════
 *  SOLAR SYSTEM 3D SIMULATION
 *  Three.js WebGL — Cinematic Planetary Simulation
 * ═══════════════════════════════════════════════════════
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ═══════════════════════════════════════════════════════
//  SECTION 1: NOISE & MATH UTILITIES
// ═══════════════════════════════════════════════════════

function hash2(x, y) {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

function smoothNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x, y, octaves = 5, lacunarity = 2, gain = 0.5) {
  let val = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, y * freq) * amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return val;
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const lerpColor = (c1, c2, t) => [
  Math.floor(lerp(c1[0], c2[0], t)),
  Math.floor(lerp(c1[1], c2[1], t)),
  Math.floor(lerp(c1[2], c2[2], t)),
];

// ═══════════════════════════════════════════════════════
//  SECTION 2: PROCEDURAL PLANET TEXTURE GENERATION
// ═══════════════════════════════════════════════════════

function makeCanvas(W, H) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  return c;
}

function pixelTexture(type) {
  const W = 1024, H = 512;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d = img.data;

  const setPixel = (x, y, r, g, b, a = 255) => {
    const i = (y * W + x) * 4;
    d[i] = clamp(r, 0, 255);
    d[i + 1] = clamp(g, 0, 255);
    d[i + 2] = clamp(b, 0, 255);
    d[i + 3] = a;
  };

  const getPixel = (x, y) => {
    const i = (y * W + x) * 4;
    return [d[i], d[i + 1], d[i + 2]];
  };

  const blendPixel = (x, y, r, g, b, t) => {
    const [pr, pg, pb] = getPixel(x, y);
    setPixel(x, y,
      Math.floor(lerp(pr, r, t)),
      Math.floor(lerp(pg, g, t)),
      Math.floor(lerp(pb, b, t))
    );
  };

  if (type === 'sun') {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = x / W * 9, ny = y / H * 4.5;
        const n1 = fbm(nx, ny, 7, 2.1, 0.55);
        const n2 = fbm(nx + 17.3, ny + 5.7, 5, 2, 0.5);
        const n3 = fbm(nx * 2, ny * 2 + 9, 4, 2, 0.45);
        const t = (n1 * 0.6 + n2 * 0.3 + n3 * 0.1);
        const r = clamp(Math.floor(255), 0, 255);
        const g = clamp(Math.floor(lerp(140, 235, t)), 0, 255);
        const b = clamp(Math.floor(lerp(0, 60, t * t)), 0, 255);
        setPixel(x, y, r, g, b);
      }
    }
    // Sunspots
    const spotCount = 12;
    for (let s = 0; s < spotCount; s++) {
      const sx = Math.floor(100 + Math.random() * (W - 200));
      const sy = Math.floor(H * 0.25 + Math.random() * H * 0.5);
      const sr = 8 + Math.random() * 20;
      for (let dy = -sr; dy <= sr; dy++) {
        for (let dx = -sr; dx <= sr; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy) / sr;
          if (dist < 1) {
            const t = Math.pow(1 - dist, 1.5) * 0.55;
            const px = (sx + dx + W) % W;
            const py = clamp(sy + dy, 0, H - 1);
            blendPixel(px, py, 180, 70, 0, t);
          }
        }
      }
    }
  }

  else if (type === 'mercury') {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = x / W * 9, ny = y / H * 4.5;
        const n = fbm(nx, ny, 7, 2.1, 0.55);
        const v = Math.floor(lerp(95, 185, n));
        setPixel(x, y, v, v - 5, v - 12);
      }
    }
    // Craters
    for (let i = 0; i < 100; i++) {
      const cx = Math.floor(Math.random() * W);
      const cy = Math.floor(Math.random() * H);
      const cr = 2 + Math.random() * 16;
      for (let dy = -cr; dy <= cr; dy++) {
        for (let dx = -cr; dx <= cr; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < cr) {
            const px = (cx + dx + W) % W;
            const py = clamp(cy + dy, 0, H - 1);
            const isRim = dist > cr * 0.78;
            const dark = isRim ? lerp(getPixel(px, py)[0], 210, 0.5) : lerp(getPixel(px, py)[0], 82, 0.65);
            blendPixel(px, py, dark, dark - 4, dark - 10, 0.85);
          }
        }
      }
    }
  }

  else if (type === 'venus') {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = x / W * 7, ny = y / H * 3.5;
        const n1 = fbm(nx, ny, 6, 2, 0.5);
        const n2 = fbm(nx + 8.3, ny + 3.1, 5, 2.2, 0.45);
        const n3 = fbm(nx * 1.5 + 20, ny * 0.5, 4, 2, 0.4);
        const r = clamp(Math.floor(lerp(190, 248, n1 * 0.7 + n2 * 0.3)), 0, 255);
        const g = clamp(Math.floor(lerp(145, 215, n1 * 0.5 + n3 * 0.5)), 0, 255);
        const b = clamp(Math.floor(lerp(50, 130, n3)), 0, 255);
        setPixel(x, y, r, g, b);
      }
    }
  }

  else if (type === 'earth') {
    // Step 1: Ocean
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = x / W * 6, ny = y / H * 3;
        const depthNoise = fbm(nx + 30, ny + 12, 4, 2, 0.5);
        const r = Math.floor(lerp(5, 25, depthNoise));
        const g = Math.floor(lerp(30, 75, depthNoise));
        const b = Math.floor(lerp(115, 165, depthNoise));
        setPixel(x, y, r, g, b);
      }
    }
    // Step 2: Landmasses
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = x / W * 5.8, ny = y / H * 2.9;
        const land = fbm(nx + 1.6, ny + 0.8, 7, 2, 0.52);
        if (land > 0.504) {
          const t = clamp((land - 0.504) / 0.12, 0, 1);
          const highland = fbm(nx * 2 + 4, ny * 2 + 2, 4, 2, 0.48);
          const isHighland = highland > 0.54;
          // Color layers: lowland (green), upland, highland (brown/grey)
          let r, g, b;
          if (t < 0.3) { // Coastal lowlands
            r = Math.floor(lerp(25, 60, t / 0.3));
            g = Math.floor(lerp(80, 115, t / 0.3));
            b = Math.floor(lerp(55, 55, t / 0.3));
          } else if (t < 0.7) { // Mid elevation
            const et = (t - 0.3) / 0.4;
            r = Math.floor(lerp(60, 105, et));
            g = Math.floor(lerp(115, 100, et));
            b = Math.floor(lerp(55, 60, et));
          } else { // Highlands
            const ht = (t - 0.7) / 0.3;
            r = Math.floor(lerp(105, 155, ht));
            g = Math.floor(lerp(100, 125, ht));
            b = Math.floor(lerp(60, 100, ht));
          }
          if (isHighland && t > 0.5) {
            r = Math.floor(lerp(r, 140, 0.4));
            g = Math.floor(lerp(g, 115, 0.4));
            b = Math.floor(lerp(b, 105, 0.4));
          }
          setPixel(x, y, r, g, b);
        }
      }
    }
    // Step 3: Ice caps
    for (let y = 0; y < H; y++) {
      const lat = Math.abs((y / H - 0.5) * Math.PI);
      if (lat > 1.25) {
        const iceT = clamp((lat - 1.25) / 0.3, 0, 1);
        const iceNoise = fbm(y * 0.03, 0, 2, 2, 0.5) * 0.15;
        const finalIce = clamp(iceT + iceNoise, 0, 1);
        for (let x = 0; x < W; x++) {
          blendPixel(x, y, 235, 245, 255, finalIce);
        }
      }
    }
    // Step 4: Cloud overlay
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = x / W * 9, ny = y / H * 4.5;
        const cloud = fbm(nx + 40, ny + 22, 6, 2.1, 0.52);
        const cloud2 = fbm(nx * 0.7 + 55, ny * 1.3 + 30, 4, 2, 0.5);
        const c = clamp((cloud * 0.65 + cloud2 * 0.35 - 0.46) / 0.12, 0, 1);
        if (c > 0) {
          const cx = x % W;
          blendPixel(cx, y, 255, 255, 255, c * 0.82);
        }
      }
    }
  }

  else if (type === 'mars') {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = x / W * 8, ny = y / H * 4;
        const n1 = fbm(nx, ny, 6, 2, 0.52);
        const n2 = fbm(nx + 10.2, ny + 4.6, 5, 2.1, 0.48);
        // Base red-orange
        const r = clamp(Math.floor(lerp(145, 205, n1)), 0, 255);
        const g = clamp(Math.floor(lerp(48, 88, n1 * 0.7 + n2 * 0.3)), 0, 255);
        const b = clamp(Math.floor(lerp(28, 58, n2 * 0.4)), 0, 255);
        setPixel(x, y, r, g, b);
      }
    }
    // Valles Marineris canyon system
    const vmY = Math.floor(H * 0.52);
    for (let x = Math.floor(W * 0.35); x < Math.floor(W * 0.68); x++) {
      const xf = (x - W * 0.35) / (W * 0.33);
      const cy = vmY + Math.floor(Math.sin(xf * Math.PI) * 8);
      const width = 10 + Math.floor(Math.sin(xf * Math.PI * 3) * 4);
      for (let dy = -width; dy <= width; dy++) {
        const t = Math.pow(1 - Math.abs(dy) / width, 1.5) * 0.55;
        const py = clamp(cy + dy, 0, H - 1);
        blendPixel(x, py, 100, 42, 22, t);
      }
    }
    // Ice caps
    for (let y = 0; y < H; y++) {
      const lat = Math.abs((y / H - 0.5) * Math.PI);
      if (lat > 1.32) {
        const iceT = clamp((lat - 1.32) / 0.18, 0, 1);
        for (let x = 0; x < W; x++) {
          blendPixel(x, y, 245, 238, 255, iceT * 0.9);
        }
      }
    }
    // Craters
    for (let i = 0; i < 50; i++) {
      const cx = Math.floor(Math.random() * W);
      const cy = Math.floor(Math.random() * H);
      const cr = 3 + Math.random() * 12;
      for (let dy = -cr; dy <= cr; dy++) {
        for (let dx = -cr; dx <= cr; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < cr) {
            const px = (cx + dx + W) % W;
            const py = clamp(cy + dy, 0, H - 1);
            const rim = dist > cr * 0.8;
            blendPixel(px, py, rim ? 210 : 110, rim ? 80 : 38, rim ? 40 : 18, 0.45);
          }
        }
      }
    }
  }

  else if (type === 'jupiter') {
    const bands = [
      { y: 0.00, col: [235, 200, 155] },
      { y: 0.07, col: [185, 148, 105] },
      { y: 0.15, col: [245, 218, 172] },
      { y: 0.24, col: [175, 130, 90] },
      { y: 0.33, col: [218, 185, 140] },
      { y: 0.43, col: [170, 122, 82] },
      { y: 0.52, col: [240, 212, 168] },
      { y: 0.62, col: [175, 130, 92] },
      { y: 0.70, col: [225, 190, 148] },
      { y: 0.80, col: [180, 138, 98] },
      { y: 0.88, col: [238, 208, 162] },
      { y: 1.00, col: [210, 172, 128] },
    ];

    for (let y = 0; y < H; y++) {
      const yf = y / H;
      let c1 = bands[0].col, c2 = bands[1].col, bt = 0;
      for (let b = 0; b < bands.length - 1; b++) {
        if (yf >= bands[b].y && yf < bands[b + 1].y) {
          bt = (yf - bands[b].y) / (bands[b + 1].y - bands[b].y);
          c1 = bands[b].col; c2 = bands[b + 1].col;
          break;
        }
      }
      const base = lerpColor(c1, c2, bt);
      for (let x = 0; x < W; x++) {
        const nx = x / W * 14, ny = y / H * 5;
        const n1 = fbm(nx, ny, 5, 2.1, 0.5);
        const n2 = fbm(nx * 0.5 + 25, ny * 3, 4, 2, 0.45);
        const turbulence = (n1 * 0.65 + n2 * 0.35 - 0.25) * 60;
        setPixel(x, y,
          clamp(base[0] + turbulence, 0, 255),
          clamp(base[1] + turbulence * 0.85, 0, 255),
          clamp(base[2] + turbulence * 0.6, 0, 255)
        );
      }
    }
    // Great Red Spot
    const grsX = Math.floor(W * 0.62), grsY = Math.floor(H * 0.56);
    const grsRX = 72, grsRY = 38;
    for (let dy = -grsRY - 8; dy <= grsRY + 8; dy++) {
      for (let dx = -grsRX - 8; dx <= grsRX + 8; dx++) {
        const ex = (dx / grsRX) ** 2 + (dy / grsRY) ** 2;
        if (ex < 1.35) {
          const t = clamp(1 - ex * 0.8, 0, 1);
          const px = (grsX + dx + W) % W;
          const py = clamp(grsY + dy, 0, H - 1);
          if (ex < 1.0) {
            blendPixel(px, py, 198, 75, 48, t * 0.92);
          } else {
            blendPixel(px, py, 215, 110, 70, (1.35 - ex) / 0.35 * 0.7);
          }
        }
      }
    }
  }

  else if (type === 'saturn') {
    const bands = [
      { y: 0.00, col: [235, 215, 168] },
      { y: 0.10, col: [210, 188, 142] },
      { y: 0.22, col: [248, 228, 182] },
      { y: 0.34, col: [205, 182, 136] },
      { y: 0.46, col: [240, 220, 175] },
      { y: 0.58, col: [208, 185, 140] },
      { y: 0.70, col: [238, 218, 172] },
      { y: 0.82, col: [215, 192, 148] },
      { y: 0.92, col: [230, 208, 165] },
      { y: 1.00, col: [218, 196, 152] },
    ];
    for (let y = 0; y < H; y++) {
      const yf = y / H;
      let c1 = bands[0].col, c2 = bands[1].col, bt = 0;
      for (let b = 0; b < bands.length - 1; b++) {
        if (yf >= bands[b].y && yf < bands[b + 1].y) {
          bt = (yf - bands[b].y) / (bands[b + 1].y - bands[b].y);
          c1 = bands[b].col; c2 = bands[b + 1].col;
          break;
        }
      }
      const base = lerpColor(c1, c2, bt);
      for (let x = 0; x < W; x++) {
        const nx = x / W * 10, ny = y / H * 4;
        const n = fbm(nx, ny, 4, 2, 0.48) * 0.18;
        setPixel(x, y,
          clamp(base[0] + (n - 0.09) * 45, 0, 255),
          clamp(base[1] + (n - 0.09) * 38, 0, 255),
          clamp(base[2] + (n - 0.09) * 25, 0, 255)
        );
      }
    }
  }

  else if (type === 'uranus') {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = x / W * 5, ny = y / H * 2.5;
        const n = fbm(nx, ny, 4, 2, 0.45) * 0.12;
        const lat = (y / H - 0.5);
        const limb = Math.pow(Math.abs(lat) * 1.8, 2.5) * 0.35;
        setPixel(x, y,
          clamp(Math.floor(75 + n * 30 + limb * 28), 0, 255),
          clamp(Math.floor(208 + n * 22 - limb * 38), 0, 255),
          clamp(Math.floor(218 + n * 18 - limb * 28), 0, 255)
        );
      }
    }
  }

  else if (type === 'neptune') {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = x / W * 7, ny = y / H * 3.5;
        const n1 = fbm(nx, ny, 6, 2, 0.52);
        const n2 = fbm(nx + 9.8, ny + 4.3, 5, 2.1, 0.48);
        const n3 = fbm(nx * 0.7 + 18, ny * 2.2, 4, 2, 0.45);
        let r = clamp(Math.floor(28 + n1 * 40), 0, 255);
        let g = clamp(Math.floor(72 + n1 * 55), 0, 255);
        let b = clamp(Math.floor(175 + n1 * 55), 0, 255);
        // White storms
        const storm = clamp((n2 * 0.6 + n3 * 0.4 - 0.62) / 0.1, 0, 1);
        if (storm > 0) {
          r = Math.floor(lerp(r, 210, storm * 0.9));
          g = Math.floor(lerp(g, 225, storm * 0.9));
          b = Math.floor(lerp(b, 255, storm * 0.9));
        }
        // Dark spot
        const dsx = x / W, dsy = y / H;
        const dsDist = Math.sqrt((dsx - 0.35) ** 2 + ((dsy - 0.42) * 1.5) ** 2);
        if (dsDist < 0.07) {
          const dt = (0.07 - dsDist) / 0.07;
          r = Math.floor(lerp(r, 15, dt * 0.7));
          g = Math.floor(lerp(g, 35, dt * 0.7));
          b = Math.floor(lerp(b, 110, dt * 0.7));
        }
        setPixel(x, y, r, g, b);
      }
    }
  }

  else if (type === 'moon') {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = x / W * 8, ny = y / H * 4;
        const n = fbm(nx, ny, 7, 2.1, 0.55);
        const v = Math.floor(lerp(105, 188, n));
        setPixel(x, y, v, v, v - 6);
      }
    }
    // Mare (dark plains)
    const mares = [
      { x: 0.28, y: 0.38, r: 0.14 }, { x: 0.52, y: 0.42, r: 0.10 },
      { x: 0.38, y: 0.52, r: 0.08 }, { x: 0.68, y: 0.35, r: 0.07 },
      { x: 0.18, y: 0.54, r: 0.09 }, { x: 0.78, y: 0.52, r: 0.06 },
    ];
    for (const mare of mares) {
      const mx = Math.floor(mare.x * W);
      const my = Math.floor(mare.y * H);
      const mr = Math.floor(mare.r * Math.min(W, H * 2));
      for (let dy = -mr; dy <= mr; dy++) {
        for (let dx = -mr; dx <= mr; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy) / mr;
          if (dist < 1) {
            const t = Math.pow(1 - dist, 0.6) * 0.62;
            const px = (mx + dx + W) % W;
            const py = clamp(my + dy, 0, H - 1);
            blendPixel(px, py, 82, 82, 88, t);
          }
        }
      }
    }
    // Craters
    for (let i = 0; i < 75; i++) {
      const cx = Math.floor(Math.random() * W);
      const cy = Math.floor(Math.random() * H);
      const cr = 2 + Math.random() * 18;
      for (let dy = -cr - 1; dy <= cr + 1; dy++) {
        for (let dx = -cr - 1; dx <= cr + 1; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          const px = (cx + dx + W) % W;
          const py = clamp(cy + dy, 0, H - 1);
          if (dist < cr) {
            blendPixel(px, py, 88, 88, 94, 0.6);
          } else if (dist < cr + 1.5) {
            blendPixel(px, py, 210, 210, 208, 0.5);
          }
        }
      }
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function ringTexture() {
  const W = 1024, H = 4;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d = img.data;

  for (let x = 0; x < W; x++) {
    const t = x / W;
    let r = 0, g = 0, b = 0, a = 0;

    // Ring structure based on Saturn's real ring gaps
    if (t < 0.08) {
      // D ring — very faint
      a = Math.floor(t / 0.08 * 18);
      r = 195; g = 180; b = 152;
    } else if (t < 0.12) {
      // C ring inner
      const l = (t - 0.08) / 0.04;
      a = Math.floor(lerp(18, 65, l));
      r = 205; g = 188; b = 160;
    } else if (t < 0.19) {
      // C ring main
      a = Math.floor(55 + smoothNoise(t * 40, 0) * 35);
      r = 208; g = 192; b = 162;
    } else if (t < 0.22) {
      // Cassini division approach
      a = Math.floor(lerp(55, 12, (t - 0.19) / 0.03));
      r = 185; g = 170; b = 145;
    } else if (t < 0.25) {
      // Cassini division
      a = Math.floor(lerp(12, 8, (t - 0.22) / 0.03));
      r = 160; g = 148; b = 125;
    } else if (t < 0.28) {
      a = Math.floor(lerp(8, 55, (t - 0.25) / 0.03));
      r = 225; g = 208; b = 172;
    } else if (t < 0.55) {
      // B ring — brightest
      const bt = (t - 0.28) / 0.27;
      const wave = Math.sin(bt * 80) * 0.15 + Math.sin(bt * 23) * 0.12;
      a = clamp(Math.floor(175 + wave * 60 + smoothNoise(t * 60, 0.5) * 30), 80, 240);
      r = clamp(Math.floor(235 + wave * 25), 0, 255);
      g = clamp(Math.floor(215 + wave * 20), 0, 255);
      b = clamp(Math.floor(172 + wave * 15), 0, 255);
    } else if (t < 0.59) {
      // Cassini division
      const ct = (t - 0.55) / 0.04;
      a = Math.floor(lerp(175, 12, ct));
      r = 185; g = 168; b = 138;
    } else if (t < 0.83) {
      // A ring
      const at = (t - 0.59) / 0.24;
      const wave = Math.sin(at * 55) * 0.12 + smoothNoise(t * 50, 1.2) * 0.1;
      a = clamp(Math.floor(lerp(165, 95, at) + wave * 35), 40, 200);
      r = clamp(Math.floor(225 + wave * 20), 0, 255);
      g = clamp(Math.floor(205 + wave * 18), 0, 255);
      b = clamp(Math.floor(165 + wave * 12), 0, 255);
    } else if (t < 0.87) {
      // Encke gap
      a = Math.floor(lerp(95, 18, (t - 0.83) / 0.04));
      r = 200; g = 182; b = 148;
    } else {
      // Outer A ring / F ring
      a = Math.floor(lerp(18, 0, (t - 0.87) / 0.13));
      r = 210; g = 192; b = 155;
    }

    for (let y = 0; y < H; y++) {
      const i = (y * W + x) * 4;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// ═══════════════════════════════════════════════════════
//  SECTION 3: SCENE BOOTSTRAP
// ═══════════════════════════════════════════════════════

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.05, 6000);
camera.position.set(0, 65, 148);
camera.lookAt(0, 0, 0);

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  logarithmicDepthBuffer: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.75;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ═══════════════════════════════════════════════════════
//  SECTION 4: LIGHTING
// ═══════════════════════════════════════════════════════

// Deep space ambient — very dim cool blue
const ambientLight = new THREE.AmbientLight(0x0a1525, 2.8);
scene.add(ambientLight);

// Sun point light — main illumination
const sunLight = new THREE.PointLight(0xfff8e8, 4.5, 0, 1.2);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 600;
sunLight.shadow.bias = -0.001;
scene.add(sunLight);

// Soft warm fill from sun direction
const fillLight = new THREE.PointLight(0xff8822, 0.4, 0, 2);
scene.add(fillLight);

// ═══════════════════════════════════════════════════════
//  SECTION 5: STARFIELD
// ═══════════════════════════════════════════════════════

function buildStarfield() {
  const COUNT = 20000;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);

  // Milky Way concentration band
  for (let i = 0; i < COUNT; i++) {
    let x, y, z;
    const inBand = Math.random() < 0.4; // 40% in galactic band
    if (inBand) {
      const theta = Math.random() * Math.PI * 2;
      const bandAngle = (Math.random() - 0.5) * 0.45; // narrow vertical spread
      const r = 900 + Math.random() * 300;
      x = r * Math.cos(theta);
      y = r * Math.tan(bandAngle);
      z = r * Math.sin(theta);
    } else {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 850 + Math.random() * 350;
      x = r * Math.sin(phi) * Math.cos(theta);
      y = r * Math.sin(phi) * Math.sin(theta);
      z = r * Math.cos(phi);
    }
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;

    // Spectral class colors
    const rnd = Math.random();
    if (rnd < 0.04) { col[i*3]=0.72; col[i*3+1]=0.78; col[i*3+2]=1.0; }       // B - blue-white
    else if (rnd < 0.09) { col[i*3]=0.95; col[i*3+1]=0.95; col[i*3+2]=1.0; }  // A - white
    else if (rnd < 0.14) { col[i*3]=1.0; col[i*3+1]=0.97; col[i*3+2]=0.82; }  // F - yellow-white
    else if (rnd < 0.20) { col[i*3]=1.0; col[i*3+1]=0.88; col[i*3+2]=0.68; }  // G - yellow (Sun-like)
    else if (rnd < 0.27) { col[i*3]=1.0; col[i*3+1]=0.68; col[i*3+2]=0.35; }  // K - orange
    else if (rnd < 0.31) { col[i*3]=1.0; col[i*3+1]=0.35; col[i*3+2]=0.22; }  // M - red
    else {
      const v = 0.7 + Math.random() * 0.3;
      col[i*3]=v; col[i*3+1]=v; col[i*3+2]=v * 1.04;
    }
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.65,
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    sizeAttenuation: true,
    depthWrite: false,
  });

  return new THREE.Points(geo, mat);
}

scene.add(buildStarfield());

// ═══════════════════════════════════════════════════════
//  SECTION 6: SUN
// ═══════════════════════════════════════════════════════

const SUN_R = 5.2;

const sunGeo = new THREE.SphereGeometry(SUN_R, 64, 64);
const sunTex = pixelTexture('sun');
const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
const sunMesh = new THREE.Mesh(sunGeo, sunMat);
sunMesh.name = 'SUN';
scene.add(sunMesh);

// Corona glow layers
[
  { s: 1.06, o: 0.22, c: 0xffee88 },
  { s: 1.15, o: 0.10, c: 0xffaa44 },
  { s: 1.30, o: 0.055, c: 0xff8833 },
  { s: 1.55, o: 0.025, c: 0xff6622 },
  { s: 2.10, o: 0.010, c: 0xff4411 },
].forEach(({ s, o, c }) => {
  const g = new THREE.SphereGeometry(SUN_R * s, 32, 32);
  const m = new THREE.MeshBasicMaterial({
    color: c,
    transparent: true,
    opacity: o,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  sunMesh.add(new THREE.Mesh(g, m));
});

// ═══════════════════════════════════════════════════════
//  SECTION 7: ORBIT PATH BUILDER
// ═══════════════════════════════════════════════════════

function buildOrbitPath(sma, ecc, segments = 320) {
  const pts = [];
  const b = sma * Math.sqrt(1 - ecc * ecc);
  const c = sma * ecc;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(
      sma * Math.cos(theta) - c,
      0,
      b * Math.sin(theta)
    ));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color: 0x1a3560,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  return new THREE.Line(geo, mat);
}

// ═══════════════════════════════════════════════════════
//  SECTION 8: PLANET DEFINITIONS
// ═══════════════════════════════════════════════════════

const PLANET_DEFS = [
  {
    name: 'Mercury', texture: 'mercury',
    radius: 0.38, sma: 9, ecc: 0.206,
    period: 0.241, rotSpeed: 0.003, tilt: 0.03,
    navColor: '#aaaaaa',
    stats: {
      type: 'Terrestrial Planet',
      distance: '57.9M km from Sun',
      diameter: '4,879 km',
      period: '88 Earth days',
      moons: '0',
    },
  },
  {
    name: 'Venus', texture: 'venus',
    radius: 0.95, sma: 14.5, ecc: 0.007,
    period: 0.615, rotSpeed: -0.001, tilt: 177.4,
    navColor: '#e8b84b',
    atmosphere: { color: 0xffcc66, opacity: 0.10 },
    stats: {
      type: 'Terrestrial Planet',
      distance: '108.2M km from Sun',
      diameter: '12,104 km',
      period: '224.7 Earth days',
      moons: '0',
    },
  },
  {
    name: 'Earth', texture: 'earth',
    radius: 1.0, sma: 20, ecc: 0.017,
    period: 1.0, rotSpeed: 0.01, tilt: 23.5,
    navColor: '#3a8fff',
    atmosphere: { color: 0x4499ff, opacity: 0.11 },
    stats: {
      type: 'Terrestrial Planet',
      distance: '149.6M km from Sun',
      diameter: '12,742 km',
      period: '365.25 Earth days',
      moons: '1',
    },
  },
  {
    name: 'Mars', texture: 'mars',
    radius: 0.53, sma: 28, ecc: 0.093,
    period: 1.88, rotSpeed: 0.009, tilt: 25.2,
    navColor: '#c1440e',
    stats: {
      type: 'Terrestrial Planet',
      distance: '227.9M km from Sun',
      diameter: '6,779 km',
      period: '687 Earth days',
      moons: '2',
    },
  },
  {
    name: 'Jupiter', texture: 'jupiter',
    radius: 3.5, sma: 44, ecc: 0.049,
    period: 11.86, rotSpeed: 0.04, tilt: 3.1,
    navColor: '#d4a473',
    stats: {
      type: 'Gas Giant',
      distance: '778.5M km from Sun',
      diameter: '139,820 km',
      period: '11.86 Earth years',
      moons: '95',
    },
  },
  {
    name: 'Saturn', texture: 'saturn',
    radius: 2.9, sma: 62, ecc: 0.057,
    period: 29.46, rotSpeed: 0.038, tilt: 26.7,
    navColor: '#e4c98a',
    hasRings: true,
    stats: {
      type: 'Gas Giant',
      distance: '1.43B km from Sun',
      diameter: '116,460 km',
      period: '29.46 Earth years',
      moons: '146',
    },
  },
  {
    name: 'Uranus', texture: 'uranus',
    radius: 2.0, sma: 80, ecc: 0.046,
    period: 84.01, rotSpeed: -0.025, tilt: 97.8,
    navColor: '#7de8e8',
    atmosphere: { color: 0x55dddd, opacity: 0.07 },
    stats: {
      type: 'Ice Giant',
      distance: '2.87B km from Sun',
      diameter: '50,724 km',
      period: '84 Earth years',
      moons: '28',
    },
  },
  {
    name: 'Neptune', texture: 'neptune',
    radius: 1.9, sma: 97, ecc: 0.009,
    period: 164.8, rotSpeed: 0.028, tilt: 28.3,
    navColor: '#3f54ba',
    atmosphere: { color: 0x3355cc, opacity: 0.09 },
    stats: {
      type: 'Ice Giant',
      distance: '4.50B km from Sun',
      diameter: '49,244 km',
      period: '164.8 Earth years',
      moons: '16',
    },
  },
];

// ═══════════════════════════════════════════════════════
//  SECTION 9: BUILD PLANETS
// ═══════════════════════════════════════════════════════

const textureCache = {};
const getTexture = (name) => {
  if (!textureCache[name]) textureCache[name] = pixelTexture(name);
  return textureCache[name];
};

const planets = [];
const orbitLines = [];
const planetMeshes = [];
let earthPlanet = null;

// Pre-generate all textures (synchronous canvas operations)
PLANET_DEFS.forEach(def => getTexture(def.texture));

PLANET_DEFS.forEach((def, idx) => {
  // ── Main mesh ──────────────────────────────────────────
  const geo = new THREE.SphereGeometry(def.radius, 64, 32);
  const mat = new THREE.MeshStandardMaterial({
    map: getTexture(def.texture),
    roughness: def.name === 'Mercury' ? 0.95 : def.name === 'Earth' ? 0.65 : 0.78,
    metalness: 0.0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.rotation.z = THREE.MathUtils.degToRad(def.tilt);
  mesh.userData.planet = def;
  mesh.userData.idx = idx;

  // ── Atmosphere ─────────────────────────────────────────
  if (def.atmosphere) {
    const atmGeo = new THREE.SphereGeometry(def.radius * 1.022, 32, 32);
    const atmMat = new THREE.MeshBasicMaterial({
      color: def.atmosphere.color,
      transparent: true,
      opacity: def.atmosphere.opacity,
      side: THREE.FrontSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    mesh.add(new THREE.Mesh(atmGeo, atmMat));
  }

  // ── Saturn rings ───────────────────────────────────────
  if (def.hasRings) {
    const innerR = def.radius * 1.25;
    const outerR = def.radius * 2.55;
    const ringGeo = new THREE.RingGeometry(innerR, outerR, 180, 6);

    // Remap UVs: u = radial distance (0=inner, 1=outer)
    const uvAttr = ringGeo.attributes.uv;
    const posAttr = ringGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
      const dist = v.length();
      const t = (dist - innerR) / (outerR - innerR);
      uvAttr.setXY(i, t, 0.5);
    }
    uvAttr.needsUpdate = true;

    const rTex = ringTexture();
    const ringMat = new THREE.MeshBasicMaterial({
      map: rTex,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });

    const rings = new THREE.Mesh(ringGeo, ringMat);
    rings.rotation.x = Math.PI / 2;
    mesh.add(rings);
  }

  // ── Orbit path ─────────────────────────────────────────
  const orbit = buildOrbitPath(def.sma, def.ecc);
  scene.add(orbit);
  orbitLines.push(orbit);

  // ── Pivot & scene add ──────────────────────────────────
  const pivot = new THREE.Group();
  pivot.add(mesh);
  scene.add(pivot);

  // ── Semi-minor axis & focus ────────────────────────────
  const b = def.sma * Math.sqrt(1 - def.ecc * def.ecc);
  const c = def.sma * def.ecc;

  const planet = {
    def,
    mesh,
    pivot,
    b,
    c,
    angle: (idx / PLANET_DEFS.length) * Math.PI * 2 + Math.random() * 0.5,
    orbitLine: orbit,
  };

  planets.push(planet);
  planetMeshes.push(mesh);
  if (def.name === 'Earth') earthPlanet = planet;
});

// ═══════════════════════════════════════════════════════
//  SECTION 10: MOON
// ═══════════════════════════════════════════════════════

const MOON_DIST = 2.6;
const MOON_SPEED_MULT = 13.4;

const moonMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.27, 32, 32),
  new THREE.MeshStandardMaterial({
    map: getTexture('moon'),
    roughness: 0.92,
    metalness: 0.0,
  })
);
moonMesh.castShadow = true;
moonMesh.receiveShadow = true;
moonMesh.name = 'Moon';
scene.add(moonMesh);

let moonAngle = Math.random() * Math.PI * 2;

// ═══════════════════════════════════════════════════════
//  SECTION 11: PLANET NAV UI
// ═══════════════════════════════════════════════════════

const navList = document.getElementById('nav-list');
PLANET_DEFS.forEach((def, i) => {
  const btn = document.createElement('button');
  btn.className = 'nav-planet-btn';
  btn.innerHTML = `
    <span class="nav-planet-dot" style="background:${def.navColor}; box-shadow: 0 0 5px ${def.navColor};"></span>
    <span>${def.name.toUpperCase()}</span>
  `;
  btn.addEventListener('click', () => focusPlanet(planets[i]));
  navList.appendChild(btn);
});

// ═══════════════════════════════════════════════════════
//  SECTION 12: ORBIT CONTROLS
// ═══════════════════════════════════════════════════════

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 2;
controls.maxDistance = 700;
controls.zoomSpeed = 0.9;
controls.rotateSpeed = 0.6;
controls.panSpeed = 0.8;

// ═══════════════════════════════════════════════════════
//  SECTION 13: ANIMATION STATE
// ═══════════════════════════════════════════════════════

let isPaused = false;
let timeScale = 1.0;
let showOrbits = true;
let showLabels = true;
let selectedPlanet = null;
let isFocused = false;
const clock = new THREE.Clock();
const BASE_SPEED = 0.0022;

// ═══════════════════════════════════════════════════════
//  SECTION 14: RAYCASTER / HOVER / CLICK
// ═══════════════════════════════════════════════════════

const raycaster = new THREE.Raycaster();
const mouse2d = new THREE.Vector2();
const tooltip = document.getElementById('tooltip');
let hoveredMesh = null;

window.addEventListener('mousemove', (e) => {
  mouse2d.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse2d.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse2d, camera);
  const hits = raycaster.intersectObjects([...planetMeshes, sunMesh], true);

  if (hits.length > 0 && showLabels) {
    const obj = hits[0].object;
    const isSun = obj === sunMesh || obj.parent === sunMesh;
    const planetDef = obj.userData.planet;
    const name = isSun ? 'THE SUN' : planetDef ? planetDef.name.toUpperCase() : null;

    if (name) {
      tooltip.textContent = name;
      tooltip.classList.add('visible');
      tooltip.style.left = (e.clientX + 18) + 'px';
      tooltip.style.top = (e.clientY - 14) + 'px';
      document.body.style.cursor = 'pointer';
      hoveredMesh = obj;
    }
  } else {
    tooltip.classList.remove('visible');
    document.body.style.cursor = 'default';
    hoveredMesh = null;
  }
});

window.addEventListener('click', () => {
  if (!hoveredMesh) return;
  raycaster.setFromCamera(mouse2d, camera);
  const hits = raycaster.intersectObjects(planetMeshes, true);
  if (hits.length > 0) {
    const obj = hits[0].object;
    const planetDef = obj.userData.planet;
    const idx = obj.userData.idx;
    if (planetDef !== undefined && idx !== undefined) {
      focusPlanet(planets[idx]);
    }
  }
});

function focusPlanet(planet) {
  selectedPlanet = planet;
  isFocused = true;

  // Show info panel
  const def = planet.def;
  document.getElementById('panel-type').textContent = def.stats.type.toUpperCase();
  document.getElementById('panel-name').textContent = def.name;
  document.getElementById('panel-stats').innerHTML = Object.entries(def.stats)
    .filter(([k]) => k !== 'type')
    .map(([k, v]) => `
      <div class="stat-item">
        <div class="stat-label">${k.toUpperCase()}</div>
        <div class="stat-value">${v}</div>
      </div>
    `).join('');
  document.getElementById('panel').classList.remove('hidden');

  // Tween camera to planet
  const targetPos = planet.mesh.getWorldPosition(new THREE.Vector3());
  const dist = Math.max(def.radius * 6, 8);
  const destPos = targetPos.clone().add(new THREE.Vector3(dist * 0.8, dist * 0.45, dist * 0.8));

  tweenCamera(destPos, targetPos);
}

function tweenCamera(destPos, destTarget) {
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  let t = 0;

  function step() {
    t = Math.min(t + 0.018, 1);
    const ease = 1 - Math.pow(1 - t, 3.5);
    camera.position.lerpVectors(startPos, destPos, ease);
    controls.target.lerpVectors(startTarget, destTarget, ease);
    controls.update();
    if (t < 1) requestAnimationFrame(step);
  }
  step();
}

// Panel close
document.getElementById('panel-close').addEventListener('click', () => {
  document.getElementById('panel').classList.add('hidden');
  selectedPlanet = null;
  isFocused = false;
});

// ═══════════════════════════════════════════════════════
//  SECTION 15: UI CONTROLS
// ═══════════════════════════════════════════════════════

document.getElementById('btn-pause').addEventListener('click', () => {
  isPaused = !isPaused;
  document.getElementById('pause-icon').textContent = isPaused ? '▶' : '⏸';
  document.getElementById('pause-text').textContent = isPaused ? 'PLAY' : 'PAUSE';
  if (!isPaused) clock.getDelta(); // reset delta to avoid jump
});

document.getElementById('speed-slider').addEventListener('input', (e) => {
  timeScale = parseFloat(e.target.value);
  document.getElementById('speed-display').textContent = timeScale.toFixed(1) + '×';
});

document.getElementById('orbit-toggle').addEventListener('change', (e) => {
  showOrbits = e.target.checked;
  orbitLines.forEach(l => (l.visible = showOrbits));
});

document.getElementById('labels-toggle').addEventListener('change', (e) => {
  showLabels = e.target.checked;
  if (!showLabels) tooltip.classList.remove('visible');
});

// ═══════════════════════════════════════════════════════
//  SECTION 16: LOADING SCREEN
// ═══════════════════════════════════════════════════════

const ldFill = document.getElementById('ld-fill');
const ldPct = document.getElementById('ld-pct');
const loadingEl = document.getElementById('loading');
let prog = 0;

const loadTimer = setInterval(() => {
  const remaining = 100 - prog;
  prog += remaining * 0.15 + Math.random() * 3;
  if (prog >= 100) {
    prog = 100;
    clearInterval(loadTimer);
    setTimeout(() => {
      loadingEl.classList.add('fade-out');
      setTimeout(() => (loadingEl.style.display = 'none'), 1000);
    }, 400);
  }
  ldFill.style.width = prog + '%';
  ldPct.textContent = Math.floor(prog) + '%';
}, 60);

// ═══════════════════════════════════════════════════════
//  SECTION 17: MAIN ANIMATION LOOP
// ═══════════════════════════════════════════════════════

const _vec3 = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);

  const rawDt = clock.getDelta();
  const dt = isPaused ? 0 : Math.min(rawDt, 0.05) * timeScale;
  const time = clock.getElapsedTime();

  // ── Sun ────────────────────────────────────────────────
  sunMesh.rotation.y += 0.0008 * (isPaused ? 0 : timeScale);
  const glow = 1 + Math.sin(time * 1.1) * 0.012 + Math.sin(time * 2.7) * 0.006;
  sunMesh.scale.setScalar(glow);

  // ── Planets ────────────────────────────────────────────
  planets.forEach((planet) => {
    if (dt > 0) {
      // Keplerian angular velocity: ω ∝ 1/T, actual speed varies by radius
      const angVel = BASE_SPEED / planet.def.period;
      planet.angle += angVel * dt * 60;
    }

    // True anomaly approximation via polar ellipse equation
    // r = a(1-e²) / (1 + e·cos(θ))
    const def = planet.def;
    const r = def.sma * (1 - def.ecc * def.ecc) / (1 + def.ecc * Math.cos(planet.angle));
    planet.mesh.position.x = r * Math.cos(planet.angle);
    planet.mesh.position.z = r * Math.sin(planet.angle);

    // Self-rotation
    if (dt > 0) {
      planet.mesh.rotation.y += def.rotSpeed * dt * 60;
    }
  });

  // ── Moon ───────────────────────────────────────────────
  if (dt > 0) {
    moonAngle += BASE_SPEED * MOON_SPEED_MULT * dt * 60;
  }
  const earthPos = earthPlanet.mesh.position;
  moonMesh.position.set(
    earthPos.x + MOON_DIST * Math.cos(moonAngle),
    earthPos.y + MOON_DIST * 0.1 * Math.sin(moonAngle * 0.3), // slight inclination
    earthPos.z + MOON_DIST * Math.sin(moonAngle)
  );
  if (dt > 0) moonMesh.rotation.y += 0.005 * dt * 60;

  // ── Follow selected planet ─────────────────────────────
  if (isFocused && selectedPlanet) {
    selectedPlanet.mesh.getWorldPosition(_vec3);
    controls.target.lerp(_vec3, 0.04);
  }

  controls.update();
  renderer.render(scene, camera);
}

// ═══════════════════════════════════════════════════════
//  SECTION 18: RESIZE HANDLER
// ═══════════════════════════════════════════════════════

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ═══════════════════════════════════════════════════════
//  LAUNCH
// ═══════════════════════════════════════════════════════

animate();
