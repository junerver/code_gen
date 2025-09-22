/**
 * @Description 统一的需求对话API接口 - 支持流式多轮对话
 * @Author Qoder AI
 * @Date 2025-09-22
 */

import type { H3Event } from 'h3';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { llmProvider } from '#server/utils/model';
import { RequirementDialogAgent } from '#server/core/agents/requirement-dialog';
import type {
  RequirementDialogRequest,
  RequirementDialogResponse,
  DialogContext,
  RequirementDocument,
  CompletenessScore,
  ClarificationQuestion,
} from '#shared/types/requirement';
import type { AvailableModelNames } from '#shared/types/model';

// 默认模型
const DEFAULT_MODEL: AvailableModelNames = 'DeepSeek-Chat';

export default defineEventHandler(async (event: H3Event) => {
  try {
    const request = await readBody<RequirementDialogRequest>(event);

    // 验证请求参数
    if (!request.messages || request.messages.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: '消息列表不能为空',
      });
    }

    // 构建对话上下文
    const context: DialogContext = {
      domain: request.context?.domain,
      previousRequirements: request.context?.previousRequirements,
      userAnswers: request.context?.userAnswers,
      sessionId: request.conversationId,
      currentPhase: request.context?.currentPhase || 'collecting',
      completeness: request.context?.completeness,
    };

    // 创建对话Agent实例
    const dialogAgent = new RequirementDialogAgent({
      model: (request.model as AvailableModelNames) || DEFAULT_MODEL,
      domain: context.domain,
    });

    // 构建系统提示
    const systemPrompt = buildSystemPrompt(context);

    // 日志记录
    console.log('Requirements dialog request:', {
      messageCount: request.messages.length,
      domain: context.domain,
      phase: context.currentPhase,
      model: request.model || DEFAULT_MODEL,
      conversationId: request.conversationId,
    });

    // 创建流式响应
    return streamText({
      model: llmProvider(
        (request.model as AvailableModelNames) || DEFAULT_MODEL
      ),
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      system: systemPrompt,
      temperature: 0.7,
      tools: {
        // 评估需求完整性工具
        assessCompleteness: tool({
          description: '评估当前需求的完整性并返回评分',
          parameters: z.object({
            requirementText: z.string().describe('当前收集到的需求文本'),
            domain: z.string().optional().describe('业务领域'),
          }),
          execute: async ({ requirementText, domain }) => {
            try {
              const completeness = await dialogAgent.assessCompleteness(
                requirementText,
                domain
              );
              return {
                success: true,
                completeness,
                nextPhase: determineNextPhase(
                  completeness,
                  context.currentPhase
                ),
              };
            } catch (error) {
              return {
                success: false,
                error: error instanceof Error ? error.message : '评估失败',
              };
            }
          },
        }),

        // 生成澄清问题工具
        generateQuestions: tool({
          description: '基于当前需求生成澄清问题',
          parameters: z.object({
            requirementText: z.string().describe('当前需求文本'),
            maxQuestions: z
              .number()
              .optional()
              .default(3)
              .describe('最多生成问题数'),
          }),
          execute: async ({ requirementText, maxQuestions }) => {
            try {
              const questions =
                await dialogAgent.generateClarificationQuestions(
                  requirementText,
                  context
                );
              return {
                success: true,
                questions: questions.slice(0, maxQuestions),
              };
            } catch (error) {
              return {
                success: false,
                error: error instanceof Error ? error.message : '问题生成失败',
              };
            }
          },
        }),

        // 生成需求文档工具
        generateDocument: tool({
          description: '基于完整对话历史生成需求说明文档',
          parameters: z.object({
            finalizeDialog: z.boolean().describe('是否完成对话并生成最终文档'),
          }),
          execute: async ({ finalizeDialog }) => {
            if (!finalizeDialog) {
              return { success: false, message: '对话尚未完成' };
            }

            try {
              const document = await dialogAgent.generateRequirementDocument(
                request.messages
              );
              return {
                success: true,
                document,
                message: '需求文档生成成功',
              };
            } catch (error) {
              return {
                success: false,
                error: error instanceof Error ? error.message : '文档生成失败',
              };
            }
          },
        }),

        // 处理对话轮次工具
        processDialog: tool({
          description: '处理当前对话轮次并确定下一步行动',
          parameters: z.object({
            userMessage: z.string().describe('用户最新消息'),
            updateContext: z
              .boolean()
              .optional()
              .default(true)
              .describe('是否更新上下文'),
          }),
          execute: async ({ userMessage, updateContext }) => {
            try {
              const response = await dialogAgent.processDialogTurn(
                request.messages,
                context
              );

              if (updateContext) {
                // 更新上下文信息
                context.currentPhase = response.dialogState;
                context.completeness = response.completeness;
              }

              return {
                success: true,
                response,
                context: updateContext ? context : undefined,
              };
            } catch (error) {
              return {
                success: false,
                error: error instanceof Error ? error.message : '对话处理失败',
              };
            }
          },
        }),
      },
      onFinish: async result => {
        // 记录对话完成日志
        console.log('Requirements dialog completed:', {
          conversationId: request.conversationId,
          messageCount: request.messages.length,
          finishReason: result.finishReason,
          usage: result.usage,
          totalTokens: result.usage?.totalTokens,
        });
      },
    });
  } catch (error) {
    console.error('Requirements dialog API error:', error);

    throw createError({
      statusCode:
        error instanceof Error && 'statusCode' in error
          ? (error as any).statusCode
          : 500,
      statusMessage:
        error instanceof Error ? error.message : '需求对话处理失败',
    });
  }
});

/**
 * 构建系统提示
 */
function buildSystemPrompt(context: DialogContext): string {
  const phaseInstructions = {
    collecting: '正在收集用户的初始需求，请引导用户提供更多详细信息。',
    clarifying: '正在澄清模糊的需求点，请提出具体的问题帮助用户完善需求。',
    finalizing: '正在确认最终需求，请总结并确认用户的需求是否完整。',
    completed: '需求收集已完成，正在生成需求说明文档。',
  };

  let prompt = `你是一个专业的需求分析师，正在与客户进行需求收集对话。

**当前对话阶段**: ${context.currentPhase}
**阶段说明**: ${phaseInstructions[context.currentPhase]}

**对话目标**:
1. 收集完整、清晰的业务需求
2. 识别和澄清模糊或不完整的信息
3. 确保需求的可实现性和合理性
4. 最终生成结构化的需求说明文档

**对话原则**:
1. 保持专业、友好的语调
2. 提问具体、有针对性
3. 每次聚焦一个主要问题
4. 提供必要的示例和解释
5. 适时总结和确认理解

**工具使用指导**:
- 使用 assessCompleteness 评估需求完整性
- 使用 generateQuestions 生成澄清问题
- 使用 processDialog 处理对话流程
- 使用 generateDocument 生成最终文档

**质量标准**:
- 功能需求：清晰、具体、可测试
- 非功能需求：有明确的指标和标准
- 业务约束：具体、可执行
- 用户场景：完整、现实`;

  if (context.domain) {
    prompt += `\n\n**业务领域**: ${context.domain}
请运用该领域的专业知识指导对话，提出相关的专业问题。`;
  }

  if (context.completeness !== undefined) {
    prompt += `\n\n**当前完整性**: ${Math.round(context.completeness * 100)}%`;
  }

  if (context.userAnswers && Object.keys(context.userAnswers).length > 0) {
    prompt += `\n\n**已获得的关键信息**:
${Object.entries(context.userAnswers)
  .map(([question, answer]) => `- ${question}: ${answer}`)
  .join('\n')}`;
  }

  return prompt;
}

/**
 * 确定下一个对话阶段
 */
function determineNextPhase(
  completeness: CompletenessScore,
  currentPhase: string
): string {
  const overallScore = completeness.overall;

  switch (currentPhase) {
    case 'collecting':
      if (overallScore < 0.3) return 'collecting';
      if (overallScore < 0.7) return 'clarifying';
      return 'finalizing';

    case 'clarifying':
      if (overallScore < 0.7) return 'clarifying';
      return 'finalizing';

    case 'finalizing':
      if (overallScore >= 0.8) return 'completed';
      return 'clarifying';

    case 'completed':
      return 'completed';

    default:
      return 'collecting';
  }
}
