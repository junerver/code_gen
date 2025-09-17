# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Nuxt 4-based AI code generation chat application that integrates multiple LLM providers (SiliconFlow, DeepSeek, Ollama, Alibaba Bailian) with MCP (Model Context Protocol) support for tool calling capabilities.

## Essential Commands

```bash
# Install dependencies (uses pnpm only)
pnpm install

# Development server
pnpm dev -o

# Build for production
pnpm build

# Generate static site
pnpm generate

# Preview production build
pnpm preview
```

## Architecture Overview

### Frontend Architecture (Nuxt 4 App Structure)
- **app/** - Nuxt 4 application directory following the new flat structure
  - **composables/useChat.ts** - Core chat functionality with streaming support, tool calling integration, and message management
  - **stores/conversation.ts** - Pinia store managing conversation state, messages, and session persistence
  - **pages/chat/index.vue** - Main chat interface
  - **components/** - Reusable Vue components (CodePreview, ModelSelect)

### Backend Architecture (Server API)
- **server/api/chat.post.ts** - Main chat endpoint using Vercel AI SDK with streaming, tool calling, and multi-provider support
- **server/utils/model.ts** - Dynamic model provider factory supporting SiliconFlow, DeepSeek, Ollama, and Bailian
- **server/core/tools/** - MCP tools integration and local tools for enhanced AI capabilities
- **server/core/prompt/** - Prompt templates for AI generation

### Shared Code
- **shared/types/model.ts** - Centralized model configurations and provider definitions
- **shared/utils/** - Common utilities for code processing, template handling, and string operations

## Key Technical Patterns

### Model Provider System
The application uses a dynamic model provider architecture where models are configured in `shared/types/model.ts` and instantiated through the factory pattern in `server/utils/model.ts`. Supports middleware for reasoning extraction (e.g., `<think>` tags).

### Streaming Chat Implementation
Frontend uses native fetch API with streaming response handling in `useChat.ts`. Backend uses Vercel AI SDK's `streamText` with tool integration and step limiting (max 5 steps).

### Tool Calling Architecture
Integrates both MCP (Model Context Protocol) tools and local tools. Tools are initialized lazily and merged into the AI SDK's tool system for dynamic function calling during conversations.

### State Management Pattern
Uses Pinia with repository pattern abstraction. The `PiniaConversationRepository` implements `IConversationRepository` interface, allowing for dependency injection and testability.

## Environment Configuration

Required environment variables (copy `.env.example` to `.env`):
- `NUXT_SILICON_FLOW_API_URL` - SiliconFlow API endpoint
- `NUXT_SILICON_FLOW_API_KEY` - SiliconFlow API key
- `NUXT_DEEPSEEK_API_KEY` - DeepSeek API key
- `NUXT_BAILIAN_API_URL` - Alibaba Bailian API endpoint
- `NUXT_BAILIAN_API_KEY` - Alibaba Bailian API key
- `NUXT_MCP_SERVER_DIRECTORY` - Path to MCP server project

## Development Notes

- Uses pnpm as the only package manager (enforced by preinstall script)
- TypeScript with Nuxt's auto-imports enabled
- ESLint integration via @nuxt/eslint
- UnoCSS for styling with Nuxt integration
- Element Plus X as the UI component library
- No built-in testing framework currently configured