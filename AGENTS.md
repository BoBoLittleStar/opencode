# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-06
**Type:** opencode plugin project

## OVERVIEW
opencode AI 助手的插件包，提供 auto-answer、demo、tool-listener 插件。

## STRUCTURE
```
./
├── package.json        # npm 配置
├── opencode.json       # opencode 主配置
├── oh-my-openagent.json # agent 定义
├── docs/               # 中文文档 (16 files)
├── plugins/
│   ├── src/           # 源码入口
│   │   ├── index.ts   # 导出所有插件
│   │   ├── auto-answer/  # 自动问答插件 (核心)
│   │   ├── demo/      # 示例插件
│   │   ├── tool-listener/ # 工具监听
│   │   └── util/      # 工具函数
│   ├── dist/          # 编译输出
│   └── tsconfig.json
└── .sisyphus/         # 计划文档
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 插件开发 | plugins/src/ | TypeScript 源码 |
| 编译构建 | npm run build | 输出到 plugins/dist/ |
| 配置文件 | opencode.json | 插件路径 provider |
| 文档 | docs/ | 中文文档 |

## CONVENTIONS
- 插件源码在 `plugins/src/`
- 编译输出到 `plugins/dist/`
- 插件入口: `plugins/dist/index.js`
- 无 lint 配置，无测试框架

## ANTI-PATTERNS (THIS PROJECT)
- 禁止修改配置文件 (tsconfig.json, package.json 等) 除非用户明确要求

## COMMANDS
```bash
npm run build      # 编译插件
npm run clean      # 清理 dist
npm run rebuild   # 清理+编译
```

## NOTES
- package.json 的 main 指向不存在的 index.js，实际入口在 opencode.json 中配置
- 无测试，无 CI/CD 流程 
