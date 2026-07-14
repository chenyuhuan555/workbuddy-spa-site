# WorkBuddy - 猎头看板 SPA

这是一个单文件 SPA 应用，用于猎头快速筛选简历、管理候选人画像。

## 功能特性

- 📄 快速筛选简历（Swipe + PDF 预览）
- 👤 候选人画像库（集成 pdf.js、OCR 及 DeepSeek API）
- 📥 BOSS 导入功能
- ☁️ GitHub Gist 云同步

## 技术栈

- 单文件 SPA 架构（index.html）
- DeepSeek API（简历解析）
- GitHub Gist（云同步）
- pdf.js + OCR（PDF 处理）

## 使用方法

1. 直接在浏览器中打开 `index.html`
2. 配置 DeepSeek API Key
3. 开始使用！

## 部署

已部署到 CloudStudio：https://255cd038c7ac4f08a7d9ee3566700a17.app.codebuddy.work

## 更新日志

- 2026-06-09: 优化 Gist 云同步 CLEANUP_GRACE 机制
- 2026-06-09: 增加 fetch 超时逻辑
- 2026-06-09: 修复 applyRemote 数据覆盖问题
