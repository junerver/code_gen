/**
 * @Description Requirements Conversation Agent
 * @Author Claude Code
 * @Date 2025-01-19
 */

import { generateObject } from 'ai';
import { llmProvider } from '#server/utils/model';
import { z } from 'zod';
import crypto from 'crypto';
import {
  type ClarificationQuestion,
  type ConversationAgentOptions,
  ConversationAgentOptionsSchema,
  type ConversationResponse,
  type ConversationSession,
  ConversationSessionSchema,
  ConversationState,
  MessagePriority,
  MessageType,
  QuestionCategory,
  type RequirementDocument,
  RequirementDocumentSchema,
} from './types';

/**
 * 生成UUID
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * 需求对话Agent - 负责多轮对话管理和需求文档生成
 */
export class RequirementsConversationAgent {
  private model: AvailableModelNames;
  private temperature: number;
  private maxQuestions: number;
  private minConfidenceScore: number;
  private enableDomainDetection: boolean;
  private questionGenerationStrategy: 'comprehensive' | 'focused' | 'minimal';
  private autoCompleteThreshold: number;
  private sessions: Map<string, ConversationSession> = new Map();

  constructor(options: ConversationAgentOptions) {
    const validatedOptions = ConversationAgentOptionsSchema.parse(options);

    this.model =
      (validatedOptions.model as AvailableModelNames) || DEFAULT_MODEL;
    this.temperature = validatedOptions.temperature;
    this.maxQuestions = validatedOptions.maxQuestions;
    this.minConfidenceScore = validatedOptions.minConfidenceScore;
    this.enableDomainDetection = validatedOptions.enableDomainDetection;
    this.questionGenerationStrategy =
      validatedOptions.questionGenerationStrategy;
    this.autoCompleteThreshold = validatedOptions.autoCompleteThreshold;
  }

  /**
   * 开始新的对话会话
   */
  async startConversation(userInput: string): Promise<ConversationResponse> {
    try {
      const sessionId = generateUUID();
      const now = new Date();

      // 创建初始会话
      const session: ConversationSession = {
        id: sessionId,
        state: ConversationState.INITIAL,
        messages: [
          {
            id: generateUUID(),
            type: MessageType.USER_INPUT,
            content: userInput,
            timestamp: now,
          },
        ],
        clarificationQuestions: [],
        originalUserInput: userInput,
        currentQuestionIndex: 0,
        maxQuestions: this.maxQuestions,
        createdAt: now,
        updatedAt: now,
      };

      // 验证会话数据
      const validatedSession = ConversationSessionSchema.parse(session);
      this.sessions.set(sessionId, validatedSession);

      // 分析用户输入并生成初始澄清问题
      const analysisResult = await this.analyzeUserInput(userInput);

      if (analysisResult.needsClarification) {
        validatedSession.state = ConversationState.CLARIFYING;
        validatedSession.clarificationQuestions = analysisResult.questions;
        validatedSession.updatedAt = new Date();

        return {
          success: true,
          sessionId,
          state: ConversationState.CLARIFYING,
          message: '我需要了解更多细节来更好地理解您的需求。',
          clarificationQuestion: analysisResult.questions[0],
          progress: {
            currentStep: 1,
            totalSteps: analysisResult.questions.length + 1,
            completionPercentage: Math.round(
              (1 / (analysisResult.questions.length + 1)) * 100
            ),
          },
        };
      } else {
        // 直接生成需求文档
        return await this.generateRequirementDocument(sessionId);
      }
    } catch (error) {
      console.error('启动对话会话时出错:', error);
      return {
        success: false,
        sessionId: '',
        state: ConversationState.ERROR,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 继续对话 - 处理用户回答
   */
  async continueConversation(
    sessionId: string,
    userAnswer: string
  ): Promise<ConversationResponse> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('会话不存在');
      }

      if (session.state !== ConversationState.CLARIFYING) {
        throw new Error('会话状态不正确');
      }

      // 记录用户回答
      const currentQuestion =
        session.clarificationQuestions[session.currentQuestionIndex];
      if (currentQuestion) {
        currentQuestion.answered = true;
        currentQuestion.answer = userAnswer;

        // 添加用户回答消息
        session.messages.push({
          id: generateUUID(),
          type: MessageType.USER_ANSWER,
          content: userAnswer,
          timestamp: new Date(),
          metadata: { questionId: currentQuestion.id },
        });
      }

      session.currentQuestionIndex++;
      session.updatedAt = new Date();

      // 检查是否还有更多问题
      if (
        session.currentQuestionIndex < session.clarificationQuestions.length
      ) {
        const nextQuestion =
          session.clarificationQuestions[session.currentQuestionIndex];

        return {
          success: true,
          sessionId,
          state: ConversationState.CLARIFYING,
          clarificationQuestion: nextQuestion,
          progress: {
            currentStep: session.currentQuestionIndex + 1,
            totalSteps: session.clarificationQuestions.length + 1,
            completionPercentage: Math.round(
              ((session.currentQuestionIndex + 1) /
                (session.clarificationQuestions.length + 1)) *
                100
            ),
          },
        };
      } else {
        // 所有问题都已回答，生成需求文档
        return await this.generateRequirementDocument(sessionId);
      }
    } catch (error) {
      console.error('继续对话时出错:', error);
      return {
        success: false,
        sessionId,
        state: ConversationState.ERROR,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 分析用户输入并生成澄清问题
   */
  private async analyzeUserInput(userInput: string): Promise<{
    needsClarification: boolean;
    questions: ClarificationQuestion[];
    domain?: string;
    confidenceScore: number;
  }> {
    const systemPrompt = `你是一个需求分析专家。分析用户的需求描述，判断是否需要澄清，并生成相关问题。

你的任务：
1. 评估需求的清晰度和完整性
2. 识别可能的业务领域
3. 生成有针对性的澄清问题
4. 给出置信度评分

生成的问题应该：
- 具体且可操作
- 有助于理解核心业务逻辑
- 涵盖功能、技术、业务规则等方面
- 按重要性排序`;

    const userPrompt = `请分析以下用户需求：

**用户需求：**
${userInput}

请返回JSON格式的分析结果，包含：
- needsClarification: 是否需要澄清（boolean）
- confidenceScore: 置信度评分（0-1之间的数字）
- domain: 识别的业务领域（可选）
- questions: 澄清问题数组，每个问题包含：
  - question: 问题内容
  - context: 问题背景
  - priority: 优先级（high/medium/low）
  - category: 分类（functional/technical/business/performance/security/ui_ux）
  - whyImportant: 为什么这个问题重要
  - suggestedAnswers: 建议的答案选项（可选）

最多生成${this.maxQuestions}个问题，按重要性排序。`;

    try {
      const { object } = await generateObject({
        model: llmProvider(this.model),
        temperature: this.temperature,
        system: systemPrompt,
        prompt: userPrompt,
        schema: z.object({
          needsClarification: z.boolean(),
          confidenceScore: z.number().min(0).max(1),
          domain: z.string().optional(),
          questions: z.array(
            z.object({
              question: z.string(),
              context: z.string(),
              priority: z.enum(['high', 'medium', 'low']),
              category: z.enum([
                'functional',
                'technical',
                'business',
                'performance',
                'security',
                'ui_ux',
              ]),
              whyImportant: z.string().optional(),
              suggestedAnswers: z.array(z.string()).optional(),
            })
          ),
        }),
      });

      // 转换为ClarificationQuestion格式
      const questions: ClarificationQuestion[] = object.questions.map(q => ({
        id: generateUUID(),
        question: q.question,
        context: q.context,
        priority: q.priority as MessagePriority,
        category: q.category as QuestionCategory,
        whyImportant: q.whyImportant,
        suggestedAnswers: q.suggestedAnswers,
        answered: false,
      }));

      return {
        needsClarification:
          object.needsClarification &&
          object.confidenceScore < this.minConfidenceScore,
        questions,
        domain: object.domain,
        confidenceScore: object.confidenceScore,
      };
    } catch (error) {
      console.error('分析用户输入时出错:', error);
      // 返回默认结果
      return {
        needsClarification: true,
        questions: [
          {
            id: generateUUID(),
            question: '请详细描述您希望实现的核心功能？',
            context: '为了更好地理解您的需求',
            priority: MessagePriority.HIGH,
            category: QuestionCategory.FUNCTIONAL,
            answered: false,
          },
        ],
        confidenceScore: 0.3,
      };
    }
  }

  /**
   * 生成需求文档
   */
  private async generateRequirementDocument(
    sessionId: string
  ): Promise<ConversationResponse> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('会话不存在');
      }

      session.state = ConversationState.DOCUMENTING;
      session.updatedAt = new Date();

      // 收集所有用户输入和回答
      const userInputs = session.messages
        .filter(
          m =>
            m.type === MessageType.USER_INPUT ||
            m.type === MessageType.USER_ANSWER
        )
        .map(m => m.content)
        .join('\n');

      const answeredQuestions = session.clarificationQuestions
        .filter(q => q.answered)
        .map(q => `问题: ${q.question}\n回答: ${q.answer}`)
        .join('\n\n');

      const systemPrompt = `你是一个专业的需求分析师。基于用户的输入和澄清问答，生成一份完整、清晰、无歧义的需求文档。

需求文档应该包含：
1. 清晰的标题和描述
2. 详细的功能需求列表
3. 非功能需求（性能、安全等）
4. 业务规则和约束
5. 验收标准

文档应该：
- 使用清晰、专业的语言
- 避免技术术语的歧义
- 包含具体、可测试的需求
- 按优先级组织内容`;

      const userPrompt = `基于以下信息生成需求文档：

**原始需求：**
${session.originalUserInput}

**澄清问答：**
${answeredQuestions}

**所有用户输入：**
${userInputs}

请生成JSON格式的需求文档，包含：
- title: 需求标题
- description: 详细描述
- functionalRequirements: 功能需求数组
- nonFunctionalRequirements: 非功能需求数组
- businessRules: 业务规则数组
- constraints: 约束条件数组
- assumptions: 假设条件数组
- acceptanceCriteria: 验收标准数组
- priority: 优先级（high/medium/low）
- estimatedComplexity: 预估复杂度（simple/medium/complex/highly_complex）`;

      const { object } = await generateObject({
        model: llmProvider(this.model),
        temperature: 0.3, // 较低温度确保一致性
        system: systemPrompt,
        prompt: userPrompt,
        schema: z.object({
          title: z.string(),
          description: z.string(),
          functionalRequirements: z.array(z.string()),
          nonFunctionalRequirements: z.array(z.string()).optional(),
          businessRules: z.array(z.string()).optional(),
          constraints: z.array(z.string()).optional(),
          assumptions: z.array(z.string()).optional(),
          acceptanceCriteria: z.array(z.string()).optional(),
          priority: z.enum(['high', 'medium', 'low']),
          estimatedComplexity: z
            .enum(['simple', 'medium', 'complex', 'highly_complex'])
            .optional(),
        }),
      });

      // 创建需求文档
      const now = new Date();
      const requirementDocument: RequirementDocument = {
        id: generateUUID(),
        title: object.title,
        description: object.description,
        functionalRequirements: object.functionalRequirements,
        nonFunctionalRequirements: object.nonFunctionalRequirements || [],
        businessRules: object.businessRules || [],
        constraints: object.constraints || [],
        assumptions: object.assumptions || [],
        acceptanceCriteria: object.acceptanceCriteria || [],
        priority: object.priority as MessagePriority,
        estimatedComplexity: object.estimatedComplexity,
        createdAt: now,
        updatedAt: now,
        version: '1.0',
      };

      // 验证需求文档
      const validatedDocument =
        RequirementDocumentSchema.parse(requirementDocument);

      session.requirementDocument = validatedDocument;
      session.state = ConversationState.COMPLETED;
      session.updatedAt = new Date();

      // 添加需求文档消息
      session.messages.push({
        id: generateUUID(),
        type: MessageType.REQUIREMENT_DOCUMENT,
        content: `需求文档已生成: ${validatedDocument.title}`,
        timestamp: new Date(),
      });

      return {
        success: true,
        sessionId,
        state: ConversationState.COMPLETED,
        message: '需求文档已成功生成！',
        requirementDocument: validatedDocument,
        progress: {
          currentStep: session.clarificationQuestions.length + 1,
          totalSteps: session.clarificationQuestions.length + 1,
          completionPercentage: 100,
        },
      };
    } catch (error) {
      console.error('生成需求文档时出错:', error);
      return {
        success: false,
        sessionId,
        state: ConversationState.ERROR,
        error: error instanceof Error ? error.message : '生成需求文档失败',
      };
    }
  }

  /**
   * 获取会话信息
   */
  getSession(sessionId: string): ConversationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 删除会话
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * 获取所有活跃会话
   */
  getActiveSessions(): ConversationSession[] {
    return Array.from(this.sessions.values()).filter(
      session =>
        session.state !== ConversationState.COMPLETED &&
        session.state !== ConversationState.ERROR
    );
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions(maxAgeHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.updatedAt < cutoffTime) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

// 便捷函数导出
export async function startRequirementsConversation(
  userInput: string,
  options: ConversationAgentOptions
): Promise<ConversationResponse> {
  const agent = new RequirementsConversationAgent(options);
  return agent.startConversation(userInput);
}

export async function continueRequirementsConversation(
  agent: RequirementsConversationAgent,
  sessionId: string,
  userAnswer: string
): Promise<ConversationResponse> {
  return agent.continueConversation(sessionId, userAnswer);
}
