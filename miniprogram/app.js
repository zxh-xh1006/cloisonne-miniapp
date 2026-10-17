// app.js
App({
  onLaunch: function () {
    // 云开发初始化
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        // env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
        // 此处请填入环境 ID, 环境 ID 可打开云控制台查看
        // 如不填则使用默认环境（第一个创建的环境）
        env: 'cloisonne-env',
        traceUser: true,
      });
    }

    // 全局数据
    this.globalData = {
      // 传统珐琅配色方案
      colorSchemes: [
        {
          name: '经典景泰蓝',
          colors: ['#1a4b8c', '#0f3460', '#d4af37', '#c0392b', '#27ae60']
        },
        {
          name: '石青朱红',
          colors: ['#1e6091', '#1a5276', '#c0392b', '#d4af37', '#f1c40f']
        },
        {
          name: '鹅黄嫩绿',
          colors: ['#f4d03f', '#f9e79f', '#27ae60', '#1a4b8c', '#d4af37']
        },
        {
          name: '宝石五彩',
          colors: ['#8e44ad', '#1a4b8c', '#c0392b', '#27ae60', '#f1c40f']
        },
        {
          name: '素雅青花',
          colors: ['#1a4b8c', '#2874a6', '#85c1e9', '#d4af37', '#ecf0f1']
        }
      ],
      // 当前处理中的图片路径
      currentImage: '',
      // 当前生成结果
      currentResult: null
    };
  },

  globalData: {
    colorSchemes: [],
    currentImage: '',
    currentResult: null
  }
});
