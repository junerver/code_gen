# code_gen

## 环境变量说明

使用项目前，需要复制项目根目录下的 `.env.example` 文件，重命名为 `.env`，该文件内容如下：

```bash
NUXT_SILICON_FLOW_API_URL=https://api.siliconflow.cn/v1
# 硅基流动api密钥
NUXT_SILICON_FLOW_API_KEY=

# DeepSeek api 密钥
NUXT_DEEPSEEK_API_KEY=

# mcp服务项目路径
NUXT_MCP_SERVER_DIRECTORY=
```

### 配置 LLM 模型

#### 使用 ollama 本地模型

项目支持使用 Ollama 本地模型，需要首先在本地安装 Ollama，并安装模型 `qwen2.5:7b`

首先在 [Ollama 官网](https://ollama.com/) 下载安装 Ollama 客户端，安装完成后，参考：[Ollama 在 Windows 下的安装与配置](./docs/ollama_config_for_windows.md)，进行配置。

执行 run 指令下载安装模型：

```bash
ollama run qwen2.5:7b
```

还推荐下面的模型：

- qwen2.5-coder:7b
- qwen3:4b

如果需要使用，记得首先通过 Ollama 安装。



#### 使用 SiliconFlow 模型

[硅基流动](https://cloud.siliconflow.cn/i/HT7A2l71)是一个第三方大模型API中转平台，可以通过它轻松的使用多个模型供应商提供的模型。

如果使用硅基流动模型，需要将硅基流动官网创建的 API 密钥填充到 `NUXT_SILICON_FLOW_API_KEY` 字段。



#### 使用 DeepSeek 官方模型

虽然硅基流动提供了第三方架设的 DeepSeek 相关模型，但是稳定性不如官方模型接口。可以配置 DeepSeek 官方 api 密钥填充到 `NUXT_DEEPSEEK_API_KEY` 字段，在对话中使用官方模型。



### 配置MCP

项目目前依赖于 [mcp_demo_server](http://192.168.187.232:28088/houwenjun/mcp_demo_server)，在使用之前请先克隆 MCP 服务项目到本地，并参考项目的 README 文件完成初始化。

在项目根目录下的 `.env` 文件中，使用上一步克隆好的项目目录地址，配置 `NUXT_MCP_SERVER_DIRECTORY` 字段。

## 技术栈

全栈框架：[NuxtJs](https://nuxt.com/)

LLM SDK：[ai-sdk](https://ai-sdk.dev/)

前端框架：Vue 3

组件库：[element-plus-x](https://element-plus-x.com/)

## 使用项目

安装依赖

```bash
# pnpm
pnpm install
```

启动开发服务器

```bash
# pnpm
pnpm dev -o
```

## 目录结构

```
code_gen/
├── app/                    # Nuxt 4 应用目录
│   ├── app.vue            # 根组件
│   ├── assets/            # 静态资源
│   ├── components/        # 可复用组件
│   ├── composables/       # 组合式函数
│   │   └── useChat.ts    # 聊天功能
│   ├── layouts/           # 布局组件
│   ├── pages/            # 页面组件
│   │   ├── index.vue     # 主页
│   │   └── chat/         # 聊天页面
│   └── utils/            # 工具函数
├── public/               # 公共静态文件
├── server/               # 服务端代码
│   └── api/            # 后台接口目录
├── shared/               # 共享代码
│   └── utils/            # 共享工具函数自动导入
└── types/                # TypeScript类型定义
```
