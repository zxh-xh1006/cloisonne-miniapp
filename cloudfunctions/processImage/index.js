// index.js - 掐丝珐琅纹样生成云函数入口
const cloud = require('wx-server-sdk');
const preprocess = require('./lib/preprocess');
const lineExtract = require('./lib/lineExtract');
const patternGen = require('./lib/patternGen');
const { uploadImage, downloadImage } = require('./lib/storage');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { fileID, lineWidth = 3, colorCount = 6, colorScheme = 0 } = event;

  if (!fileID) {
    return { code: -1, message: '缺少 fileID 参数' };
  }

  try {
    console.log('[processImage] 开始处理, fileID:', fileID);
    const startTime = Date.now();

    // 1. 下载原图
    const originalBuffer = await downloadImage(fileID);
    console.log('[processImage] 原图下载完成, 大小:', originalBuffer.length);

    // 2. 图像预处理（降噪 + 抠图）
    const { subjectBuffer, maskBuffer } = await preprocess.process(originalBuffer);
    console.log('[processImage] 预处理完成');

    // 3. 轮廓线条提取
    const lineBuffer = await lineExtract.extract(subjectBuffer, { lineWidth });
    console.log('[processImage] 线条提取完成');

    // 4. 纹样生成（金属丝轮廓 + 色块分区）
    const { lineArtBuffer, effectBuffer } = await patternGen.generate(
      subjectBuffer,
      lineBuffer,
      maskBuffer,
      { lineWidth, colorCount, colorScheme }
    );
    console.log('[processImage] 纹样生成完成');

    // 5. 上传结果到云存储
    const ts = Date.now();
    const [lineArtFileID, effectFileID] = await Promise.all([
      uploadImage(lineArtBuffer, `lineart/${ts}.png`),
      uploadImage(effectBuffer, `effect/${ts}.png`)
    ]);

    const elapsed = Date.now() - startTime;
    console.log(`[processImage] 处理完成, 耗时 ${elapsed}ms`);

    return {
      code: 0,
      message: '处理成功',
      data: {
        lineArtFileID,
        effectFileID,
        elapsed
      }
    };
  } catch (err) {
    console.error('[processImage] 处理失败:', err);
    return { code: -2, message: '处理失败: ' + err.message };
  }
};
