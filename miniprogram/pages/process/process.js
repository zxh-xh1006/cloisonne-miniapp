// pages/process/process.js
const app = getApp();

Page({
  data: {
    imagePath: '',
    loading: true,
    progressText: '正在上传图片...',
    viewMode: 'effect', // 'lineart' | 'effect'
    lineArtFileID: '',
    effectFileID: '',
    lineArtUrl: '',
    effectUrl: '',
    result: null,
    lineWidth: 3,
    colorCount: 6,
    colorScheme: 0,
    processing: false
  },

  onLoad(options) {
    const imagePath = decodeURIComponent(options.imagePath || '');
    this.setData({ imagePath });
    this.processImage();
  },

  // 上传并处理图片
  async processImage() {
    this.setData({ loading: true, progressText: '正在上传图片...' });

    try {
      // 上传到云存储
      const cloudPath = `uploads/${Date.now()}.png`;
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: this.data.imagePath
      });

      this.setData({ progressText: '正在抠图与降噪...' });

      // 调用云函数处理
      const res = await wx.cloud.callFunction({
        name: 'processImage',
        data: {
          fileID: uploadRes.fileID,
          lineWidth: this.data.lineWidth,
          colorCount: this.data.colorCount,
          colorScheme: this.data.colorScheme
        }
      });

      if (res.result.code !== 0) {
        throw new Error(res.result.message || '处理失败');
      }

      const { lineArtFileID, effectFileID, elapsed } = res.result.data;

      // 获取临时 URL 用于显示
      const urlRes = await wx.cloud.getTempFileURL({
        fileList: [lineArtFileID, effectFileID]
      });

      const lineArtUrl = urlRes.fileList[0].tempFileURL;
      const effectUrl = urlRes.fileList[1].tempFileURL;

      this.setData({
        loading: false,
        lineArtFileID,
        effectFileID,
        lineArtUrl,
        effectUrl,
        result: res.result.data
      });

      app.globalData.currentResult = {
        lineArtFileID,
        effectFileID,
        lineArtUrl,
        effectUrl,
        lineWidth: this.data.lineWidth,
        colorCount: this.data.colorCount,
        colorScheme: this.data.colorScheme
      };

    } catch (err) {
      console.error(err);
      this.setData({ loading: false });
      wx.showModal({
        title: '处理失败',
        content: err.message || '图像处理出错，请重试',
        showCancel: false
      });
    }
  },

  // 切换视图
  onSwitchView(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ viewMode: mode });
  },

  // 跳转工具箱
  onGoToolbox() {
    const result = encodeURIComponent(JSON.stringify(this.data.result));
    wx.switchTab({
      url: '/pages/toolbox/toolbox'
    });
  },

  // 导出线稿
  onExportLineArt() {
    this.saveImage(this.data.lineArtUrl, '线稿');
  },

  // 导出效果图
  onExportEffect() {
    this.saveImage(this.data.effectUrl, '效果图');
  },

  // 保存图片到相册
  saveImage(url, type) {
    wx.showLoading({ title: `正在保存${type}...` });
    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.hideLoading();
              wx.showToast({ title: `${type}已保存`, icon: 'success' });
            },
            fail: (err) => {
              wx.hideLoading();
              if (err.errMsg.indexOf('auth deny') > -1) {
                wx.showModal({
                  title: '需要相册权限',
                  content: '请在设置中开启相册保存权限',
                  confirmText: '去设置',
                  success: (r) => {
                    if (r.confirm) wx.openSetting();
                  }
                });
              } else {
                wx.showToast({ title: '保存失败', icon: 'none' });
              }
            }
          });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      }
    });
  },

  // 收藏
  onFavorite() {
    const db = wx.cloud.database();
    db.collection('favorites').add({
      data: {
        lineArtFileID: this.data.lineArtFileID,
        effectFileID: this.data.effectFileID,
        lineWidth: this.data.lineWidth,
        colorCount: this.data.colorCount,
        colorScheme: this.data.colorScheme,
        createTime: db.serverDate()
      },
      success: () => {
        wx.showToast({ title: '收藏成功', icon: 'success' });
      },
      fail: (err) => {
        wx.showToast({ title: '收藏失败', icon: 'none' });
      }
    });
  },

  // 重新处理（使用不同参数）
  onReprocess() {
    this.processImage();
  }
});
