// pages/favorites/favorites.js
Page({
  data: {
    list: [],
    loading: false,
    empty: true
  },

  onShow() {
    this.loadFavorites();
  },

  async loadFavorites() {
    this.setData({ loading: true });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('favorites')
        .orderBy('createTime', 'desc')
        .limit(50)
        .get();

      const list = res.data.map(item => ({
        _id: item._id,
        effectFileID: item.effectFileID,
        lineArtFileID: item.lineArtFileID,
        createTime: this.formatTime(item.createTime)
      }));

      // 获取缩略图 URL
      if (list.length > 0) {
        const fileIDs = list.map(i => i.effectFileID);
        const urlRes = await wx.cloud.getTempFileURL({ fileList: fileIDs });
        list.forEach((item, idx) => {
          item.thumbUrl = urlRes.fileList[idx].tempFileURL;
        });
      }

      this.setData({
        list,
        empty: list.length === 0,
        loading: false
      });
    } catch (err) {
      this.setData({ loading: false });
      console.error(err);
    }
  },

  formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const pad = n => n < 10 ? '0' + n : n;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  // 查看详情
  onViewDetail(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.list.find(i => i._id === id);
    if (item) {
      wx.navigateTo({
        url: `/pages/favorite-detail/favorite-detail?id=${id}&effectFileID=${item.effectFileID}&lineArtFileID=${item.lineArtFileID}`
      });
    }
  },

  // 删除收藏
  async onDelete(e) {
    const { id } = e.currentTarget.dataset;
    const res = await wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复',
      confirmColor: '#c0392b'
    });
    if (!res.confirm) return;

    try {
      const db = wx.cloud.database();
      await db.collection('favorites').doc(id).remove();
      wx.showToast({ title: '已删除', icon: 'success' });
      this.loadFavorites();
    } catch (err) {
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  }
});
