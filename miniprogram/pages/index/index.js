// pages/index/index.js
const app = getApp();

Page({
  data: {
    cases: [
      { id: 1, title: '花卉牡丹', color: '#c0392b' },
      { id: 2, title: '几何回纹', color: '#1a4b8c' },
      { id: 3, title: '瑞兽麒麟', color: '#27ae60' },
      { id: 4, title: '缠枝莲纹', color: '#8e44ad' },
      { id: 5, title: '云鹤纹样', color: '#f1c40f' }
    ],
    colorSchemes: app.globalData.colorSchemes || []
  },

  onLoad() {
    // 确保 colorSchemes 已加载
    if (app.globalData.colorSchemes && app.globalData.colorSchemes.length > 0) {
      this.setData({ colorSchemes: app.globalData.colorSchemes });
    }
  },

  // 拍照上传
  onTakePhoto() {
    this.chooseImage('camera');
  },

  // 相册上传
  onAlbumUpload() {
    this.chooseImage('album');
  },

  chooseMedia(sourceType) {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: [sourceType],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        app.globalData.currentImage = tempFilePath;
        wx.navigateTo({
          url: `/pages/process/process?imagePath=${encodeURIComponent(tempFilePath)}`
        });
      },
      fail: (err) => {
        if (err.errMsg.indexOf('cancel') === -1) {
          wx.showToast({ title: '选择图片失败', icon: 'none' });
        }
      }
    });
  },

  // 查看案例
  onViewCase(e) {
    const { id } = e.currentTarget.dataset;
    wx.showToast({ title: `案例 ${id}`, icon: 'none' });
  }
});
