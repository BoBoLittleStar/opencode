# OpenCode SDK

JavaScript/TypeScript 类型安全客户端，用于与 OpenCode 服务器交互。

## 安装

```bash
npm install @opencode-ai/sdk
```

## 创建客户端

### 创建实例

```typescript
import { createOpencode } from "@opencode-ai/sdk"

const { client } = await createOpencode()
```

选项：

| 选项 | 类型 | 说明 |
|------|------|------|
| `hostname` | string | 服务器主机名 |
| `port` | number | 服务器端口 |
| `signal` | AbortSignal | 中止信号 |
| `timeout` | number | 启动超时（毫秒）|
| `config` | Config | 配置对象 |

### 仅客户端模式

```typescript
import { createOpencodeClient } from "@opencode-ai/sdk"

const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",
})
```

选项：

| 选项 | 类型 | 说明 |
|------|------|------|
| `baseUrl` | string | 服务器 URL |
| `fetch` | function | 自定义 fetch |
| `parseAs` | string | 响应解析方式 |
| `responseStyle` | string | 返回风格 |
| `throwOnError` | boolean | 抛出错误 |

## 类型

直接导入类型：

```typescript
import type { Session, Message, Part } from "@opencode-ai/sdk"
```

## 结构化输出

```typescript
const result = await client.session.prompt({
  path: { id: sessionId },
  body: {
    parts: [{ type: "text", text: "Research Anthropic" }],
    format: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          company: { type: "string" },
          founded: { type: "number" },
        },
        required: ["company"],
      },
    },
  },
})
```

## API 参考

### 全局

```typescript
client.global.health()  // 健康检查
```

### App

```typescript
client.app.log()      // 写入日志
client.app.agents()   // 列出代理
```

### 会话

```typescript
client.session.list()
client.session.get({ path: { id } })
client.session.create({ body: { title } })
client.session.delete({ path: { id } })
client.session.prompt({ path: { id }, body: { parts } })
client.session.abort({ path: { id } })
client.session.share({ path: { id } })
client.session.revert({ path: { id }, body: { messageID } })
```

### 文件

```typescript
client.find.text({ query: { pattern: "function.*opencode" } })
client.find.files({ query: { query: "*.ts" } })
client.file.read({ query: { path: "src/index.ts" } })
```

### TUI

```typescript
client.tui.appendPrompt({ body: { text } })
client.tui.submitPrompt()
client.tui.showToast({ body: { message, variant: "success" } })
```

### Auth

```typescript
client.auth.set({ path: { id: "anthropic" }, body: { type: "api", key } })
```

### 事件

```typescript
const events = await client.event.subscribe()
for await (const event of events.stream) {
  console.log("Event:", event.type)
}
```

## 错误处理

```typescript
try {
  await client.session.get({ path: { id: "invalid-id" } })
} catch (error) {
  console.error("Failed:", (error as Error).message)
}
```
