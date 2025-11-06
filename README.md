# req-replace

一个基于 Node.js 的网络代理服务，支持请求体字符串替换和流式响应转发。

## 功能特性

- ✅ 转发所有 HTTP/HTTPS 请求到目标服务器
- ✅ 支持请求体字符串查找替换
- ✅ 支持流式响应（SSE）转发
- ✅ 保持原始请求头和响应头
- ✅ 灵活的配置文件管理
- ✅ 无需安装额外依赖

## 安装

本程序仅使用 Node.js 内置模块，无需安装任何依赖包。

**环境要求：**
- Node.js >= 12.0.0

**克隆或下载项目后即可直接运行**

## 快速开始

```bash
# 进入项目目录
cd req-replace

# 启动服务
node server.js
```

启动成功后会显示：
```
===========================================
Proxy Server Running
Listening on: http://127.0.0.1:3030
Forwarding to: http://127.0.0.1:3000
Replace rules: 1 rule(s) loaded
===========================================
```

## 配置说明

### 1. rr-config.json

服务器基础配置文件：

```json
{
  "port": 3030,
  "base_url": "http://127.0.0.1:3000"
}
```

**配置项说明：**
- `port`: 代理服务监听的端口号（默认：3030）
- `base_url`: 转发目标服务器地址（默认：http://127.0.0.1:3000）

### 2. req-replace.json

请求体字符串替换规则配置：

```json
{
  "old_string_1": "new_string_1",
  "old_string_2": "new_string_2",
  "search_text": "replace_text"
}
```

**工作原理：**
- 每个键值对定义一条替换规则
- 程序会在请求体中查找所有的 `key`，并替换为对应的 `value`
- 支持多条规则，按照定义顺序依次执行
- 替换完成后，将新的请求体转发到目标服务器

**使用场景示例：**
- 替换 API 密钥或令牌
- 修改请求参数值
- 动态替换环境相关的配置

## 使用示例

### 场景 1：基本转发

**配置：**
```json
// rr-config.json
{
  "port": 3030,
  "base_url": "http://127.0.0.1:3000"
}

// req-replace.json
{}
```

客户端请求：`http://127.0.0.1:3030/api/users`  
转发到：`http://127.0.0.1:3000/api/users`

### 场景 2：替换 API 密钥

**配置：**
```json
// req-replace.json
{
  "PLACEHOLDER_KEY": "YOUR_ACTUAL_API_KEY"
}
```

客户端发送请求体：
```json
{
  "apiKey": "PLACEHOLDER_KEY",
  "data": "test"
}
```

转发后的请求体：
```json
{
  "apiKey": "YOUR_ACTUAL_API_KEY",
  "data": "test"
}
```

### 场景 3：多规则替换

**配置：**
```json
// req-replace.json
{
  "dev_server": "prod_server",
  "test_db": "production_db",
  "debug": "info"
}
```

所有匹配的字符串都会被替换后再转发。

## 转发规则

程序会完整保留请求的路径和查询参数：

| 客户端请求 | 转发到 (base_url: http://127.0.0.1:3000) |
|-----------|----------------------------------------|
| `http://127.0.0.1:3030/api/test` | `http://127.0.0.1:3000/api/test` |
| `http://127.0.0.1:3030/users?id=1` | `http://127.0.0.1:3000/users?id=1` |
| `http://127.0.0.1:3030/v1/data` | `http://127.0.0.1:3000/v1/data` |

## 日志

服务器会输出以下日志信息：

```
[2024-01-10T10:30:45.123Z] POST /api/chat
[Replaced] Request body processed with 2 rule(s)
[Response] 200 /api/chat
```

## 注意事项

1. **流式响应支持**：程序使用 `pipe` 方法转发响应，完整支持 SSE (Server-Sent Events) 等流式传输
2. **请求头转发**：所有原始请求头都会被保留并转发（除了 `host` 会被更新为目标服务器）
3. **错误处理**：如果目标服务器不可达，会返回 502 错误
4. **性能**：字符串替换使用 `split().join()` 方法，适合大多数场景

## 故障排查

**问题：启动失败，提示端口被占用**
```
Error: listen EADDRINUSE: address already in use :::3030
```
解决方法：修改 `rr-config.json` 中的 `port` 为其他未使用的端口。

**问题：无法连接到目标服务器**
```
Proxy Error: connect ECONNREFUSED 127.0.0.1:3000
```
解决方法：确认 `rr-config.json` 中的 `base_url` 配置正确，且目标服务器正在运行。

## Cloudflare Workers 部署

本项目现已支持一键部署到 Cloudflare Workers，无需服务器即可运行代理服务。

### 部署前准备

1. **注册 Cloudflare 账号**
   - 访问 [Cloudflare](https://dash.cloudflare.com/sign-up) 注册免费账号
   - Workers 免费套餐每天提供 100,000 次请求

2. **获取 API Token**（首次部署需要）
   - 登录 Cloudflare Dashboard
   - 进入 "My Profile" > "API Tokens"
   - 创建 Token 或使用 Global API Key

### 配置步骤

1. **修改目标服务器地址**

编辑 [`wrangler.toml`](wrangler.toml:8) 文件，将 `BASE_URL` 改为你的目标服务器：

```toml
[vars]
BASE_URL = "https://your-target-server.com"
```

2. **修改替换规则**（可选）

如需修改字符串替换规则，编辑 [`worker.js`](worker.js:6) 文件中的 `REPLACE_RULES` 对象：

```javascript
const REPLACE_RULES = {
  "old_text": "new_text",
  "search": "replace"
};
```

### 一键部署

```bash
# 方式 1：使用 npm 脚本（推荐）
npm run deploy

# 方式 2：直接使用 npx
npx wrangler deploy
```

首次部署时，wrangler 会引导你完成登录认证。

### 本地测试

在部署前，可以先在本地测试 Worker：

```bash
# 启动本地开发服务器
npm run dev:worker

# 或直接使用 npx
npx wrangler dev
```

本地测试服务会运行在 `http://localhost:8787`

### 部署后使用

部署成功后，Cloudflare 会提供一个 Worker URL，格式如下：

```
https://req-replace.your-subdomain.workers.dev
```

将你的客户端请求指向这个 URL 即可使用代理服务。

### 查看日志

```bash
# 实时查看 Worker 日志
npx wrangler tail
```

### 更新部署

修改代码或配置后，重新运行部署命令即可：

```bash
npm run deploy
```

### Workers 版本 vs 本地版本

| 特性 | 本地版本 (Node.js) | Workers 版本 |
|------|-------------------|--------------|
| 运行环境 | 需要 Node.js 服务器 | Cloudflare 边缘网络 |
| 配置方式 | JSON 文件 | wrangler.toml + 代码 |
| 启动命令 | `npm start` | `npm run deploy` |
| 成本 | 服务器成本 | 免费（每天 10 万次请求） |
| 性能 | 取决于服务器 | 全球 CDN 加速 |
| 适用场景 | 本地开发/内网 | 生产环境/公网 |

### 常见问题

**Q: 部署失败，提示认证错误？**

A: 运行 `npx wrangler login` 重新登录 Cloudflare 账号。

**Q: 如何删除已部署的 Worker？**

A: 在 Cloudflare Dashboard 的 Workers 页面中删除，或运行：
```bash
npx wrangler delete
```

**Q: 免费套餐的限制是什么？**

A: 每天 100,000 次请求，每次请求最多 10ms CPU 时间，足够大多数使用场景。

**Q: 如何修改 Worker 名称？**

A: 编辑 [`wrangler.toml`](wrangler.toml:1) 中的 `name` 字段，然后重新部署。

---

## 许可证

MIT License
