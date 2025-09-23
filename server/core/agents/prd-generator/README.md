# PRD Generator Agent

该 Agent 旨在把自然语言的业务/产品需求描述解析为结构化的产品需求文档（PRD）。新版架构分为“洞察提炼 + 文档构建”两阶段，可在保持内容贴合需求的同时保证输出始终符合 schema 约束。

## 功能特性
- 先通过轻量 JSON schema 收敛 LLM 洞察，再由 deterministic builder 生成完整 PRD 结构。
- 使用严格的 Zod schema 校验输出，自动补全缺失字段并保证章节完整。
- 支持引入“已澄清问题”“已知约束”等上下文信息，便于与需求澄清流程衔接。
- 自动输出标准格式的 PRD Markdown，包括目录、数据字典、验收标准等关键章节。
- 对缺失信息使用【待确认】标注，并保留假设说明。

## 核心入口
```ts
import { generatePrdDocument } from '#server/core/agents/prd-generator';

const { prd, markdown } = await generatePrdDocument({
  requirementText: '...',
  context: {
    knownConstraints: ['需符合本地隐私保护法规'],
    answeredQuestions: [{ question: '目标用户是谁？', answer: '中小商户' }],
  },
});
```

## 输出结构
- `prd`：结构化 JSON，字段定义见 `schema.ts`。
- `markdown`：格式化的 PRD 文档，可直接用于评审。

## 扩展点
- 可在调用方结合 requirements-clarification Agent 的结果补充 `context`。
- 如需多轮补写，可将 `prd` 存储再增量更新后重新渲染 Markdown。
