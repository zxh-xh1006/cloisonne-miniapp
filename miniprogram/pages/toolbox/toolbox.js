// pages/toolbox/toolbox.js
const app = getApp();

Page({
  data: {
    // 当前结果
    lineArtUrl: '',
    effectUrl: '',
    hasResult: false,

    // 微调参数
    lineWidth: 3,
    colorCount: 6,
    colorScheme: 0,

    // 配色方案
    colorSchemes: [],
    customColors: [],

    // 视图
    viewMode: 'effect',

    // 上传
    imagePath: '',
    processing: false,
    progressText: ''
  },

  onLoad() {
    const schemes = app.globalData.colorSchemes || [];
    this.setData({
      colorSchemes: schemes,
      customColors: schemes[0] ? schemes[0].colors : []
    });
    this.loadCurrentResult();
  },

  onShow() {
    this.loadCurrentResult();
  },

  loadCurrentResult() {
    const result = app.globalData.currentResult;
    if (result) {
      this.setData({
        lineArtUrl: result.lineArtUrl || '',
        effectUrl: result.effectUrl || '',
        hasResult: true,
        lineWidth: result.lineWidth || 3,
        colorCount: result.colorCount || 6,
        colorScheme: result.colorScheme || 0
      });
    }
  },

  // 选择图片
  onChooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({ imagePath: tempFilePath });
        this.processImage();
      }
    });
  },

  // 处理图片
  async processImage() {
    if (!this.data.imagePath) return;
    this.setData({ processing: true, progressText: '上传中...' });

    try {
      const cloudPath = `toolbox/${Date.now()}.png`;
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: this.data.imagePath
      });

      this.setData({ progressText: 'AI 处理中...' });

      const res = await wx.cloud.callFunction({
        name: 'processImage',
        data: {
          fileID: uploadRes.fileID,
          lineWidth: this.data.lineWidth,
          colorCount: this.data.colorCount,
          colorScheme: this.data.colorScheme
        }
      });

      if (res.result.code !== 0) throw new Error(res.result.message);

      const urlRes = await wx.cloud.getTempFileURL({
        fileList: [res.result.data.lineArtFileID, res.result.data.effectFileID]
      });

      const result = {
        lineArtFileID: res.result.data.lineArtFileID,
        effectFileID: res.result.data.effectFileID,
        lineArtUrl: urlRes.fileList[0].tempFileURL,
        effectUrl: urlRes.fileList[1].tempFileURL,
        lineWidth: this.data.lineWidth,
        colorCount: this.data.colorCount,
        colorScheme: this.data.colorScheme
      };

      app.globalData.currentResult = result;
      this.setData({
        lineArtUrl: result.lineArtUrl,
        effectUrl: result.effectUrl,
        hasResult: true,
        processing: false
      });
    } catch (err) {
      this.setData({ processing: false });
      wx.showModal({ title: '处理失败', content: err.message, showCancel: false });
    }
  },

  // 线条粗细变化
  onLineWidthChange(e) {
    this.setData({ lineWidth: e.detail.value });
  },

  // 色块数量变化
  onColorCountChange(e) {
    this.setData({ colorCount: e.detail.value });
  },

  // 应用预设配色
  onApplyScheme(e) {
    const { index } = e.currentTarget.dataset;
    const scheme = this.data.colorSchemes[index];
    this.setData({
      colorScheme: index,
      customColors: scheme.colors
    });
  },

  // 选择自定义颜色
  onPickColor(e) {
    const { index } = e.currentTarget.dataset;
    wx.showActionSheet({
      itemList: ['红色', '蓝色', '绿色', '黄色', '紫色', '白色', '黑色'],
      success: (res) => {
        const colorMap = ['#c0392b', '#1a4b8c', '#27ae60', '#f1c40f', '#8e44ad', '#ecf0f1', '#1a1a1a'];
        const colors = this.data.customColors.slice();
        colors[index] = colorMap[res.tapIndex];
        this.setData({ customColors: colors });
      }
    });
  },

  // 应用参数重新生成
  onApplyParams() {
    if (!this.data.imagePath) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }
    this.processImage();
  },

  // 切换视图
  onSwitchView(e) {
    this.setData({ viewMode: e.currentTarget.dataset.mode });
  },

  // 导出
  onExport(type) {
    const url = type === 'lineart' ? this.data.lineArtUrl : this.data.effectUrl;
    if (!url) return;
    wx.showLoading({ title: '保存中...' });
    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.hideLoading();
              wx.showToast({ title: '已保存到相册', icon: 'success' });
            },
            fail: () => {
              wx.hideLoading();
              wx.showModal({
                title: '需要相册权限',
                content: '请在设置中开启相册保存权限',
                confirmText: '去设置',
                success: (r) => { if (r.confirm) wx.openSetting(); }
              });
            }
          });
        }
      }
    });
  },

  onExportLineArt() { this.onExport('lineart'); },
  onExportEffect() { this.onExport('effect'); },

  // 收藏
  onFavorite() {
    const result = app.globalData.currentResult;
    if (!result) {
      wx.showToast({ title: '暂无可收藏内容', icon: 'none' });
      return;
    }
    const db = wx.cloud.database();
    db.collection('favorites').add({
      data: {
        lineArtFileID: result.lineArtFileID,
        effectFileID: result.effectFileID,
        lineWidth: this.data.lineWidth,
        colorCount: this.data.colorCount,
        colorScheme: this.data.colorScheme,
        createTime: db.serverDate()
      },
      success: () => wx.showToast({ title: '收藏成功', icon: 'success' }),
      fail: () => wx.showToast({ title: '收藏失败', icon: 'none' })
    });
  }
});
