// scripts/gen-icons.js - 生成 TabBar 简单 PNG 图标
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// 创建一个简单的 PNG（纯色圆形图标）
function createPNG(size, rgba) {
  const width = size, height = size;
  const rawData = Buffer.alloc(width * height * 4);

  // 画一个圆形
  const cx = width / 2, cy = height / 2, r = width * 0.38;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= r) {
        rawData[idx] = rgba[0];
        rawData[idx + 1] = rgba[1];
        rawData[idx + 2] = rgba[2];
        rawData[idx + 3] = 255;
      } else if (dist <= r + 1) {
        // 抗锯齿边缘
        const alpha = 1 - (dist - r);
        rawData[idx] = rgba[0];
        rawData[idx + 1] = rgba[1];
        rawData[idx + 2] = rgba[2];
        rawData[idx + 3] = Math.floor(alpha * 255);
      } else {
        rawData[idx + 3] = 0;
      }
    }
  }

  return encodePNG(width, height, rawData);
}

function encodePNG(width, height, rawData) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT chunk
  const filtered = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    filtered[y * (1 + width * 4)] = 0; // filter type: none
    rawData.copy(filtered, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(filtered);

  const makeChunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  };

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// CRC32
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// 生成图标
const outDir = path.join(__dirname, '..', 'miniprogram', 'images', 'tab');
fs.mkdirSync(outDir, { recursive: true });

const icons = [
  { name: 'home', color: [138, 138, 138] },
  { name: 'home-active', color: [212, 175, 55] },
  { name: 'toolbox', color: [138, 138, 138] },
  { name: 'toolbox-active', color: [212, 175, 55] },
  { name: 'favorite', color: [138, 138, 138] },
  { name: 'favorite-active', color: [212, 175, 55] }
];

icons.forEach(icon => {
  const png = createPNG(81, icon.color);
  fs.writeFileSync(path.join(outDir, `${icon.name}.png`), png);
  console.log(`Generated ${icon.name}.png`);
});

console.log('All icons generated!');
