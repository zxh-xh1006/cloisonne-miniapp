// lib/patternGen.js - 纹样生成：金属丝轮廓 + 色块分区 + 配色
const Jimp = require('jimp');

// 传统珐琅配色方案
const COLOR_SCHEMES = [
  { name: '经典景泰蓝', colors: [0x1a4b8cff, 0x0f3460ff, 0xd4af37ff, 0xc0392bff, 0x27ae60ff, 0xf1c40fff] },
  { name: '石青朱红', colors: [0x1e6091ff, 0x1a5276ff, 0xc0392bff, 0xd4af37ff, 0xf1c40fff, 0x27ae60ff] },
  { name: '鹅黄嫩绿', colors: [0xf4d03fff, 0xf9e79fff, 0x27ae60ff, 0x1a4b8cff, 0xd4af37ff, 0xc0392bff] },
  { name: '宝石五彩', colors: [0x8e44adff, 0x1a4b8cff, 0xc0392bff, 0x27ae60ff, 0xf1c40fff, 0xd4af37ff] },
  { name: '素雅青花', colors: [0x1a4b8cff, 0x2874a6ff, 0x85c1e9ff, 0xd4af37ff, 0xecf0f1ff, 0x1b263bff] }
];

/**
 * 生成掐丝珐琅纹样
 * @param {Buffer} subjectBuffer 主体图
 * @param {Buffer} lineBuffer 黑白线条图
 * @param {Buffer} maskBuffer 主体 mask
 * @param {Object} options { lineWidth, colorCount, colorScheme }
 * @returns { lineArtBuffer, effectBuffer }
 */
async function generate(subjectBuffer, lineBuffer, maskBuffer, options = {}) {
  const { lineWidth = 3, colorCount = 6, colorScheme = 0 } = options;

  const subject = await Jimp.read(subjectBuffer);
  const lineImg = await Jimp.read(lineBuffer);
  const maskImg = await Jimp.read(maskBuffer);

  const w = subject.bitmap.width;
  const h = subject.bitmap.height;

  const lineData = lineImg.bitmap.data;
  const subjectData = subject.bitmap.data;
  const maskData = maskImg.bitmap.data;

  // 主体 mask
  const isSubject = (i) => maskData[i * 4] > 128;
  // 线条判断
  const isLine = (i) => lineData[i * 4] < 128;

  // K-Means 色块分割（仅对主体非线条区域）
  const labels = kmeansSegmentation(subjectData, maskData, lineData, w, h, colorCount);

  // 获取配色方案
  const scheme = COLOR_SCHEMES[colorScheme % COLOR_SCHEMES.length];
  const palette = scheme.colors.slice(0, colorCount);

  // ---- 线稿版：金属丝轮廓 ----
  const lineArt = new Jimp(w, h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    if (isLine(i)) {
      // 金属丝：金色渐变（模拟铜丝高光）
      const [r, g, b] = metalColor(i, w, h, lineData);
      lineArt.bitmap.data[idx] = r;
      lineArt.bitmap.data[idx + 1] = g;
      lineArt.bitmap.data[idx + 2] = b;
      lineArt.bitmap.data[idx + 3] = 255;
    } else if (isSubject(i)) {
      // 主体区域：白色背景（便于打印描图）
      lineArt.bitmap.data[idx] = 255;
      lineArt.bitmap.data[idx + 1] = 255;
      lineArt.bitmap.data[idx + 2] = 255;
      lineArt.bitmap.data[idx + 3] = 255;
    } else {
      // 背景透明
      lineArt.bitmap.data[idx + 3] = 0;
    }
  }

  // ---- 效果图版：金属丝 + 釉料色块 ----
  const effect = new Jimp(w, h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    if (isLine(i)) {
      // 金属丝
      const [r, g, b] = metalColor(i, w, h, lineData);
      effect.bitmap.data[idx] = r;
      effect.bitmap.data[idx + 1] = g;
      effect.bitmap.data[idx + 2] = b;
      effect.bitmap.data[idx + 3] = 255;
    } else if (isSubject(i)) {
      // 釉料色块填充
      const label = labels[i];
      const color = palette[label % palette.length];
      effect.bitmap.data[idx] = (color >> 24) & 0xff;
      effect.bitmap.data[idx + 1] = (color >> 16) & 0xff;
      effect.bitmap.data[idx + 2] = (color >> 8) & 0xff;
      // 釉料质感：轻微亮度变化模拟釉面反光
      const brightness = 0.9 + 0.1 * Math.sin(i * 0.1);
      effect.bitmap.data[idx] = Math.min(255, effect.bitmap.data[idx] * brightness);
      effect.bitmap.data[idx + 1] = Math.min(255, effect.bitmap.data[idx + 1] * brightness);
      effect.bitmap.data[idx + 2] = Math.min(255, effect.bitmap.data[idx + 2] * brightness);
      effect.bitmap.data[idx + 3] = 255;
    } else {
      // 背景：深色底（珐琅底板效果）
      effect.bitmap.data[idx] = 13;
      effect.bitmap.data[idx + 1] = 27;
      effect.bitmap.data[idx + 2] = 42;
      effect.bitmap.data[idx + 3] = 255;
    }
  }

  const [lineArtBuffer, effectBuffer] = await Promise.all([
    lineArt.getBufferAsync(Jimp.MIME_PNG),
    effect.getBufferAsync(Jimp.MIME_PNG)
  ]);

  return { lineArtBuffer, effectBuffer };
}

/**
 * 金属丝颜色：金色渐变模拟铜丝高光
 * 根据位置和邻域计算高光
 */
function metalColor(i, w, h, lineData) {
  const x = i % w;
  const y = (i / w) | 0;
  // 基础金色
  let r = 212, g = 175, b = 55;
  // 模拟高光：左上方向更亮
  const highlight = 0.7 + 0.3 * ((x + y) / (w + h));
  r = Math.min(255, r * highlight + 40);
  g = Math.min(255, g * highlight + 30);
  b = Math.min(255, b * highlight + 10);
  // 暗部：右下偏暗铜色
  const shadow = 1 - highlight;
  r = r * (1 - shadow * 0.3);
  g = g * (1 - shadow * 0.3);
  b = b * (1 - shadow * 0.2);
  return [r | 0, g | 0, b | 0];
}

/**
 * K-Means 色块分割
 * 对主体非线条区域按颜色聚类
 */
function kmeansSegmentation(subjectData, maskData, lineData, w, h, k) {
  const n = w * h;
  const labels = new Int32Array(n).fill(-1);

  // 收集主体非线条像素的颜色
  const pixels = [];
  const indices = [];
  for (let i = 0; i < n; i++) {
    if (maskData[i * 4] > 128 && lineData[i * 4] > 128) {
      const idx = i * 4;
      pixels.push([subjectData[idx], subjectData[idx + 1], subjectData[idx + 2]]);
      indices.push(i);
    }
  }

  if (pixels.length === 0) return labels;

  // 初始化聚类中心（取均匀采样）
  const centers = [];
  const step = Math.floor(pixels.length / k);
  for (let c = 0; c < k; c++) {
    centers.push(pixels[Math.min(c * step, pixels.length - 1)].slice());
  }

  // K-Means 迭代
  const maxIter = 15;
  for (let iter = 0; iter < maxIter; iter++) {
    // 分配
    const sums = Array.from({ length: k }, () => [0, 0, 0]);
    const counts = new Array(k).fill(0);
    let changed = false;

    for (let p = 0; p < pixels.length; p++) {
      const px = pixels[p];
      let minDist = Infinity, best = 0;
      for (let c = 0; c < k; c++) {
        const dr = px[0] - centers[c][0];
        const dg = px[1] - centers[c][1];
        const db = px[2] - centers[c][2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < minDist) { minDist = dist; best = c; }
      }
      if (labels[indices[p]] !== best) {
        labels[indices[p]] = best;
        changed = true;
      }
      sums[best][0] += px[0];
      sums[best][1] += px[1];
      sums[best][2] += px[2];
      counts[best]++;
    }

    // 更新中心
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        centers[c][0] = sums[c][0] / counts[c];
        centers[c][1] = sums[c][1] / counts[c];
        centers[c][2] = sums[c][2] / counts[c];
      }
    }

    if (!changed) break;
  }

  // 对线条相邻的主体像素，按最近主体像素传播标签（填补缝隙）
  propagateLabels(labels, maskData, lineData, w, h);

  return labels;
}

/**
 * 标签传播：让线条附近的像素也获得色块标签
 */
function propagateLabels(labels, maskData, lineData, w, h) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (labels[i] === -1 && maskData[i * 4] > 128 && lineData[i * 4] > 128) {
        // 找最近的有标签邻居
        let bestLabel = -1, bestDist = Infinity;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            const ni = ny * w + nx;
            if (labels[ni] !== -1) {
              const dist = dx * dx + dy * dy;
              if (dist < bestDist) { bestDist = dist; bestLabel = labels[ni]; }
            }
          }
        }
        if (bestLabel !== -1) labels[i] = bestLabel;
      }
    }
  }
}

module.exports = { generate, COLOR_SCHEMES };
