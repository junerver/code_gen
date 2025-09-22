/**
 * @Description 需求对话Agent - 专注多轮对话和需求收集
 * @Author Qoder AI
 * @Date 2025-09-22
 */

import { generateText, generateObject } from 'ai';
import { llmProvider } from '#server/utils/model';
import crypto from 'crypto';
import type { AvailableModelNames } from '#shared/types/model';
import type {
  DialogContext,
  DialogState,
  RequirementDocument,
  CompletenessScore,
  ClarificationQuestion,
} from '#shared/types/requirement';
import type { ChatMessage } from '#shared/types/chat';
import {
  RequirementDocumentSchema,
  CompletenessScoreSchema,
  ClarificationQuestionSchema,
} from '#shared/types/requirement';

export interface DialogResponse {
  message: string;
  dialogState: DialogState;
  completeness?: number;
  nextQuestions?: string[];
  requirementDocument?: RequirementDocument;
  suggestions?: string[];
}

export interface DialogAgentOptions {
  model?: AvailableModelNames;
  temperature?: number;
  maxRetries?: number;
  domain?: string;
}

export class RequirementDialogAgent {
  private model: AvailableModelNames;
  private temperature: number;
  private maxRetries: number;
  private domain?: string;

  constructor(options: DialogAgentOptions = {}) {
    this.model = options.model || 'DeepSeek-Chat';
    this.temperature = options.temperature || 0.7; // 对话需要更高的创造性
    this.maxRetries = options.maxRetries || 3;
    this.domain = options.domain;
  }

  /**
   * 处理对话轮次
   */
  async processDialogTurn(
    messages: ChatMessage[],
    context: DialogContext
  ): Promise<DialogResponse> {
    try {
      // 评估当前需求完整性
      const completeness = await this.assessCompleteness(
        this.extractUserRequirements(messages),
        context.domain
      );

      // 确定下一个对话状态
      const nextState = this.determineNextState(
        completeness,
        context.currentPhase
      );

      // 根据状态生成适当的响应
      const response = await this.generateResponse(
        messages,
        context,
        nextState,
        completeness
      );

      return {
        ...response,
        dialogState: nextState,
        completeness: completeness.overall,
      };
    } catch (error) {
      console.error('Dialog processing error:', error);
      throw new Error(
        `对话处理失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 评估需求完整性
   */
  async assessCompleteness(
    requirement: string,
    domain?: string
  ): Promise<CompletenessScore> {
    const systemPrompt = this.buildCompletenessSystemPrompt(domain);
    const userPrompt = `请评估以下需求的完整性:

**需求描述:**
${requirement}

${domain ? `**领域:** ${domain}` : ''}

请从以下维度评估完整性(0-1分)并提供改进建议:
1. 功能需求完整性
2. 非功能需求完整性  
3. 业务约束明确性
4. 用户场景清晰度

输出必须是JSON格式，符合CompletenessScore类型定义。`;

    try {
      const { object } = await generateObject({
        model: llmProvider(this.model),
        temperature: 0.3, // 评估需要更一致的结果
        system: systemPrompt,
        prompt: userPrompt,
        schema: CompletenessScoreSchema,
        maxRetries: this.maxRetries,
      });

      return object;
    } catch (error) {
      console.warn('Completeness assessment failed, using fallback:', error);

      // 降级到基于规则的简单评估
      return this.simpleCompletenessAssessment(requirement);
    }
  }

  /**
   * 生成澄清问题
   */
  async generateClarificationQuestions(
    requirement: string,
    context: DialogContext
  ): Promise<ClarificationQuestion[]> {
    const systemPrompt = `你是一个需求分析专家，专门生成具体、可操作的澄清问题，帮助完善需求描述。

生成问题时要考虑:
1. 问题必须具体、可回答
2. 优先提问关键的、影响设计的问题
3. 避免过于宽泛或抽象的问题
4. 根据领域知识提出专业问题
5. 考虑实施可行性和技术约束`;

    const userPrompt = `基于以下需求和上下文，生成3-5个具体的澄清问题:

**当前需求:**
${requirement}

**对话上下文:**
- 领域: ${context.domain || '未指定'}
- 当前阶段: ${context.currentPhase}
- 完整性: ${Math.round((context.completeness || 0) * 100)}%

**已有回答:**
${
  context.userAnswers
    ? Object.entries(context.userAnswers)
        .map(([q, a]) => `Q: ${q}\nA: ${a}`)
        .join('\n\n')
    : '无'
}

生成的问题应该是JSON数组，每个问题符合ClarificationQuestion类型。
重点关注缺失的关键信息，避免重复已经回答的问题。`;

    try {
      const { text } = await generateText({
        model: llmProvider(this.model),
        temperature: this.temperature,
        system: systemPrompt,
        prompt: userPrompt,
      });

      // 解析JSON响应
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0]);
        return questions.map((q: any) => ({
          id: crypto.randomUUID(),
          ...q,
        }));
      }

      return this.generateFallbackQuestions(requirement, context);
    } catch (error) {
      console.warn('Question generation failed, using fallback:', error);
      return this.generateFallbackQuestions(requirement, context);
    }
  }

  /**
   * 生成需求说明文档
   */
  async generateRequirementDocument(
    dialogHistory: ChatMessage[]
  ): Promise<RequirementDocument> {
    const systemPrompt = `你是一个资深业务分析师，负责将多轮对话中收集的需求信息整理成完整的需求说明文档。

文档生成要求:
1. 提取所有功能需求并分类
2. 识别非功能需求(性能、安全等)
3. 明确业务约束和限制
4. 整理用户场景和用例
5. 建立术语表确保一致性
6. 确保文档结构清晰、内容完整`;

    const userPrompt = this.buildDocumentGenerationPrompt(dialogHistory);

    try {
      const { object } = await generateObject({
        model: llmProvider(this.model),
        temperature: 0.3,
        system: systemPrompt,
        prompt: userPrompt,
        schema: RequirementDocumentSchema,
        maxRetries: this.maxRetries,
      });

      // 设置默认元数据
      const now = new Date();
      return {
        ...object,
        id: crypto.randomUUID(),
        metadata: {
          ...object.metadata,
          createdAt: now,
          updatedAt: now,
          completeness: await this.calculateDocumentCompleteness(object),
        },
      };
    } catch (error) {
      console.error('Document generation failed:', error);
      throw new Error(
        `需求文档生成失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 确定下一个对话状态
   */
  private determineNextState(
    completeness: CompletenessScore,
    currentPhase: DialogState
  ): DialogState {
    const overallScore = completeness.overall;

    // 状态转换逻辑
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

  /**
   * 生成对话响应
   */
  private async generateResponse(
    messages: ChatMessage[],
    context: DialogContext,
    nextState: DialogState,
    completeness: CompletenessScore
  ): Promise<Omit<DialogResponse, 'dialogState' | 'completeness'>> {
    const systemPrompt = this.buildResponseSystemPrompt(
      nextState,
      context.domain
    );
    const userPrompt = this.buildResponseUserPrompt(
      messages,
      context,
      nextState,
      completeness
    );

    const { text } = await generateText({
      model: llmProvider(this.model),
      temperature: this.temperature,
      system: systemPrompt,
      prompt: userPrompt,
    });

    const response: Omit<DialogResponse, 'dialogState' | 'completeness'> = {
      message: text,
    };

    // 根据状态添加额外信息
    if (nextState === 'clarifying') {
      const questions = await this.generateClarificationQuestions(
        this.extractUserRequirements(messages),
        context
      );
      response.nextQuestions = questions.map(q => q.question);
    }

    if (nextState === 'completed') {
      response.requirementDocument =
        await this.generateRequirementDocument(messages);
    }

    // 添加改进建议
    response.suggestions = completeness.recommendations;

    return response;
  }

  /**
   * 提取用户需求文本
   */
  private extractUserRequirements(messages: ChatMessage[]): string {
    return messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n\n');
  }

  /**
   * 构建完整性评估系统提示
   */
  private buildCompletenessSystemPrompt(domain?: string): string {
    let prompt = `你是一个需求分析专家，负责评估需求描述的完整性。

评估维度:
1. **功能需求完整性** (0-1): 核心功能是否明确描述
2. **非功能需求完整性** (0-1): 性能、安全、可用性等是否涉及
3. **业务约束明确性** (0-1): 业务规则、政策限制是否清晰
4. **用户场景清晰度** (0-1): 用户故事、使用场景是否具体

总体评分计算: 各维度加权平均
缺失区域: 列出需要补充的具体方面
改进建议: 提供具体、可操作的建议`;

    if (domain) {
      prompt += `\n\n**领域专业知识**: 应用${domain}领域的最佳实践和标准要求进行评估。`;
    }

    return prompt;
  }

  /**
   * 构建响应系统提示
   */
  private buildResponseSystemPrompt(
    nextState: DialogState,
    domain?: string
  ): string {
    const stateInstructions = {
      collecting: '继续收集需求信息，引导用户提供更多细节。保持对话自然流畅。',
      clarifying:
        '针对模糊或不完整的需求提出具体问题。问题要简明扼要，一次不超过3个。',
      finalizing: '确认需求理解正确，询问是否还有遗漏的重要信息。',
      completed: '总结收集到的需求，告知用户将生成完整的需求文档。',
    };

    let prompt = `你是一个经验丰富的需求分析师，正在与客户进行需求收集对话。

**当前阶段指导**: ${stateInstructions[nextState]}

**对话原则**:
1. 保持专业但友好的语调
2. 使用简明扼要的语言
3. 避免技术术语，除非客户显示出技术背景
4. 每次回应聚焦一个主要方面
5. 提供具体的示例帮助客户理解`;

    if (domain) {
      prompt += `\n\n**领域专业知识**: 运用${domain}领域的专业知识指导对话，提出相关的专业问题。`;
    }

    return prompt;
  }

  /**
   * 构建响应用户提示
   */
  private buildResponseUserPrompt(
    messages: ChatMessage[],
    context: DialogContext,
    nextState: DialogState,
    completeness: CompletenessScore
  ): string {
    const conversationHistory = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    return `**对话历史**:
${conversationHistory}

**上下文信息**:
- 当前阶段: ${context.currentPhase} → ${nextState}
- 领域: ${context.domain || '未指定'}
- 需求完整性: ${Math.round(completeness.overall * 100)}%
- 主要缺失: ${completeness.missingAreas.join(', ')}

**你的任务**: 基于上述信息生成适当的回应，推进需求收集进程。

请直接回复内容，不要包含格式标记。`;
  }

  /**
   * 构建文档生成提示
   */
  private buildDocumentGenerationPrompt(dialogHistory: ChatMessage[]): string {
    const conversationText = dialogHistory
      .map(m => `${m.role}: ${m.content}`)
      .join('\n\n');

    return `基于以下对话历史，生成完整的需求说明文档:

**对话历史**:
${conversationText}

**文档生成要求**:
1. 提取所有明确和隐含的功能需求
2. 识别性能、安全等非功能需求
3. 列出业务约束和限制条件
4. 描述详细的用户使用场景
5. 建立专业术语表
6. 确保信息结构化和完整性

输出必须严格符合RequirementDocument JSON Schema格式。`;
  }

  /**
   * 简单的完整性评估（降级方案）
   */
  private simpleCompletenessAssessment(requirement: string): CompletenessScore {
    const text = requirement.toLowerCase();
    const words = text.split(/\s+/);

    // 基于关键词的简单评估
    const functionalKeywords = ['功能', '特性', '操作', '界面', '流程'];
    const nonFunctionalKeywords = ['性能', '安全', '可用', '响应', '并发'];
    const constraintKeywords = ['限制', '约束', '规则', '政策', '合规'];
    const scenarioKeywords = ['用户', '场景', '流程', '步骤', '操作'];

    const functionalScore = this.calculateKeywordScore(
      text,
      functionalKeywords
    );
    const nonFunctionalScore = this.calculateKeywordScore(
      text,
      nonFunctionalKeywords
    );
    const constraintScore = this.calculateKeywordScore(
      text,
      constraintKeywords
    );
    const scenarioScore = this.calculateKeywordScore(text, scenarioKeywords);

    const overall =
      (functionalScore + nonFunctionalScore + constraintScore + scenarioScore) /
      4;

    return {
      overall,
      functionalRequirements: functionalScore,
      nonFunctionalRequirements: nonFunctionalScore,
      businessConstraints: constraintScore,
      userScenarios: scenarioScore,
      missingAreas: this.identifyMissingAreas(
        functionalScore,
        nonFunctionalScore,
        constraintScore,
        scenarioScore
      ),
      recommendations: ['建议提供更详细的需求描述', '考虑添加具体的使用场景'],
    };
  }

  /**
   * 计算关键词匹配分数
   */
  private calculateKeywordScore(text: string, keywords: string[]): number {
    const matches = keywords.filter(keyword => text.includes(keyword)).length;
    return Math.min((matches / keywords.length) * 2, 1); // 最高1分
  }

  /**
   * 识别缺失区域
   */
  private identifyMissingAreas(
    functional: number,
    nonFunctional: number,
    constraint: number,
    scenario: number
  ): string[] {
    const areas = [];
    if (functional < 0.5) areas.push('功能需求详细描述');
    if (nonFunctional < 0.5) areas.push('非功能需求(性能、安全等)');
    if (constraint < 0.5) areas.push('业务约束和规则');
    if (scenario < 0.5) areas.push('用户使用场景');
    return areas;
  }

  /**
   * 生成降级澄清问题
   */
  private generateFallbackQuestions(
    requirement: string,
    context: DialogContext
  ): ClarificationQuestion[] {
    const questions = [
      {
        id: crypto.randomUUID(),
        question: '请描述用户在使用系统时的典型操作流程？',
        context: '需要了解具体的用户交互场景',
        priority: 'high' as const,
        category: 'functional' as const,
      },
      {
        id: crypto.randomUUID(),
        question: '系统需要处理多少用户同时使用？性能要求如何？',
        context: '需要确定系统的性能和扩展性要求',
        priority: 'medium' as const,
        category: 'performance' as const,
      },
      {
        id: crypto.randomUUID(),
        question: '是否有特殊的安全性要求或合规性要求？',
        context: '需要了解安全和合规约束',
        priority: 'medium' as const,
        category: 'security' as const,
      },
    ];

    return questions.slice(0, 3); // 限制问题数量
  }

  /**
   * 计算文档完整性
   */
  private async calculateDocumentCompleteness(
    document: RequirementDocument
  ): Promise<number> {
    const weights = {
      functionalRequirements: 0.3,
      nonFunctionalRequirements: 0.2,
      businessConstraints: 0.2,
      userScenarios: 0.2,
      glossary: 0.1,
    };

    const scores = {
      functionalRequirements: Math.min(
        document.functionalRequirements.length / 3,
        1
      ),
      nonFunctionalRequirements: Math.min(
        document.nonFunctionalRequirements.length / 2,
        1
      ),
      businessConstraints: Math.min(document.businessConstraints.length / 2, 1),
      userScenarios: Math.min(document.userScenarios.length / 2, 1),
      glossary: Math.min(document.glossary.length / 5, 1),
    };

    return Object.entries(weights).reduce(
      (total, [key, weight]) =>
        total + scores[key as keyof typeof scores] * weight,
      0
    );
  }
}
