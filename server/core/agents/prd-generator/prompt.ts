import type { GeneratePrdOptions } from './types';

type PromptContext = Pick<GeneratePrdOptions, 'context'>;

type InsightPromptOptions = {
  requirementText: string;
  context?: PromptContext['context'];
};

export const buildInsightSystemPrompt = () =>
  `你是一名资深产品经理和业务分析师，需要把用户提供的需求描述归纳成可执行的产品洞察。\n\n任务目标：只输出一个结构化 JSON，不要额外解释，也不要使用 Markdown。字段说明：\n- productTitle：中文名称，体现产品主题\n- elevatorPitch：一句话价值陈述，40~80 字\n- strategicPositioning：数组，概括差异化定位或价值，每项 ≥12 字\n- primaryUsers：数组，字段包含 label、description、topJobsToBeDone、frustrations\n- keyFeatures：数组，字段包含 name、objective、userValue、successSignals、mainSteps\n- operationalConstraints：数组，列出实现限制、依赖或假设\n- successMetrics：数组，描述可衡量的业务指标\n- openQuestions：数组，整理待澄清问题\n- criticalRisks：数组，识别主要风险\n\n所有字段必须使用中文，mainSteps 使用完整句子描述步骤。请直接返回符合规范的 JSON。`;

export const buildInsightUserPrompt = ({
  requirementText,
  context,
}: InsightPromptOptions) => {
  const answered = context?.answeredQuestions?.length
    ? `\n已澄清问题：\n${context.answeredQuestions
        .map(item => `- ${item.question} → ${item.answer}`)
        .join('\n')}`
    : '';

  const constraints = context?.knownConstraints?.length
    ? `\n已知约束：\n${context.knownConstraints
        .map(item => `- ${item}`)
        .join('\n')}`
    : '';

  return `请阅读以下需求描述，输出满足字段说明的 JSON：\n\n需求描述：\n${requirementText.trim()}\n${answered}${constraints}\n\n生成要求：\n- keyFeatures 至少 3 条，每条提供 5 个 mainSteps，描述连贯\n- primaryUsers 至少 2 类，并列出核心需求与痛点\n- successMetrics、openQuestions、criticalRisks 均不少于 3 条\n- operationalConstraints 至少 2 条，帮助后续评审评估\n- 所有文本保持专业、具体、可执行，避免空洞表述`;
};
