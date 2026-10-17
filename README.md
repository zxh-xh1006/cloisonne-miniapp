# 掐丝珐琅纹样生成小程序

一款微信小程序，通过 AI 图像处理将任意图片转化为掐丝珐琅（景泰蓝）风格纹样，支持金属丝轮廓线稿与带釉料质感的效果图两种输出。

## 功能特性

### 首页
- 📷 拍照上传 / 🖼️ 相册图片上传
- 掐丝珐琅非遗文化科普介绍
- 小程序生成的纹样样例展示

### 图片预处理
- 图像抠图：分离主体纹样与背景
- 线条提取：提取轮廓线（适配掐丝"丝"的金属线条）
- 降噪：清理照片杂点
- 支持：手绘草图、花卉、传统纹样、人物剪影、几何图案

### AI 纹样生成
- 金属丝轮廓：模拟铜丝弯折的连续线条
- 分区色块：图形分割成封闭区域（点蓝填色区域）
- 配色推荐：传统珐琅配色（宝蓝、石青、朱红、石绿、鹅黄）
- 两种导出预览：
  - 线稿版：金属掐丝轮廓（可打印用于手工描图）
  - 效果图版：完整掐丝珐琅成品预览

### 工具箱
- 纹样微调：调整线条粗细、色块数量
- 配色面板：预设传统珐琅色卡 + 自定义换色
- 导出：PNG 效果图 / 黑白线稿图（保存到相册）
- 纹样收藏：保存历史生成记录

## 技术栈

- **前端**：微信小程序原生框架（WXML + WXSS + JS）
- **后端**：微信云开发（云函数 + 云存储 + 云数据库）
- **图像处理**：纯 JS 实现（jimp + 手写算法）
  - Sobel + Canny 边缘检测
  - GrabCut 简化版抠图
  - K-Means 色块分割
  - 形态学处理（膨胀/腐蚀/闭运算）

## 项目结构

```
cloisonne-miniapp/
├── miniprogram/              # 小程序前端
│   ├── pages/
│   │   ├── index/            # 首页
│   │   ├── process/          # 处理结果页
│   │   ├── toolbox/          # 工具箱
│   │   ├── favorites/        # 收藏列表
│   │   └── favorite-detail/  # 收藏详情
│   ├── images/tab/           # TabBar 图标
│   ├── app.js / app.json / app.wxss
│   └── sitemap.json
├── cloudfunctions/
│   └── processImage/         # 图像处理云函数
│       ├── index.js
│       └── lib/
│           ├── preprocess.js   # 抠图 + 降噪
│           ├── lineExtract.js  # 轮廓线条提取
│           ├── patternGen.js   # 纹样生成
│           └── storage.js      # 云存储工具
├── scripts/
│   └── gen-icons.ps1         # TabBar 图标生成脚本
├── project.config.json
└── README.md
```

## 快速开始

### 1. 环境准备
- 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 开通微信云开发，创建云环境

### 2. 配置
- 在 `miniprogram/app.js` 中替换 `env` 为你的云环境 ID
- 在 `project.config.json` 中替换 `appid` 为你的小程序 AppID

### 3. 部署云函数
1. 在微信开发者工具中右键 `cloudfunctions/processImage` 目录
2. 选择"上传并部署：云端安装依赖"
3. 在云开发控制台创建 `favorites` 数据库集合

### 4. 运行
- 在微信开发者工具中打开项目，编译运行

## 传统珐琅配色

| 色名 | 色值 |
|------|------|
| 宝蓝 | #1a4b8c |
| 石青 | #1e6091 |
| 朱红 | #c0392b |
| 石绿 | #27ae60 |
| 鹅黄 | #f1c40f |
| 紫晶 | #8e44ad |
| 金色 | #d4af37 |

## 许可

MIT License
