# OpenCode 远程交互插件

此插件为 OpenCode 提供远程交互能力

### 组件方案如下：

1. 一个 websocket 服务端，端口号 8881
2. 一个 middleware 中间件，端口号 8882，中间件用 8882 端口提供对外接口，允许外部 http 请求调用
3. 两个 opencode 工具 connect_remote 和 disconnect_remote，分别用于连接和断开服务端

### opencode 行为

1. 当 opencode 连接到服务端时，每次 opencode 产生了一条新消息都要同步给服务端
2. 当 opencode 接收到来自服务器的消息时，将消息作为提示词弹给当前会话
3. opencode 通过调用 connect_remote 工具的方式连接到服务器
4. opencode 通过调用 disconnect_remote 工具的方式主动断开服务器，或者自己退出时直接断开服务器
5. connect_remote 工具不可重复调用，首次调用后配置一个新的环境变量 OPENCODE_REMOTE_CONNECT=1，此后检测这个环境变量；disconnect_remote 将其设为 0
6. opencode 会话中断时立即向服务器发送消息 "opencode 会话中断"
7. 监听工具 restart_opencode，当此工具被执行时，立即向服务器发送一条消息 "opencode 正在重启"
8. 通过 restart_opencode 重启 opencode 时应该会携带当前的环境变量到重启后的进程，因此在 api 插件加载时检测第 5 条的环境变量，如果值为 1 则直接连接服务端，不需要由工具调用触发

### 服务端行为

1. opencode 连接到服务端后，服务端主动向中间件发送一条消息 "opencode 已连接"
2. 同一时间只能有一个 opencode 连接到服务端，控制新的连接直接顶掉旧连接
3. 新连接顶掉了旧连接时，服务端主动向中间件发送一条消息 "opencode 已被抢占"
4. 在情况 2 以外，如果 opencode 断开连接，服务端向中间件发送一条消息 "opencode 已断开"
5. 情况 3 的唯一例外场景：如果 opencode 调用工具 restart_opencode 工具重启，则服务端不主动发送额外消息，因为消息已由 opencode 行为第 7 条发送
6. 服务端收到任何来自 opencode 的消息，不做任何处理直接发送给中间件

### 中间件行为

1. 中间件启动后立即作为客户端连接服务端
2. 中间件使用 FIFO 队列缓存来自服务器的消息，消息数量和长度不设上限
3. 中间件提供以下接口：
    * POST /send_message {message: 'message'}：发送消息到已连接的 opencode，如果没有已连接的 opencode 则返回错误
    * POST /consume_message：取出并返回缓存队列的消息，最多取 10 条
    * POST /health：返回当前服务状态，包含中间件是否连接到服务端、服务端是否存在 opencode 连接，注意：接口独立于心跳检测，由中间件主动发送状态检测消息，服务端立即响应
    * POST /command {command: 'command'}：执行特殊命令，支持命令：
        * abort：立即中断当前会话

### 心跳检测行为：

1. 客户端连接到服务端后立即向服务端发送一个心跳
2. 此后每当客户端或服务端接收到心跳，等待 30 秒后回复心跳，即客户端每两次发送心跳间隔为 60 秒
3. 假定所有组件都在本地部署运行，不考虑任何一方的连接出现网络异常
4. 心跳检测的时机和消息收发无关，即消息收发不触发心跳检测的跳过，也不影响其间隔时长
