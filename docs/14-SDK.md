# SDK

opencode 服务器的类型安全 JS 客户端。

opencode JS/TS SDK 提供了一个类型安全的客户端用于与服务器交互。使用它来构建集成并程序化控制 opencode。

[了解更多关于服务器](./17-服务器.md)的工作方式。有关示例，请查看社区构建的[项目](./16-生态系统.md#projects)。

---

## 安装

从 npm 安装 SDK：

终端窗口

```bash
npm install @opencode-ai/sdk
```

---

## 创建客户端

创建 opencode 实例：

```typescript
import { createOpencode } from "@opencode-ai/sdk"

const { client } = await createOpencode()
```

这启动服务器和客户端

#### 选项

选项 | 类型 | 描述 | 默认值
--- | --- | --- | ---
`hostname` | `string` | 服务器主机名 | `127.0.0.1`
`port` | `number` | 服务器端口 | `4096`
`signal` | `AbortSignal` | 用于取消的中止信号 | `undefined`
`timeout` | `number` | 服务器启动超时（毫秒） | `5000`
`config` | `Config` | 配置对象 | `{}`

---

## 配置

你可以传递配置对象来自定义行为。实例仍然会拾取你的 `opencode.json`，但你可以内联覆盖或添加配置：

```typescript
import { createOpencode } from "@opencode-ai/sdk"

const opencode = await createOpencode({
  hostname: "127.0.0.1",
  port: 4096,
  config: {
    model: "anthropic/claude-3-5-sonnet-20241022",
  },
})

console.log(`Server running at ${opencode.server.url}`)
opencode.server.close()
```

---

## 仅客户端模式

如果你已经有正在运行的 opencode 实例，可以创建一个客户端实例来连接到它：

```typescript
import { createOpencodeClient } from "@opencode-ai/sdk"

const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",
})
```

#### 选项

选项 | 类型 | 描述 | 默认值
--- | --- | --- | ---
`baseUrl` | `string` | 服务器 URL | `http://localhost:4096`
`fetch` | `function` | 自定义 fetch 实现 | `globalThis.fetch`
`parseAs` | `string` | 响应解析方法 | `auto`
`responseStyle` | `string` | 返回样式：`data` 或 `fields` | `fields`
`throwOnError` | `boolean` | 抛出错误而不是返回 | `false`

---

## 类型

SDK 包含所有 API 类型的 TypeScript 定义。直接导入它们：

```typescript
import type { Session, Message, Part } from "@opencode-ai/sdk"
```

所有类型都从服务器的 OpenAPI 规范生成，并在[类型文件](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)中可用。

---

## 错误

SDK 可以抛出你可以捕获和处理的错误：

```typescript
try {
  await client.session.get({ path: { id: "invalid-id" } })
} catch (error) {
  console.error("Failed to get session:", (error as Error).message)
}
```

---

## 结构化输出

你可以通过指定带有 JSON schema 的 `format` 来从模型请求结构化 JSON 输出。模型将使用 `StructuredOutput` 工具返回匹配你 schema 的验证 JSON。

### 基本用法

```typescript
const result = await client.session.prompt({
  path: { id: sessionId },
  body: {
    parts: [{ type: "text", text: "Research Anthropic and provide company info" }],
    format: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          company: { type: "string", description: "Company name" },
          founded: { type: "number", description: "Year founded" },
          products: {
            type: "array",
            items: { type: "string" },
            description: "Main products",
          },
        },
        required: ["company", "founded"],
      },
    },
  },
})

// Access the structured output
console.log(result.data.info.structured_output)
// { company: "Anthropic", founded: 2021, products: ["Claude", "Claude API"] }
```

### 输出格式类型

类型 | 描述
--- | ---
`text` | 默认。标准文本响应（无结构化输出）
`json_schema` | 返回匹配提供的 schema 的验证 JSON

### JSON Schema 格式

使用 `type: 'json_schema'` 时，提供：

字段 | 类型 | 描述
--- | --- | ---
`type` | `'json_schema'` | 必需。指定 JSON schema 模式
`schema` | `object` | 必需。定义输出结构的 JSON Schema 对象
`retryCount` | `number` | 可选。验证重试次数（默认：2）

### 错误处理

如果模型在所有重试后无法生成有效的结构化输出，响应将包含一个 `StructuredOutputError`：

```typescript
if (result.data.info.error?.name === "StructuredOutputError") {
  console.error("Failed to produce structured output:", result.data.info.error.message)
  console.error("Attempts:", result.data.info.error.retries)
}
```

### 最佳实践

1.  在你的 schema 属性中提供清晰的描述，以帮助模型理解需要提取的数据
2.  使用 `required` 指定哪些字段必须存在
3.  保持 schema 专注 — 复杂的嵌套 schema 可能更难让模型正确填充
4.  设置适当的 `retryCount` — 对于复杂 schema 增加，对于简单 schema 减少

---

## API

SDK 通过类型安全的客户端公开所有服务器 API。

---

### Global

方法 | 描述 | 响应
--- | --- | ---
`global.health()` | 检查服务器健康状态和版本 | `{ healthy: true, version: string }`

#### 示例

```typescript
const health = await client.global.health()
console.log(health.data.version)
```

---

### App

方法 | 描述 | 响应
--- | --- | ---
`app.log()` | 写入日志条目 | `boolean`
`app.agents()` | 列出所有可用代理 | [`Agent[]`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

#### 示例

```typescript
// Write a log entry
await client.app.log({
  body: {
    service: "my-app",
    level: "info",
    message: "Operation completed",
  },
})

// List available agents
const agents = await client.app.agents()
```

---

### Project

方法 | 描述 | 响应
--- | --- | ---
`project.list()` | 列出所有项目 | [`Project[]`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)
`project.current()` | 获取当前项目 | [`Project`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

#### 示例

```typescript
// List all projects
const projects = await client.project.list()

// Get current project
const currentProject = await client.project.current()
```

---

### Path

方法 | 描述 | 响应
--- | --- | ---
`path.get()` | 获取当前路径 | [`Path`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

#### 示例

```typescript
// Get current path information
const pathInfo = await client.path.get()
```

---

### Config

方法 | 描述 | 响应
--- | --- | ---
`config.get()` | 获取配置信息 | [`Config`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)
`config.providers()` | 列出提供商和默认模型 | `{ providers: [`[`Provider[]`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)`, default: { [key: string]: string } }`

#### 示例

```typescript
const config = await client.config.get()
const { providers, default: defaults } = await client.config.providers()
```

---

### Sessions

方法 | 描述 | 备注
--- | --- | ---
`session.list()` | 列出会话 | 返回 [`Session[]`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)
`session.get({ path })` | 获取会话 | 返回 [`Session`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)
`session.children({ path })` | 列出子会话 | 返回 [`Session[]`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)
`session.create({ body })` | 创建会话 | 返回 [`Session`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)
`session.delete({ path })` | 删除会话 | 返回 `boolean`
`session.update({ path, body })` | 更新会话属性 | 返回 [`Session`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)
`session.init({ path, body })` | 分析应用并创建 `AGENTS.md` | 返回 `boolean`
`session.abort({ path })` | 中止正在运行的会话 | 返回 `boolean`
`session.share({ path })` | 共享会话 | 返回 [`Session`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)
`session.unshare({ path })` | 取消共享会话 | 返回 [`Session`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)
`session.summarize({ path, body })` | 总结会话 | 返回 `boolean`
`session.messages({ path })` | 列出会话中的消息 | 返回 `{ info: [`[`Message`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)`, parts: [`[`Part[]`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)`] }[]`
`session.message({ path })` | 获取消息详情 | 返回 `{ info: [`[`Message`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)`, parts: [`[`Part[]`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)`] }`
`session.prompt({ path, body })` | 发送提示消息 | `body.noReply: true` 返回 UserMessage（仅上下文）。默认返回 [`AssistantMessage`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts) 带有 AI 响应。支持 `body.outputFormat` 用于[结构化输出](#structured-output)
`session.command({ path, body })` | 向会话发送命令 | 返回 `{ info: [`[`AssistantMessage`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)`, parts: [`[`Part[]`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)`] }`
`session.shell({ path, body })` | 运行 shell 命令 | 返回 [`AssistantMessage`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)
`session.revert({ path, body })` | 撤销消息 | 返回 [`Session`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)
`session.unrevert({ path })` | 恢复已撤销的消息 | 返回 [`Session`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)
`postSessionByIdPermissionsByPermissionId({ path, body })` | 响应权限请求 | 返回 `boolean`

#### 示例

```typescript
// Create and manage sessions
const session = await client.session.create({
  body: { title: "My session" },
})
const sessions = await client.session.list()

// Send a prompt message
const result = await client.session.prompt({
  path: { id: session.id },
  body: {
    model: { providerID: "anthropic", modelID: "claude-3-5-sonnet-20241022" },
    parts: [{ type: "text", text: "Hello!" }],
  },
})

// Inject context without triggering AI response (useful for plugins)
await client.session.prompt({
  path: { id: session.id },
  body: {
    noReply: true,
    parts: [{ type: "text", text: "You are a helpful assistant." }],
  },
})
```

---

### Files

方法 | 描述 | 响应
--- | --- | ---
`find.text({ query })` | 在文件中搜索文本 | 匹配对象数组，包含 `path`、`lines`、`line_number`、`absolute_offset`、`submatches`
`find.files({ query })` | 按名称查找文件和目录 | `string[]`（路径）
`find.symbols({ query })` | 查找工作区符号 | [`Symbol[]`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)
`file.read({ query })` | 读取文件 | `{ type: "raw" | "patch", content: string }`
`file.status({ query? })` | 获取跟踪文件的状态 | [`File[]`](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`find.files` 支持几个可选查询字段：

- `type`：`"file"` 或 `"directory"`
- `directory`：覆盖项目根目录的搜索
- `limit`：最大结果（1–200）

#### 示例

```typescript
// Search and read files
const textResults = await client.find.text({
  query: { pattern: "function.*opencode" },
})
const files = await client.find.files({
  query: { query: "*.ts", type: "file" },
})
const directories = await client.find.files({
  query: { query: "packages", type: "directory", limit: 20 },
})
const content = await client.file.read({
  query: { path: "src/index.ts" },
})
```

---

### TUI

方法 | 描述 | 响应
--- | --- | ---
`tui.appendPrompt({ body })` | 将文本追加到提示 | `boolean`
`tui.openHelp()` | 打开帮助对话框 | `boolean`
`tui.openSessions()` | 打开会话选择器 | `boolean`
`tui.openThemes()` | 打开主题选择器 | `boolean`
`tui.openModels()` | 打开模型选择器 | `boolean`
`tui.submitPrompt()` | 提交当前提示 | `boolean`
`tui.clearPrompt()` | 清除提示 | `boolean`
`tui.executeCommand({ body })` | 执行命令 | `boolean`
`tui.showToast({ body })` | 显示 toast 通知 | `boolean`

#### 示例

```typescript
// Control TUI interface
await client.tui.appendPrompt({
  body: { text: "Add this to prompt" },
})
await client.tui.showToast({
  body: { message: "Task completed", variant: "success" },
})
```

---

### Auth

方法 | 描述 | 响应
--- | --- | ---
`auth.set({ ... })` | 设置认证凭据 | `boolean`

#### 示例

```typescript
await client.auth.set({
  path: { id: "anthropic" },
  body: { type: "api", key: "your-api-key" },
})
```

---

### Events

方法 | 描述 | 响应
--- | --- | ---
`event.subscribe()` | 服务器发送事件流 | 服务器发送事件流

#### 示例

```typescript
// Listen to real-time events
const events = await client.event.subscribe()
for await (const event of events.stream) {
  console.log("Event:", event.type, event.properties)
}
```
