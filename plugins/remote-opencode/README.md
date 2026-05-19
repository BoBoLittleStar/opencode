# OpenCode 远程交互插件

## 功能概述

此插件为 OpenCode 提供远程交互能力，通过 WebSocket 和 HTTP 接口实现消息同步和会话管理。

## 组件架构

### 1. WebSocket 服务端（端口 8881）
- 接受 OpenCode 客户端连接
- 同时只能有一个 OpenCode 连接
- 新连接会顶掉旧连接
- 实现心跳检测（60秒间隔）

### 2. HTTP 中间件（端口 8882）
- 作为 WebSocket 服务端的客户端连接
- 提供 HTTP 接口供外部调用
- 使用 FIFO 队列缓存消息
- 提供 4 个接口：

#### POST /send_message
发送消息到已连接的 OpenCode
```bash
curl -X POST http://localhost:8882/send_message \
  -H "Content-Type: application/json" \
  -d '{"message": "your message here"}'
```

#### POST /consume_message
消费缓存队列的消息（最多 10 条）
```bash
curl -X POST http://localhost:8882/consume_message
```

#### POST /health
健康检查，返回连接状态
```bash
curl -X POST http://localhost:8882/health
```

响应示例：
```json
{
  "middlewareConnected": true,
  "opencodeConnected": true
}
```

#### POST /command
执行特殊命令
```bash
curl -X POST http://localhost:8882/command \
  -H "Content-Type: application/json" \
  -d '{"command": "abort"}'
```

支持的命令：
- `abort`: 中断当前会话

## 工具

### connect_remote
连接到远程 opencode 服务端

用法：
```
connect_remote
```

### disconnect_remote
断开与远程 opencode 服务端的连接

用法：
```
disconnect_remote
```

## 行为说明

### OpenCode 行为
1. 连接到服务端后，每次产生新消息都会同步给服务端
2. 接收到服务端消息时，将消息作为提示词弹给当前会话
3. 通过调用 connect_remote 工具连接到服务器
4. 通过调用 disconnect_remote 工具主动断开连接
5. 连接状态通过环境变量 `OPENCODE_REMOTE_CONNECT` 持久化（值为 1 表示已连接）
6. 会话中断时立即向服务器发送 "opencode 会话中断"
7. 监听 restart_opencode 工具，执行时发送 "opencode 正在重启"
8. 重启后检测环境变量，如果值为 1 则自动重新连接

### 服务端行为
1. OpenCode 连接后，向中间件发送 "opencode 已连接"
2. 新连接顶掉旧连接时，发送 "opencode 已被抢占"
3. 非抢占场景下断开连接，发送 "opencode 已断开"
4. restart_opencode 重启时不发送额外消息（由 OpenCode 行为处理）
5. 收到任何来自 OpenCode 的消息，直接转发给中间件

### 心跳检测
- 客户端连接后立即发送心跳
- 每次收到心跳后等待 30 秒回复
- 客户端每两次发送心跳间隔为 60 秒
- 心跳检测独立于消息收发

## 使用注意事项

### 部署假设
- 所有组件均在本地部署运行
- 只有一个固定用户在使用该插件
- 用户应避免可能导致问题的操作

### 环境变量
- `OPENCODE_REMOTE_CONNECT`: 连接状态标识（0=未连接，1=已连接）

### 端口占用
- WebSocket 服务端：8881
- HTTP 中间件：8882

确保这两个端口未被其他程序占用。

## 安装和使用

1. 插件已自动注册在 opencode 中
2. 重启 opencode 后插件自动加载
3. 使用 `connect_remote` 工具建立连接
4. 使用 HTTP 接口与 opencode 交互
5. 使用 `disconnect_remote` 工具断开连接

## 日志

插件使用结构化日志，包含时间戳和日志级别：
```
[2024-05-20T00:30:00.000Z] [remote-opencode] [INFO] WebSocket server started on port 8881
```

## 故障排查

### 连接失败
- 检查端口 8881 和 8882 是否被占用
- 检查防火墙设置
- 查看日志输出

### 消息未同步
- 确认已使用 `connect_remote` 建立连接
- 检查环境变量 `OPENCODE_REMOTE_CONNECT` 是否为 1
- 使用 `/health` 接口检查连接状态

### 心跳超时
- 检查网络连接稳定性
- 确认服务端正常运行
- 查看日志中的心跳信息