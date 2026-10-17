// lib/storage.js - 云存储下载/上传工具
const cloud = require('wx-server-sdk');

/**
 * 从云存储下载图片
 * @param {string} fileID 云文件 ID
 * @returns {Buffer} 图片 buffer
 */
async function downloadImage(fileID) {
  const res = await cloud.downloadFile({ fileID });
  return res.fileContent;
}

/**
 * 上传图片到云存储
 * @param {Buffer} buffer 图片 buffer
 * @param {string} cloudPath 云存储路径
 * @returns {string} fileID
 */
async function uploadImage(buffer, cloudPath) {
  const res = await cloud.uploadFile({
    cloudPath,
    fileContent: buffer
  });
  return res.fileID;
}

module.exports = { downloadImage, uploadImage };
