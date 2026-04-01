# LSP 服务器

OpenCode 与语言服务器协议（LSP）集成，提供代码智能功能。

## 内置 LSP 服务器

| LSP 服务器 | 扩展名 | 要求 |
|------------|--------|------|
| astro | .astro | 为 Astro 项目自动安装 |
| bash | .sh, .bash, .zsh... | 自动安装 bash-language-server |
| clangd | .c, .cpp, .h, .hpp... | 为 C/C++ 项目自动安装 |
| clojure-lsp | .clj, .cljs... | `clojure-lsp` 命令 |
| dart | .dart | `dart` 命令 |
| deno | .ts, .tsx, .js... | `deno` 命令 |
| elixir-ls | .ex, .exs | `elixir` 命令 |
| eslint | .ts, .tsx, .js... | `eslint` 依赖 |
| gopls | .go | `go` 命令 |
| jdtls | .java | Java SDK 21+ |
| kotlin-ls | .kt, .kts | 为 Kotlin 项目自动安装 |
| lua-ls | .lua | 为 Lua 项目自动安装 |
| nixd | .nix | `nixd` 命令 |
| oxlint | .ts, .tsx, .js... | `oxlint` 依赖 |
| php intelephense | .php | 为 PHP 项目自动安装 |
| pyright | .py, .pyi | `pyright` 依赖 |
| rust | .rs | `rust-analyzer` 命令 |
| terraform | .tf, .tfvars | 自动安装 |
| typescript | .ts, .tsx, .js... | `typescript` 依赖 |
| yaml-ls | .yaml, .yml | 自动安装 |
| zls | .zig, .zon | `zig` 命令 |

## 工作原理

1. 匹配文件扩展名
2. 如 LSP 未运行则自动启动

## 配置

```json
{
  "lsp": {
    "typescript": {
      "initialization": {
        "preferences": {
          "importModuleSpecifierPreference": "relative"
        }
      }
    }
  }
}
```

## 环境变量

```json
{
  "lsp": {
    "rust": {
      "env": {
        "RUST_LOG": "debug"
      }
    }
  }
}
```

## 禁用 LSP 服务器

### 全局禁用

```json
{
  "lsp": false
}
```

### 禁用特定

```json
{
  "lsp": {
    "typescript": {
      "disabled": true
    }
  }
}
```

## 自定义 LSP 服务器

```json
{
  "lsp": {
    "custom-lsp": {
      "command": ["custom-lsp-server", "--stdio"],
      "extensions": [".custom"]
    }
  }
}
```

## PHP Intelephense

添加许可证到：
- macOS/Linux：`~/intelephense/license.txt`
- Windows：`%USERPROFILE%/intelephense/license.txt`

## 禁用自动下载

```bash
export OPENCODE_DISABLE_LSP_DOWNLOAD=true
```
