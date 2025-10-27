# Web Proxy CLI

🌐 简单而强大的 CORS 代理服务器 CLI 工具，完美解决本地开发时的跨域问题。

## 功能特性

- ✅ **CORS 支持** - 自动处理 CORS 请求头，支持 credentials 模式
- ✅ **HTTP/HTTPS** - 同时支持 HTTP 和 HTTPS 目标站点
- ✅ **请求日志** - 可选的请求日志功能，方便调试
- ✅ **重定向处理** - 自动重写重定向地址，保持在代理域内
- ✅ **简单易用** - 简洁的命令行界面
- ✅ **配置文件** - 支持配置文件管理
- ✅ **TypeScript** - 使用 TypeScript 编写，提供完整类型定义

## 安装

### 全局安装（推荐）

```bash
npm install -g web-proxy-cli
# 或
pnpm add -g web-proxy-cli
# 或
yarn global add web-proxy-cli
```

### 本地安装

```bash
npm install web-proxy-cli
# 或
pnpm add web-proxy-cli
```

## 快速开始

### 命令行使用方式

```bash
# 启动代理服务器
proxy --port 8000 --target http://example.com

# 自定义选项
proxy --port 3001 --target https://api.example.com --timeout 60000
```

### 使用配置文件方式

1. 生成配置文件：

```bash
proxy init
```

2. 编辑 `proxy.config.js`：

```javascript
module.exports = {
  port: 8000,
  target: 'http://example.com',
  logger: true,
  timeout: 30000,
};
```

3. 启动代理：

```bash
proxy start
# 或简单地
proxy
```

## CLI 命令

### `proxy start`（默认）

启动代理服务器。

```bash
proxy [选项]
proxy start [选项]
```

**选项：**

- `-p, --port <端口>` - 监听端口（默认：8000）
- `-t, --target <地址>` - 目标网站地址（必填）
- `-c, --config <文件>` - 配置文件路径（默认：proxy.config.js）
- `--no-logger` - 禁用请求日志
- `--timeout <毫秒>` - 请求超时时间（默认：30000）

**示例：**

```bash
# 基本用法
proxy --port 8000 --target http://localhost:7071

# 自定义超时时间
proxy --port 8000 --target https://api.example.com --timeout 60000

# 禁用日志
proxy --port 8000 --target http://example.com --no-logger

# 使用自定义配置文件
proxy --config my-proxy.config.js
```

### `proxy init`

在当前目录生成 `proxy.config.js` 配置文件。

```bash
proxy init
```

### `proxy --help`

显示帮助信息。

```bash
proxy --help
proxy -h
```

### `proxy --version`

显示版本信息。

```bash
proxy --version
proxy -v
```

## 配置文件

配置文件 (`proxy.config.js`) 支持以下选项：

```javascript
module.exports = {
  // 必填：代理目标地址
  target: 'http://example.com',
  
  // 可选：监听端口（默认：8000）
  port: 8000,
  
  // 可选：启用请求日志（默认：true）
  logger: true,
  
  // 可选：请求超时时间，单位毫秒（默认：30000）
  timeout: 30000,
};
```

## 使用场景

### 1. 本地开发调用外部 API

```bash
# 前端运行在 http://localhost:3000
# 外部 API 地址为 http://api.example.com
# 启动代理：
proxy --port 8000 --target http://api.example.com

# 前端请求 http://localhost:8000 即可
```

### 2. 开发时绕过 CORS 限制

```bash
# 目标网站有严格的 CORS 策略
proxy --port 8000 --target https://strict-cors-site.com

# 通过 http://localhost:8000 访问，完全支持 CORS
```

### 3. 测试带凭证的请求

代理自动处理 `credentials: 'include'` 请求：

```javascript
// 前端代码
fetch('http://localhost:8000/api/data', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
})
```

## 工作原理

代理服务器会：

1. 接收来自前端的请求
2. 使用正确的请求头转发到目标服务器
3. 处理 CORS 预检（OPTIONS）请求
4. 为响应添加适当的 CORS 头
5. 重写重定向地址以保持在代理域内
6. 将响应返回给前端

## 环境变量

也可以使用环境变量：

```bash
PORT=8000 TARGET_URL=http://example.com node dist/index.js
```

## 编程方式使用

也可以在 Node.js 项目中作为库使用：

```typescript
import { createProxyServer } from 'web-proxy-cli';

const server = createProxyServer({
  port: 8000,
  target: 'http://example.com',
  logger: true,
  timeout: 30000,
});

// 稍后关闭服务器
server.close();
```

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式运行
pnpm dev

# 构建
pnpm build

# 运行构建后的 CLI
pnpm start
```

## 开源协议

MIT

## 贡献

欢迎贡献！请随时提交 Pull Request。

## 支持

如果遇到任何问题或有疑问，请在 GitHub 仓库提交 issue。
