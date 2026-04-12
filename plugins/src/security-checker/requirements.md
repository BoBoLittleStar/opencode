# OpenCode Security Checker 插件需求文档

本文档描述 Security Checker 插件的业务流程需求，设计/开发过程中有任何问题，请先阅读本文档

## 插件需求如下：

监听所有工具的使用，在使用前验证是否允许执行，具体验证规则如下

### 1. 命令行工具

1. 当 opencode 试图强制结束进程时
    * 如果结束进程的方式不是 powershell 命令，立即拦截并返回提示【安全拦截：只允许使用 powershell 命令结束进程】
    * 如果进程名是 opencode 或 node，立即拦截并返回提示【安全拦截：禁止通过名称结束 opencode 或 node 进程，请使用进程 ID 操作】
    * 如果进程 ID 对应的进程是 opencode，则查询当前 opencode 进程的 ID，如果 ID 一致，立即拦截并返回提示【安全拦截：禁止结束正在运行的
      opencode 进程】
    * 如果进程 ID 对应的进程是 node，则查询当前 opencode 进程的子进程，如果包含要结束的进程 ID，立即拦截并返回提示【安全拦截：禁止结束当前
      opencode 进程的子进程】
    * 不符合上述条件则允许执行
2. 当 opencode 试图在 ~/.config/opencode 下进行文件读写时
    * 任何情况下都提示【配置拦截：请在 env:OPENCODE_CONFIG_DIR 下进行 opencode 的配置工作】