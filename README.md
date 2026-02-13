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

### 1. 业务项目发起登录

业务项目将用户跳转到本登录页时，需在 URL 中携带 `redirect` 参数，指定登录成功后的回调地址：

```
https://login.example.com/?redirect=https://app.example.com/callback
```

> `redirect` 参数定义在 `LoginPage.vue` 中，通过 `URLSearchParams` 从当前页面 URL 的查询参数中读取。

### 2. 登录成功后的跳转

用户完成任意方式的登录（手机验证码、邮箱验证码、微信扫码、微信公众号）后，前端调用 `handleLoginSuccess(data)` 函数触发跳转。该函数将后端返回的认证信息附加到 `redirect` 地址上，然后通过 `window.location.href` 跳转回业务项目：

```
https://app.example.com/callback?token=<JWT令牌>&tenantId=<租户ID>
```

跳转时携带的参数：

| 参数 | 来源 | 说明 |
|------|------|------|
| `token` | 后端登录接口返回 `data.token` | JWT 认证令牌，**必传** |
| `tenantId` | 后端登录接口返回 `data.tenantId` | 租户标识，有值时传递 |

> 如果未提供 `redirect` 参数，登录成功后仅在页面上展示 Token 信息，不执行跳转。

### 3. 业务项目接收登录结果

业务项目在回调页面中从 URL 查询参数提取 `token` 和 `tenantId`，用于后续的接口鉴权：

```javascript
// 在业务项目的回调页面中
const params = new URLSearchParams(window.location.search)
const token = params.get('token')       // JWT 令牌
const tenantId = params.get('tenantId') // 租户 ID（可能为 null）

// 将 token 保存到 localStorage 或状态管理中
localStorage.setItem('token', token)
if (tenantId) {
  localStorage.setItem('tenantId', tenantId)
}

// 后续请求携带 token
fetch('/api/data', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### 完整流程图

```
业务项目 A                        Mercury Login                        后端认证服务
    |                                 |                                     |
    |  1. 跳转到登录页                 |                                     |
    |  ?redirect=https://a.com/cb     |                                     |
    | ——————————————————————————————> |                                     |
    |                                 |  2. 用户输入手机号/邮箱/扫码           |
    |                                 |  3. 调用后端登录接口                   |
    |                                 | ——————————————————————————————————> |
    |                                 |                                     |
    |                                 |  4. 返回 { token, tenantId, ... }   |
    |                                 | <—————————————————————————————————— |
    |                                 |                                     |
    |  5. 跳转回 redirect 地址         |                                     |
    |  ?token=xxx&tenantId=yyy        |                                     |
    | <—————————————————————————————— |                                     |
    |                                 |                                     |
    |  6. 从 URL 提取 token 进行鉴权   |                                     |
    |                                 |                                     |
```

## 后端接口对接

当准备对接真实后端时，设置环境变量关闭 Mock 模式：

```bash
VITE_API_MOCK=false
VITE_API_BASE_URL=http://your-server:port/auth-api
```

后端返回的登录成功报文格式（`data` 中的字段会被传递到跳转 URL）：

```json
{
  "code": "200",
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "tenantId": "tenant-001",
    "userId": "user-001",
    "username": "张三"
  }
}
```

> 完整的接口文档参见 `src/api/auth.js` 文件顶部注释。

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
    ├── api/                   # API 层
    │   ├── config.js          # API 配置（基础 URL、Mock 开关）
    │   ├── request.js         # HTTP 请求封装（fetch + 超时 + 错误处理）
    │   ├── mock.js            # Mock 数据（开发阶段模拟后端响应）
    │   └── auth.js            # 认证接口（短信/邮箱/微信登录、验证码）
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
