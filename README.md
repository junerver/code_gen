# code_gen

## 安装 ollama

项目目前使用 Ollama 本地模型，需要首先在本地安装 Ollama，并安装模型 `qwen2.5:7b`

首先在 [Ollama 官网](https://ollama.com/) 下载安装 Ollama 客户端，安装完成后，参考：[Ollama 在 Windows 下的安装与配置](./docs/ollama_config_for_windows.md)，进行配置。

执行 run 指令下载安装模型：

```bash
ollama run qwen2.5:7b
```

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
