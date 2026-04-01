# TUI 使用指南

OpenCode 提供交互式终端界面（TUI）用于与 LLM 交互。

## 启动 TUI

```bash
opencode                    # 当前目录
opencode /path/to/project   # 指定目录
```

## 文件引用

使用 `@` 在消息中引用文件，进行模糊搜索：

```
How is auth handled in @packages/functions/src/api/index.ts?
```

## Bash 命令

以 `!` 开头的消息作为 shell 命令执行：

```
!ls -la
```

## 命令列表

| 命令 | 说明 | 快捷键 |
|------|------|---------|
| `/connect` | 添加提供商 | |
| `/compact` | 压缩会话 | `ctrl+x c` |
| `/details` | 切换工具详情显示 | `ctrl+x d` |
| `/editor` | 打开外部编辑器 | `ctrl+x e` |
| `/exit` | 退出 | `ctrl+x q` |
| `/export` | 导出对话 | `ctrl+x x` |
| `/help` | 显示帮助 | `ctrl+x h` |
| `/init` | 创建/更新 AGENTS.md | `ctrl+x i` |
| `/models` | 列出模型 | `ctrl+x m` |
| `/new` | 开始新会话 | `ctrl+x n` |
| `/redo` | 重做 | `ctrl+x r` |
| `/sessions` | 会话列表/切换 | `ctrl+x l` |
| `/share` | 分享会话 | `ctrl+x s` |
| `/themes` | 主题列表 | `ctrl+x t` |
| `/thinking` | 切换思考块显示 | |
| `/undo` | 撤销 | `ctrl+x u` |
| `/unshare` | 取消分享 | |

### 别名

- `/compact` 别名：`/summarize`
- `/exit` 别名：`/quit`、`/q`
- `/new` 别名：`/clear`
- `/sessions` 别名：`/resume`、`/continue`

## 代理切换

使用 `Tab` 键在主代理之间切换（Build/Plan）。

## 编辑器设置

`/editor` 和 `/export` 使用 `EDITOR` 环境变量指定的编辑器。

### Linux/macOS

```bash
export EDITOR=vim
export EDITOR="code --wait"  # VS Code
```

### Windows

```bash
# CMD
set EDITOR=notepad
set EDITOR=code --wait

# PowerShell
$env:EDITOR = "code --wait"
```

## TUI 配置

```json
{
  "tui": {
    "scroll_speed": 3,
    "scroll_acceleration": {
      "enabled": true
    }
  }
}
```

- `scroll_acceleration.enabled` - macOS 风格滚动加速
- `scroll_speed` - 滚动速度倍率（最小值 1）

## 自定义设置

使用命令面板（`ctrl+x h`）自定义 TUI 视图，如切换用户名显示。
