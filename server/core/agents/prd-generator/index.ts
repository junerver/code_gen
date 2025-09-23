import { generateObject, generateText } from 'ai';
import { llmProvider } from '#server/utils/model';
import { DEFAULT_MODEL } from '#shared/types/model';
import { prdToMarkdown } from './markdown';
import type { GeneratePrdOptions, GeneratePrdResult } from './types';
import { requirementInsightsSchema } from './insights';
import { buildInsightSystemPrompt, buildInsightUserPrompt } from './prompt';
import { buildPrdFromInsights } from './builder';

export class PrdGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrdGenerationError';
  }
}

const extractJsonBlock = (text: string): string | null => {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
};

const LOG_PREFIX = '[PRD-Agent]';

export async function generatePrdDocument(
  options: GeneratePrdOptions
): Promise<GeneratePrdResult> {
  const { requirementText, includeGlossary = true } = options;

  if (!requirementText?.trim()) {
    throw new PrdGenerationError('缺少需求描述，无法生成 PRD。');
  }

  const model = options.model ?? DEFAULT_MODEL;
  const temperature = options.temperature ?? 0.3;

  const systemPrompt = buildInsightSystemPrompt();
  const userPrompt = buildInsightUserPrompt({
    requirementText,
    context: options.context,
  });

  console.info(
    `${LOG_PREFIX} 开始生成洞察，model=${model}, temp=${temperature}, includeGlossary=${includeGlossary}`
  );

  let promptTokens: number | undefined;
  let completionTokens: number | undefined;
  let insights: unknown;

  try {
    console.info(`${LOG_PREFIX} 调用 generateObject 生成洞察`);
    const { object, usage } = await generateObject({
      model: llmProvider(model),
      temperature,
      system: systemPrompt,
      prompt: userPrompt,
      schema: requirementInsightsSchema,
      maxRetries: 2,
    });

    insights = object;
    promptTokens = usage?.inputTokens;
    completionTokens = usage?.outputTokens;
    console.info(
      `${LOG_PREFIX} 洞察生成成功，promptTokens=${promptTokens}, completionTokens=${completionTokens}`
    );
  } catch (error) {
    console.warn(`${LOG_PREFIX} 洞察 schema 生成失败，进入文本回退`, error);

    const { text } = await generateText({
      model: llmProvider(model),
      temperature,
      system: systemPrompt,
      prompt: `${userPrompt}\n\n请仅返回符合说明的 JSON。`,
    });

    const jsonBlock = extractJsonBlock(text);
    if (!jsonBlock) {
      console.error(`${LOG_PREFIX} 文本回退未找到 JSON 片段`, text);
      throw new PrdGenerationError('PRD 生成失败：未能解析结构化洞察。');
    }

    try {
      insights = JSON.parse(jsonBlock);
      console.info(`${LOG_PREFIX} 文本回退解析洞察成功`);
    } catch (parseError) {
      console.error(`${LOG_PREFIX} 文本回退解析失败`, parseError);
      throw new PrdGenerationError(
        `PRD 生成失败：洞察结果不是有效 JSON。详情：${
          parseError instanceof Error ? parseError.message : '未知错误'
        }`
      );
    }
  }

  try {
    console.info(`${LOG_PREFIX} 开始根据洞察构建 PRD`);
    const prd = buildPrdFromInsights(
      insights,
      requirementText,
      includeGlossary
    );
    const markdown = prdToMarkdown(prd);
    console.info(`${LOG_PREFIX} PRD 构建完成，开始返回结果`);

    return {
      prd,
      markdown,
      promptTokens,
      completionTokens,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} PRD 构建失败`, error);
    throw new PrdGenerationError(
      `PRD 生成失败：${
        error instanceof Error ? error.message : '构建文档时发生未知错误'
      }`
    );
  }
}
