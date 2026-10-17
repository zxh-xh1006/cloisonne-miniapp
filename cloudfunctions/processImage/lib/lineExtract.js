// lib/lineExtract.js - 轮廓线条提取（Canny 边缘检测 + 形态学处理）
const Jimp = require('jimp');

/**
 * 提取轮廓线条
 * @param {Buffer} subjectBuffer 主体图（透明背景）
 * @param {Object} options { lineWidth }
 * @returns {Buffer} 黑白线条图 PNG
 */
async function extract(subjectBuffer, options = {}) {
  const { lineWidth = 3 } = options;
  const image = await Jimp.read(subjectBuffer);
  const w = image.bitmap.width;
  const h = image.bitmap.height;
  const data = image.bitmap.data;

  // 转灰度（只考虑不透明区域）
  const gray = new Float32Array(w * h);
  const alphaMask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    alphaMask[i] = data[idx + 3] > 128 ? 1 : 0;
    gray[i] = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
  }

  // Sobel 边缘检测
  const edge = sobel(gray, w, h);

  // 计算高/低阈值（Canny 双阈值）
  const sorted = Array.from(edge).filter(v => v > 0).sort((a, b) => a - b);
  const highThreshold = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.7)] : 50;
  const lowThreshold = highThreshold * 0.4;

  // 非极大值抑制 + 双阈值
  const nms = nonMaxSuppression(gray, edge, w, h);
  const strong = new Uint8Array(w * h);
  const weak = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (nms[i] >= highThreshold) strong[i] = 1;
    else if (nms[i] >= lowThreshold) weak[i] = 1;
  }

  // 边缘连接（迟滞）
  const canny = hysteresis(strong, weak, w, h);

  // 形态学闭运算（先膨胀后腐蚀）连接断裂线条
  const closed = morphologyClose(canny, w, h, Math.max(1, Math.floor(lineWidth / 2)));

  // 膨胀线条到指定宽度
  const dilated = dilate(closed, w, h, lineWidth);

  // 只保留主体区域内的线条
  for (let i = 0; i < w * h; i++) {
    if (alphaMask[i] === 0) dilated[i] = 0;
  }

  // 生成黑白线条图：线条=黑色，背景=白色
  const out = new Jimp(w, h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    if (dilated[i] === 1) {
      out.bitmap.data[idx] = 0;
      out.bitmap.data[idx + 1] = 0;
      out.bitmap.data[idx + 2] = 0;
      out.bitmap.data[idx + 3] = 255;
    } else {
      out.bitmap.data[idx] = 255;
      out.bitmap.data[idx + 1] = 255;
      out.bitmap.data[idx + 2] = 255;
      out.bitmap.data[idx + 3] = 255;
    }
  }

  return out.getBufferAsync(Jimp.MIME_PNG);
}

function sobel(gray, w, h) {
  const edge = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1] +
        gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1];
      const gy =
        -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1] +
        gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1];
      edge[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return edge;
}

function nonMaxSuppression(gray, edge, w, h) {
  const result = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (edge[i] === 0) continue;

      // 计算梯度方向
      const gx =
        -gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1] +
        gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1];
      const gy =
        -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1] +
        gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1];
      const angle = Math.atan2(gy, gx) * 180 / Math.PI;

      // 量化到 0/45/90/135
      let q = 0, r = 0;
      const a = (angle + 180) % 180;
      if ((a < 22.5 || a >= 157.5)) { q = 1; r = -1; }
      else if (a < 67.5) { q = 1 - w; r = -1 + w; }
      else if (a < 112.5) { q = -w; r = w; }
      else { q = -1 - w; r = 1 + w; }

      if (edge[i] >= edge[i + q] && edge[i] >= edge[i + r]) {
        result[i] = edge[i];
      }
    }
  }
  return result;
}

function hysteresis(strong, weak, w, h) {
  const result = new Uint8Array(strong);
  const queue = [];
  for (let i = 0; i < w * h; i++) {
    if (strong[i]) queue.push(i);
  }
  while (queue.length > 0) {
    const i = queue.shift();
    const x = i % w, y = (i / w) | 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const ni = ny * w + nx;
        if (weak[ni] && !result[ni]) {
          result[ni] = 1;
          queue.push(ni);
        }
      }
    }
  }
  return result;
}

function dilate(binary, w, h, radius) {
  const result = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (binary[i]) {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              result[ny * w + nx] = 1;
            }
          }
        }
      }
    }
  }
  return result;
}

function erode(binary, w, h, radius) {
  const result = new Uint8Array(w * h);
  for (let y = radius; y < h - radius; y++) {
    for (let x = radius; x < w - radius; x++) {
      const i = y * w + x;
      let all = 1;
      for (let dy = -radius; dy <= radius && all; dy++) {
        for (let dx = -radius; dx <= radius && all; dx++) {
          if (!binary[(y + dy) * w + (x + dx)]) all = 0;
        }
      }
      result[i] = all;
    }
  }
  return result;
}

function morphologyClose(binary, w, h, radius) {
  const d = dilate(binary, w, h, radius);
  return erode(d, w, h, radius);
}

module.exports = { extract };
