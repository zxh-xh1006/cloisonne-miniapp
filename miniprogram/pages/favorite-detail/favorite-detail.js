// pages/favorite-detail/favorite-detail.js
Page({
  data: {
    id: '',
    effectUrl: '',
    lineArtUrl: '',
    viewMode: 'effect',
    loading: true
  },

  async onLoad(options) {
    const { id, effectFileID, lineArtFileID } = options;
    this.setData({ id });

    try {
      const urlRes = await wx.cloud.getTempFileURL({
        fileList: [effectFileID, lineArtFileID]
      });
      this.setData({
        effectUrl: urlRes.fileList[0].tempFileURL,
        lineArtUrl: urlRes.fileList[1].tempFileURL,
        loading: false
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onSwitchView(e) {
    this.setData({ viewMode: e.currentTarget.dataset.mode });
  },

  onExport(type) {
    const url = type === 'lineart' ? this.data.lineArtUrl : this.data.effectUrl;
    wx.showLoading({ title: '保存中...' });
    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.hideLoading();
              wx.showToast({ title: '已保存', icon: 'success' });
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
  onExportEffect() { this.onExport('effect'); }
});
