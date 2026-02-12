# Mercury Login

通用登录前端项目 —— 统一身份认证平台。

## 项目简介

用户从 A、B、C 等多个业务项目点击登录后，统一跳转到本项目的登录页面，完成登录后携带 token 回到原来的项目中，实现跨项目单点登录。

## 功能特性

- **手机验证码登录** — 手机号格式校验、发送验证码 60 秒倒计时、信息提示
- **邮箱验证码登录** — 邮箱格式校验、发送验证码 60 秒倒计时、信息提示
- **微信扫码登录** — 二维码展示、120 秒自动过期、刷新二维码、扫描成功提示
- **微信公众号登录** — 扫码关注公众号完成登录、二维码过期与刷新、扫描成功提示

## 技术栈

- [Vue 3](https://vuejs.org/) — 使用 Composition API (`<script setup>`)
- [Vite](https://vite.dev/) — 构建工具
- [Element Plus](https://element-plus.org/) — UI 组件库
- [@element-plus/icons-vue](https://element-plus.org/en-US/component/icon.html) — 图标库

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 8

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

浏览器访问 http://localhost:5173 即可预览登录页面。

### 构建生产版本

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

### 预览生产构建

```bash
npm run preview
```

## 使用方式

业务项目将用户跳转到本登录页时，需在 URL 中携带 `redirect` 参数：

```
https://login.example.com/?redirect=https://app.example.com/callback
```

用户完成登录后，页面会自动跳转回 `redirect` 地址并附带 `token` 参数：

```
https://app.example.com/callback?token=xxx
```

## 项目结构

```
mercury-login/
├── index.html                 # 入口 HTML
├── package.json               # 项目配置与依赖
├── vite.config.js             # Vite 配置
├── public/                    # 静态资源
│   └── vite.svg
└── src/
    ├── main.js                # 应用入口，注册 Element Plus
    ├── App.vue                # 根组件
    ├── style.css              # 全局样式重置
    ├── assets/                # 资源文件
    │   └── vue.svg
    └── components/
        └── LoginPage.vue      # 登录页主组件（包含四种登录方式）
```

## 页面预览

登录页采用左右分栏布局：左侧为品牌展示区（渐变背景），右侧为登录表单区，支持通过标签页切换四种登录方式。页面在移动端自动隐藏左侧栏并适配小屏布局。

## 设计说明

- 页面设计参考了国内主流厂商（阿里、腾讯、字节跳动等）的登录页风格
- 简约而不简单，色调主流，布局合理
- 使用 Element Plus 组件库，保持一致的视觉体验
- 响应式设计，兼容桌面端与移动端
