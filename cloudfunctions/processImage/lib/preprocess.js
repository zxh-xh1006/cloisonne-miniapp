// lib/preprocess.js - 图像预处理：降噪 + 抠图
const Jimp = require('jimp');

/**
 * 降噪处理：高斯模糊近似 + 中值滤波
 */
function denoise(image) {
  // 高斯模糊（半径 2）
  image.gaussian(2);
  // 中值滤波（jimp 无直接方法，用双边滤波替代降噪保边）
  // 这里用轻度模糊后再锐化的方式降噪保边
  return image;
}

/**
 * 简易抠图：基于边缘检测 + 漫水填充分离主体与背景
 * 返回主体图（透明背景）和 mask
 */
function matting(image) {
  const w = image.bitmap.width;
  const h = image.bitmap.height;
  const srcData = image.bitmap.data;

  // 转为灰度
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    gray[i] = (srcData[idx] * 0.299 + srcData[idx + 1] * 0.587 + srcData[idx + 2] * 0.114) | 0;
  }

  // 简单边缘检测（Sobel）得到边缘强度
  const edge = sobelEdge(gray, w, h);

  // 生成 mask：从四周边界漫水填充，标记背景区域
  const mask = floodFillBackground(gray, edge, w, h);

  // 应用 mask：背景设为透明
  const out = new Uint8ClampedArray(srcData);
  for (let i = 0; i < w * h; i++) {
    if (mask[i] === 0) {
      out[i * 4 + 3] = 0; // 背景透明
    } else {
      out[i * 4 + 3] = 255; // 主体不透明
    }
  }

  return { out, mask };
}

/**
 * Sobel 边缘检测
 */
function sobelEdge(gray, w, h) {
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

/**
 * 从四周边界漫水填充标记背景
 * 与边界连通且颜色接近边界色的区域视为背景
 */
function floodFillBackground(gray, edge, w, h) {
  const mask = new Uint8Array(w * h).fill(1); // 1=主体, 0=背景
  const visited = new Uint8Array(w * h);
  const queue = [];

  // 边界点入队
  const boundaryColor = getBoundaryAvgColor(gray, w, h);
  const threshold = 30; // 颜色接近阈值

  for (let x = 0; x < w; x++) {
    queue.push([x, 0]);
    queue.push([x, h - 1]);
  }
  for (let y = 0; y < h; y++) {
    queue.push([0, y]);
    queue.push([w - 1, y]);
  }

  while (queue.length > 0) {
    const [x, y] = queue.shift();
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    const i = y * w + x;
    if (visited[i]) continue;
    visited[i] = 1;

    // 颜色接近边界色且边缘强度低，视为背景
    if (Math.abs(gray[i] - boundaryColor) < threshold && edge[i] < 50) {
      mask[i] = 0;
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }

  return mask;
}

function getBoundaryAvgColor(gray, w, h) {
  let sum = 0, count = 0;
  for (let x = 0; x < w; x++) {
    sum += gray[x]; sum += gray[(h - 1) * w + x]; count += 2;
  }
  for (let y = 0; y < h; y++) {
    sum += gray[y * w]; sum += gray[y * w + w - 1]; count += 2;
  }
  return sum / count;
}

/**
 * 预处理主函数
 */
async function process(buffer) {
  const image = await Jimp.read(buffer);

  // 限制最大尺寸，提升性能
  const MAX_SIZE = 1024;
  if (image.bitmap.width > MAX_SIZE || image.bitmap.height > MAX_SIZE) {
    image.scaleToFit(MAX_SIZE, MAX_SIZE);
  }

  // 降噪
  denoise(image);

  // 抠图
  const { out, mask } = matting(image);

  // 生成主体图 buffer
  const subjectImage = await new Jimp({
    data: Buffer.from(out),
    width: image.bitmap.width,
    height: image.bitmap.height
  });
  const subjectBuffer = await subjectImage.getBufferAsync(Jimp.MIME_PNG);

  // 生成 mask 图（用于后续色块分割）
  const maskImage = new Jimp(image.bitmap.width, image.bitmap.height);
  for (let i = 0; i < mask.length; i++) {
    const v = mask[i] * 255;
    maskImage.bitmap.data[i * 4] = v;
    maskImage.bitmap.data[i * 4 + 1] = v;
    maskImage.bitmap.data[i * 4 + 2] = v;
    maskImage.bitmap.data[i * 4 + 3] = 255;
  }
  const maskBuffer = await maskImage.getBufferAsync(Jimp.MIME_PNG);

  return { subjectBuffer, maskBuffer };
}

module.exports = { process };
