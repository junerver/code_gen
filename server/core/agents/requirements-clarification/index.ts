/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @Description Requirements Clarification Agent
 * @Author Claude Code
 * @Date 2025-09-22
 *
 * @overview
 * 需求澄清Agent负责通过多轮自然语言对话帮助用户明确和细化业务需求。
 * 它会主动识别需求中的不清晰、不完整或不一致之处，并提出澄清问题，
 * 直到需求足够清晰，能够生成高质量的结构化需求文档。
 *
 * @workflow
 * 1. **需求分析**：分析用户输入，识别需求的不完整性和模糊性
 * 2. **主动澄清**：针对不清晰的地方主动提出问题
 * 3. **反馈循环**：持续对话直到需求确认完整
 * 4. **触发建模**：当用户确认需求后，调用需求建模Agent
 *
 * @key_features
 * - 智能需求缺口识别
 * - 主动澄清提问
 * - 多轮对话上下文维护
 * - 需求确认自动触发
 * - 与需求建模Agent无缝集成
 */

import { generateText } from 'ai';
import { llmProvider } from '#server/utils/model';
import { RequirementsModelingAgent } from '../requirements-modeling';
import type { AvailableModelNames } from '#shared/types/model';
import { DEFAULT_MODEL } from '#shared/types/model';
import crypto from 'crypto';

export interface RequirementsClarificationAgentOptions {
  model?: AvailableModelNames;
  temperature?: number;
  conversationId?: string;
}

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  type?: 'clarification' | 'confirmation' | 'parsing' | 'document';
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  category:
    | 'functional'
    | 'technical'
    | 'business'
    | 'ui'
    | 'performance'
    | 'security';
  priority: 'high' | 'medium' | 'low';
  askedAt: number;
  answeredAt?: number;
  answer?: string;
  status: 'pending' | 'answered' | 'skipped';
}

export interface RequirementTopic {
  id: string;
  name: string;
  description: string;
  completeness: number; // 0-1
  questions: ClarificationQuestion[];
  lastUpdated: number;
}

export interface ConversationContext {
  conversationId: string;
  turns: ConversationTurn[];
  currentUnderstanding?: string;
  requirementDocument?: any;
  status: 'new' | 'clarifying' | 'confirmed' | 'parsing' | 'completed';
  confidence: number;
  // 结构化的问题跟踪
  topics: RequirementTopic[];
  askedQuestions: ClarificationQuestion[];
  // 上下文感知
  lastAnalysisAt?: number;
  contextSummary?: string;
  // 已确认的事实和细节
  confirmedFacts?: string[];
  confirmedDetails?: Record<string, any>;
}

/**
 * 需求澄清Agent核心类
 */
export class RequirementsClarificationAgent {
  private model: AvailableModelNames;
  private temperature: number;
  private conversations: Map<string, ConversationContext> = new Map();

  constructor(options: RequirementsClarificationAgentOptions = {}) {
    this.model = options.model || DEFAULT_MODEL;
    this.temperature = options.temperature || 0.3;

    if (options.conversationId) {
      this.initializeConversation(options.conversationId);
    }
  }

  private initializeConversation(conversationId: string): ConversationContext {
    const context: ConversationContext = {
      conversationId,
      turns: [],
      status: 'new',
      confidence: 0,
      topics: [],
      askedQuestions: [],
      confirmedFacts: [],
      confirmedDetails: {},
    };
    this.conversations.set(conversationId, context);
    return context;
  }

  /**
   * 分析历史对话上下文，提取已回答的问题和话题
   */
  private async analyzeHistoricalContext(
    context: ConversationContext
  ): Promise<void> {
    if (context.turns.length === 0) return;

    const conversationHistory = context.turns
      .map(turn => `${turn.role.toUpperCase()}: ${turn.content}`)
      .join('\n\n');

    const systemPrompt = `你是对话分析专家。仔细分析对话历史，准确提取已经讨论过的话题和已回答的问题。

重要任务：
1. 仔细阅读每一轮对话，理解用户的具体回答
2. 准确识别用户已经明确说明的信息点
3. 提取已经澄清的需求细节，包括具体数值、时间、规则等
4. 总结当前的需求理解状态，避免遗漏任何已确认的信息
5. 标记哪些方面已经得到充分讨论和确认

请以JSON格式返回分析结果：
{
  "answeredTopics": [
    {
      "name": "话题名称",
      "description": "话题描述，包含具体细节",
      "completeness": 0.8,
      "keyPoints": ["具体要点1", "具体要点2"],
      "confirmedDetails": {"具体参数": "具体值"}
    }
  ],
  "answeredQuestions": [
    {
      "category": "functional|technical|business|ui|performance|security",
      "question": "问题内容",
      "answer": "用户的具体回答",
      "confidence": 0.9,
      "specificDetails": {"具体参数": "具体值"}
    }
  ],
  "contextSummary": "详细的需求理解总结，包含所有已确认的具体信息",
  "confirmedFacts": ["已确认的事实1", "已确认的事实2"]
}`;

    try {
      console.log('=== ANALYZE HISTORICAL CONTEXT ===');
      console.log('SYSTEM PROMPT:');
      console.log(systemPrompt);
      console.log('USER PROMPT:');
      console.log(`分析以下对话历史：\n\n${conversationHistory}`);
      console.log('=== END ANALYZE HISTORICAL CONTEXT ===');

      const { text } = await generateText({
        model: llmProvider(this.model),
        temperature: 0.2,
        system: systemPrompt,
        prompt: `分析以下对话历史：\n\n${conversationHistory}`,
      });

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        console.log('=== HISTORICAL CONTEXT ANALYSIS RESULT ===');
        console.log('Parsed analysis:', JSON.stringify(analysis, null, 2));
        console.log('=== END HISTORICAL CONTEXT ANALYSIS RESULT ===');

        // 更新上下文
        context.contextSummary = analysis.contextSummary;
        context.lastAnalysisAt = Date.now();

        // 创建话题记录
        if (analysis.answeredTopics) {
          context.topics = analysis.answeredTopics.map((topic: any) => ({
            id: crypto.randomUUID(),
            name: topic.name,
            description: topic.description,
            completeness: topic.completeness || 0.5,
            questions: [],
            lastUpdated: Date.now(),
            confirmedDetails: topic.confirmedDetails || {},
          }));
        }

        // 创建已回答问题记录
        if (analysis.answeredQuestions) {
          context.askedQuestions = analysis.answeredQuestions.map((q: any) => ({
            id: crypto.randomUUID(),
            question: q.question,
            category: q.category,
            priority: 'medium',
            askedAt: Date.now() - 60000, // 假设1分钟前问的
            answeredAt: Date.now(),
            answer: q.answer,
            status: 'answered' as const,
            specificDetails: q.specificDetails || {},
          }));
        }

        // 保存已确认的事实
        if (analysis.confirmedFacts) {
          context.confirmedFacts = analysis.confirmedFacts;
        }
      }
    } catch (error) {
      console.error('Error analyzing historical context:', error);
    }
  }

  private generateConversationId(): string {
    return crypto.randomUUID();
  }

  /**
   * 检查问题是否已经被问过或回答过
   */
  private isQuestionAlreadyHandled(
    context: ConversationContext,
    newQuestion: string
  ): boolean {
    // 首先检查已确认的事实中是否已经包含答案
    if (this.isAnsweredInConfirmedFacts(context, newQuestion)) {
      return true;
    }

    // 检查是否已经问过类似的问题
    for (const askedQ of context.askedQuestions) {
      if (this.areQuestionsSimilar(askedQ.question, newQuestion)) {
        return askedQ.status === 'answered';
      }
    }

    // 检查话题中是否已经涵盖
    for (const topic of context.topics) {
      if (this.isQuestionCoveredByTopic(topic, newQuestion)) {
        return topic.completeness > 0.8;
      }
    }

    return false;
  }

  /**
   * 检查问题是否已在已确认事实中回答
   * 使用更精确的语义匹配和上下文理解
   */
  private isAnsweredInConfirmedFacts(
    context: ConversationContext,
    question: string
  ): boolean {
    if (!context.confirmedFacts || context.confirmedFacts.length === 0) {
      return false;
    }

    const questionLower = question.toLowerCase().trim();

    console.log('=== CHECKING ANSWERED FACTS ===');
    console.log('Question:', question);
    console.log('Confirmed facts:', context.confirmedFacts);
    console.log('Confirmed details:', context.confirmedDetails);

    // 1. 检查具体确认的细节 - 使用更精确的匹配
    if (
      context.confirmedDetails &&
      Object.keys(context.confirmedDetails).length > 0
    ) {
      for (const [key, value] of Object.entries(context.confirmedDetails)) {
        if (
          this.isQuestionAboutSpecificDetail(
            questionLower,
            key.toLowerCase(),
            value
          )
        ) {
          console.log(
            `Found precise match in confirmed details: ${key} -> ${value}`
          );
          return true;
        }
      }
    }

    // 2. 使用语义匹配检查已确认事实
    for (const fact of context.confirmedFacts) {
      if (this.isQuestionAnsweredByFact(questionLower, fact.toLowerCase())) {
        console.log(`Found semantic match: ${question} -> ${fact}`);
        return true;
      }
    }

    console.log('No match found in confirmed facts');
    console.log('=== END CHECKING ANSWERED FACTS ===');
    return false;
  }

  /**
   * 检查问题是否询问特定的已确认细节
   */
  private isQuestionAboutSpecificDetail(
    question: string,
    detailKey: string,
    detailValue: any
  ): boolean {
    // 提取问题的核心概念
    const questionConcepts = this.extractQuestionConcepts(question);
    const detailConcepts = this.extractQuestionConcepts(detailKey);

    // 检查概念重叠度
    const conceptOverlap = questionConcepts.filter(concept =>
      detailConcepts.some(
        detailConcept =>
          concept.includes(detailConcept) || detailConcept.includes(concept)
      )
    );

    // 如果有足够的概念重叠，且问题类型匹配，认为已回答
    return (
      conceptOverlap.length >=
      Math.min(questionConcepts.length, detailConcepts.length) * 0.6
    );
  }

  /**
   * 检查问题是否被某个事实回答
   */
  private isQuestionAnsweredByFact(question: string, fact: string): boolean {
    // 提取问题和事实的核心概念
    const questionConcepts = this.extractQuestionConcepts(question);
    const factConcepts = this.extractQuestionConcepts(fact);

    // 检查问题类型
    const questionType = this.identifyQuestionType(question);
    const factType = this.identifyFactType(fact);

    // 如果问题类型和事实类型匹配，且有足够的概念重叠
    if (
      questionType === factType ||
      this.areTypesCompatible(questionType, factType)
    ) {
      const conceptOverlap = questionConcepts.filter(concept =>
        factConcepts.some(factConcept =>
          this.areConceptsRelated(concept, factConcept)
        )
      );

      // 需要至少50%的概念重叠才认为已回答
      return conceptOverlap.length >= Math.min(questionConcepts.length, 2);
    }

    return false;
  }

  /**
   * 提取文本的核心概念
   */
  private extractQuestionConcepts(text: string): string[] {
    // 移除常见的疑问词和助词
    const stopWords = [
      '什么',
      '如何',
      '怎么',
      '为什么',
      '哪个',
      '多少',
      '多久',
      '是否',
      '能否',
      '可以',
      '需要',
      '应该',
      '会',
      '的',
      '了',
      '吗',
      '呢',
      '？',
      '?',
    ];

    const words = text
      .replace(/[？?！!。.，,；;：:]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopWords.includes(word));

    // 提取关键概念组合
    const concepts: string[] = [];

    // 单个关键词
    concepts.push(...words);

    // 相邻词组合（2-3个词）
    for (let i = 0; i < words.length - 1; i++) {
      concepts.push(words[i] + words[i + 1]);
      if (i < words.length - 2) {
        concepts.push(words[i] + words[i + 1] + words[i + 2]);
      }
    }

    return [...new Set(concepts)]; // 去重
  }

  /**
   * 识别问题类型
   */
  private identifyQuestionType(question: string): string {
    if (/时间|时长|多久|分钟|小时|天/.test(question)) return 'time';
    if (/次数|多少次|几次/.test(question)) return 'count';
    if (/密码|验证码|口令/.test(question)) return 'credential';
    if (/锁定|冻结|禁用/.test(question)) return 'lock';
    if (/失败|错误|异常/.test(question)) return 'error';
    if (/流程|步骤|过程/.test(question)) return 'process';
    if (/规则|逻辑|条件/.test(question)) return 'rule';
    if (/界面|页面|显示/.test(question)) return 'ui';
    return 'general';
  }

  /**
   * 识别事实类型
   */
  private identifyFactType(fact: string): string {
    if (/\d+\s*(分钟|小时|天)|时间|时长/.test(fact)) return 'time';
    if (/\d+\s*次|次数/.test(fact)) return 'count';
    if (/密码|验证码|口令/.test(fact)) return 'credential';
    if (/锁定|冻结|禁用/.test(fact)) return 'lock';
    if (/失败|错误|异常/.test(fact)) return 'error';
    if (/流程|步骤|过程/.test(fact)) return 'process';
    if (/规则|逻辑|条件/.test(fact)) return 'rule';
    if (/界面|页面|显示/.test(fact)) return 'ui';
    return 'general';
  }

  /**
   * 检查两个类型是否兼容
   */
  private areTypesCompatible(questionType: string, factType: string): boolean {
    const compatibleTypes: Record<string, string[]> = {
      time: ['lock', 'process'],
      count: ['error', 'lock'],
      lock: ['time', 'count', 'error'],
      error: ['count', 'lock', 'process'],
      process: ['time', 'rule'],
      rule: ['process', 'lock'],
      general: [
        'time',
        'count',
        'credential',
        'lock',
        'error',
        'process',
        'rule',
        'ui',
      ],
    };

    return (
      compatibleTypes[questionType]?.includes(factType) ||
      compatibleTypes[factType]?.includes(questionType) ||
      questionType === factType
    );
  }

  /**
   * 检查两个概念是否相关
   */
  private areConceptsRelated(concept1: string, concept2: string): boolean {
    // 直接匹配
    if (concept1 === concept2) return true;

    // 包含关系
    if (concept1.includes(concept2) || concept2.includes(concept1)) return true;

    // 同义词和相关词匹配
    const synonyms: Record<string, string[]> = {
      锁定: ['冻结', '禁用', '封锁'],
      时间: ['时长', '时间段', '持续时间'],
      次数: ['数量', '频次'],
      失败: ['错误', '异常', '失效'],
      验证码: ['验证', '码', '口令'],
      密码: ['口令', '密钥', '凭证'],
    };

    for (const [key, values] of Object.entries(synonyms)) {
      if (
        (concept1.includes(key) && values.some(v => concept2.includes(v))) ||
        (concept2.includes(key) && values.some(v => concept1.includes(v)))
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查问题是否已被话题涵盖
   * 使用更智能的语义匹配和上下文理解
   */
  private isQuestionCoveredByTopic(
    topic: RequirementTopic,
    question: string
  ): boolean {
    const questionLower = question.toLowerCase().trim();
    const topicNameLower = topic.name.toLowerCase();
    const topicDescLower = topic.description.toLowerCase();

    // 1. 检查问题类型是否与话题相关
    const questionType = this.identifyQuestionType(questionLower);
    const topicType = this.identifyTopicType(topic);

    if (!this.areTypesCompatible(questionType, topicType)) {
      return false;
    }

    // 2. 提取核心概念并进行语义匹配
    const questionConcepts = this.extractQuestionConcepts(questionLower);
    const topicConcepts = this.extractTopicConcepts(topic);

    // 3. 计算概念重叠度
    const conceptOverlap = questionConcepts.filter(qConcept =>
      topicConcepts.some(tConcept =>
        this.areConceptsRelated(qConcept, tConcept)
      )
    );

    // 4. 检查话题完整度和概念匹配度
    const conceptMatchRatio =
      conceptOverlap.length / Math.max(questionConcepts.length, 1);
    const topicCompleteness = topic.completeness || 0;

    // 只有当话题完整度较高且概念匹配度足够时才认为已涵盖
    return topicCompleteness > 0.7 && conceptMatchRatio >= 0.5;
  }

  /**
   * 提取话题的核心概念
   */
  private extractTopicConcepts(topic: RequirementTopic): string[] {
    const concepts: string[] = [];

    // 从话题名称提取概念
    concepts.push(...this.extractQuestionConcepts(topic.name));

    // 从话题描述提取概念
    concepts.push(...this.extractQuestionConcepts(topic.description));

    // 从相关问题中提取概念
    topic.questions.forEach(q => {
      if (q.status === 'answered') {
        concepts.push(...this.extractQuestionConcepts(q.question));
        if (q.answer) {
          concepts.push(...this.extractQuestionConcepts(q.answer));
        }
      }
    });

    return [...new Set(concepts)]; // 去重
  }

  /**
   * 识别话题类型
   */
  private identifyTopicType(topic: RequirementTopic): string {
    const combinedText = `${topic.name} ${topic.description}`.toLowerCase();
    return this.identifyQuestionType(combinedText);
  }

  /**
   * 判断两个问题是否相似
   * 使用更精确的语义相似度计算
   */
  private areQuestionsSimilar(question1: string, question2: string): boolean {
    // 标准化问题文本
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .replace(/[？?！!。.，,；;：:]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const q1 = normalize(question1);
    const q2 = normalize(question2);

    // 如果问题完全相同，直接返回true
    if (q1 === q2) return true;

    // 1. 检查问题类型是否相同
    const type1 = this.identifyQuestionType(q1);
    const type2 = this.identifyQuestionType(q2);

    if (type1 !== type2 && !this.areTypesCompatible(type1, type2)) {
      return false;
    }

    // 2. 提取核心概念
    const concepts1 = this.extractQuestionConcepts(q1);
    const concepts2 = this.extractQuestionConcepts(q2);

    // 3. 计算概念相似度
    const commonConcepts = concepts1.filter(c1 =>
      concepts2.some(c2 => this.areConceptsRelated(c1, c2))
    );

    // 4. 计算结构相似度（问题长度、词汇复杂度等）
    const lengthSimilarity =
      1 -
      Math.abs(concepts1.length - concepts2.length) /
        Math.max(concepts1.length, concepts2.length);

    // 5. 综合相似度计算
    const conceptSimilarity =
      commonConcepts.length / Math.max(concepts1.length, concepts2.length);
    const overallSimilarity = conceptSimilarity * 0.8 + lengthSimilarity * 0.2;

    // 6. 使用动态阈值：概念越多，要求的相似度越高
    const dynamicThreshold = Math.min(
      0.8,
      0.6 + Math.max(concepts1.length, concepts2.length) * 0.05
    );

    return overallSimilarity >= dynamicThreshold;
  }

  /**
   * 处理用户消息，返回对话响应
   */
  async processMessage(
    message: string,
    context?: {
      domain?: string;
      previousMessages?: Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp?: number;
      }>;
    },
    providedConversationId?: string
  ): Promise<{
    success: boolean;
    conversationId: string;
    response: string;
    status: 'clarifying' | 'confirmed' | 'parsing' | 'completed';
    clarificationQuestions?: string[];
    requirementDocument?: any;
    confidence?: number;
  }> {
    // 使用提供的conversationId，如果没有则生成新的
    const conversationId =
      providedConversationId || this.generateConversationId();

    console.log('=== PROCESS MESSAGE INPUT ===');
    console.log('Provided conversationId:', providedConversationId);
    console.log('Final conversationId:', conversationId);
    console.log('Has previousMessages:', !!context?.previousMessages);
    console.log(
      'PreviousMessages length:',
      context?.previousMessages?.length || 0
    );
    console.log('Current conversations in memory:', this.conversations.size);
    console.log('=== END PROCESS MESSAGE INPUT ===');

    let conversationContext = this.conversations.get(conversationId);
    if (!conversationContext) {
      conversationContext = this.initializeConversation(conversationId);

      // 如果有历史消息，初始化对话上下文
      if (context?.previousMessages && context.previousMessages.length > 0) {
        conversationContext.turns = context.previousMessages.map(msg => ({
          id: crypto.randomUUID(),
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || Date.now(),
        }));

        // 分析历史消息，提取已回答的问题
        await this.analyzeHistoricalContext(conversationContext);
      }
    } else {
      // 如果已有会话上下文，更新历史消息
      if (context?.previousMessages && context.previousMessages.length > 0) {
        // 只有当历史消息长度变化时才更新
        if (
          context.previousMessages.length !== conversationContext.turns.length
        ) {
          console.log(
            'Updating conversation context with new previous messages'
          );
          conversationContext.turns = context.previousMessages.map(msg => ({
            id: crypto.randomUUID(),
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp || Date.now(),
          }));

          // 重新分析历史消息，提取已回答的问题
          await this.analyzeHistoricalContext(conversationContext);
        }
      } else {
        // 如果没有传入历史消息，但会话上下文存在，说明这是后续调用
        // 此时不需要做特殊处理，因为会话上下文已经包含了历史对话
        console.log(
          'Using existing conversation context without updating previous messages'
        );
      }
    }

    // 添加用户消息到对话历史
    const userTurn: ConversationTurn = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    conversationContext.turns.push(userTurn);

    console.log('=== PROCESS MESSAGE CONTEXT ===');
    console.log('Conversation ID:', conversationId);
    console.log('Current context status:', conversationContext.status);
    console.log('Turns count:', conversationContext.turns.length);
    console.log('Confirmed facts:', conversationContext.confirmedFacts);
    console.log(
      'Asked questions count:',
      conversationContext.askedQuestions.length
    );
    console.log('Topics count:', conversationContext.topics.length);
    console.log('=== END PROCESS MESSAGE CONTEXT ===');

    // 如果对话轮次较多，重新分析历史对话以更新已确认信息
    if (conversationContext.turns.length > 2) {
      console.log(
        'Re-analyzing historical context to update confirmed facts...'
      );
      await this.analyzeHistoricalContext(conversationContext);
    }

    try {
      // 检查是否需求确认触发
      const isConfirmed = await this.checkRequirementConfirmation(
        message,
        conversationContext
      );

      if (isConfirmed) {
        return await this.handleRequirementConfirmation(conversationContext);
      }

      // 分析当前需求状态
      const analysis =
        await this.analyzeCurrentRequirements(conversationContext);

      if (analysis.needsClarification) {
        return await this.handleClarificationNeeded(
          conversationContext,
          analysis
        );
      } else {
        return await this.handleRequirementsComplete(
          conversationContext,
          analysis
        );
      }
    } catch (error) {
      console.error('Error processing conversation message:', error);
      return {
        success: false,
        conversationId,
        response: '抱歉，处理您的请求时遇到了错误。请再试一次。',
        status: 'clarifying',
        confidence: 0,
      };
    }
  }

  /**
   * 检查用户是否确认了需求
   */
  private async checkRequirementConfirmation(
    message: string,
    context: ConversationContext
  ): Promise<boolean> {
    // 增强确认检测，考虑上下文状态
    if (context.status !== 'confirmed') {
      return false; // 只有在confirmed状态下才检查确认
    }

    const systemPrompt = `你正在分析用户消息，以检测他们是否确认需求已完成并准备好进行处理。

当前对话状态：${context.status}
当前理解摘要：${context.contextSummary || '无'}

寻找表示完成、满意或准备继续的短语。`;

    const userPrompt = `分析这条消息，判断它是否表明用户正在确认他们的需求已完成并准备好进行处理：

消息: "${message}"

寻找类似这样的模式：
- "是的，没错" / "对的" / "正确"
- "我想我们完成了" / "这看起来不错"
- "让我们继续" / "向前推进" / "开始下一步"
- "没有更多问题了" / "就这些" / "够了"
- "确认" / "批准" / "准备好了" / "可以"
- "开始生成" / "生成文档"

只回复 "true" 或 "false"。`;

    try {
      console.log('=== CHECK REQUIREMENT CONFIRMATION ===');
      console.log('SYSTEM PROMPT:');
      console.log(systemPrompt);
      console.log('USER PROMPT:');
      console.log(userPrompt);
      console.log('=== END CHECK REQUIREMENT CONFIRMATION ===');

      const { text } = await generateText({
        model: llmProvider(this.model),
        temperature: 0.1,
        system: systemPrompt,
        prompt: userPrompt,
      });

      return text.trim().toLowerCase() === 'true';
    } catch (error) {
      console.error('Error checking confirmation:', error);
      return false;
    }
  }

  /**
   * 分析当前需求状态
   */
  private async analyzeCurrentRequirements(
    context: ConversationContext
  ): Promise<{
    needsClarification: boolean;
    currentUnderstanding?: string;
    confidence: number;
    questions?: string[];
    gaps?: string[];
  }> {
    // 计算澄清轮次，避免过度细化
    const clarificationRounds = context.turns.filter(
      turn => turn.type === 'clarification'
    ).length;

    const systemPrompt = `你是需求分析专家。分析对话历史，评估需求的完整性。

重要原则：
1. 仔细理解用户已提供的信息，避免重复询问
2. 理解上下文语义，比如"连续失败"指的就是"密码验证失败"
3. 重点关注尚未澄清的关键业务逻辑
4. 当置信度达到0.7以上时，倾向于认为需求已足够清晰
5. 只有在确实影响核心功能实现时才继续澄清

已确认的事实：
${context.confirmedFacts?.map(f => `- ${f}`).join('\n') || '无'}

已讨论的话题：
${context.topics.map(t => `- ${t.name}: ${t.description} (完整度: ${Math.round(t.completeness * 100)}%)`).join('\n')}

已回答的问题：
${context.askedQuestions
  .filter(q => q.status === 'answered')
  .map(q => `- ${q.category}: ${q.question} -> ${q.answer}`)
  .join('\n')}

当前理解摘要：${context.contextSummary || '无'}

重要提醒：
- 用户已经明确说明的信息不要再次询问
- 已确认的具体数值、时间、规则等细节不需要重复确认
- 重点关注真正缺失的信息，而不是重复问已回答的问题
`;

    const conversationHistory = context.turns
      .map(turn => `${turn.role.toUpperCase()}: ${turn.content}`)
      .join('\n\n');

    console.log('=== CONVERSATION HISTORY FOR ANALYSIS ===');
    console.log('Total turns:', context.turns.length);
    console.log('Conversation history:');
    console.log(conversationHistory);
    console.log('=== END CONVERSATION HISTORY FOR ANALYSIS ===');

    const userPrompt = `分析这个需求对话，评估是否需要进一步澄清：

对话历史：
${conversationHistory}

当前状态：${context.status}
已澄清轮次：${clarificationRounds}

请识别：
1. 需求不清晰或模糊的领域（排除已讨论的话题）
2. 缺失的技术细节（排除已回答的问题）
3. 实现上的缺口
4. 需要明确的业务逻辑
5. 未考虑的边缘情况
6. 性能/安全需求

分析原则：
- 仔细理解用户回答，避免语义重复
- 如果已澄清3轮以上，除非有重大遗漏，否则认为需求已足够清晰
- 重点关注核心业务逻辑，避免过度细化技术细节
- 置信度0.7以上即可认为需求可用
- 不要重复询问已经回答过的问题
- 严格检查已确认的事实，确保不再询问已明确说明的信息
- 特别注意已确认的具体数值（如30分钟锁定时间、4位验证码等）

请分析：
1. 用户已经明确说明了哪些信息？包括具体数值、时间、规则等
2. 基于已提供的信息，还有哪些关键缺失信息？
3. 当前需求是否足够清晰以开始开发？
4. 如果需要澄清，只提出真正新的问题
5. 仔细检查避免重复询问任何已确认的事实

以JSON格式返回分析：
{
  "needsClarification": 布尔值,
  "currentUnderstanding": "需求理解的总结",
  "confidence": 0.0-1.0,
  "questions": ["只提出真正新的澄清问题"],
  "gaps": ["仅关键缺失信息"]
}`;

    try {
      console.log('=== ANALYZE CURRENT REQUIREMENTS ===');
      console.log('SYSTEM PROMPT:');
      console.log(systemPrompt);
      console.log('USER PROMPT:');
      console.log(userPrompt);
      console.log('=== END ANALYZE CURRENT REQUIREMENTS ===');

      const { text } = await generateText({
        model: llmProvider(this.model),
        temperature: 0.3,
        system: systemPrompt,
        prompt: userPrompt,
      });

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        console.log('=== CURRENT REQUIREMENTS ANALYSIS RESULT ===');
        console.log('Parsed analysis:', JSON.stringify(analysis, null, 2));
        console.log('=== END CURRENT REQUIREMENTS ANALYSIS RESULT ===');

        // 过滤掉已经问过的问题
        if (analysis.questions) {
          console.log('=== FILTERING QUESTIONS ===');
          console.log('Original questions:', analysis.questions);

          const originalQuestions = [...analysis.questions];
          analysis.questions = analysis.questions.filter(
            (q: string) => !this.isQuestionAlreadyHandled(context, q)
          );

          console.log('Filtered questions:', analysis.questions);
          console.log(
            'Removed questions:',
            originalQuestions.filter(q => !analysis.questions?.includes(q))
          );
          console.log('=== END FILTERING QUESTIONS ===');
        }

        // 如果没有新问题，提高置信度
        if (!analysis.questions || analysis.questions.length === 0) {
          analysis.needsClarification = false;
          analysis.confidence = Math.max(analysis.confidence || 0.7, 0.8);
        }

        // 如果已经有多轮澄清，倾向于认为需求已足够清晰
        if (clarificationRounds >= 3 && context.askedQuestions.length >= 5) {
          analysis.needsClarification = false;
          analysis.confidence = Math.max(analysis.confidence || 0.7, 0.85);
        }

        return {
          needsClarification: analysis.needsClarification || false,
          currentUnderstanding: analysis.currentUnderstanding || '',
          confidence: analysis.confidence || 0,
          questions: analysis.questions || [],
          gaps: analysis.gaps || [],
        };
      }

      // 如果解析失败，使用保守策略
      const baseConfidence = Math.min(0.6 + clarificationRounds * 0.1, 0.8);
      // 如果已经有多轮澄清，倾向于认为需求已足够清晰
      const needsClarification =
        clarificationRounds < 3 && context.askedQuestions.length < 5;
      return {
        needsClarification,
        confidence: needsClarification
          ? baseConfidence
          : Math.max(baseConfidence, 0.8),
        questions: needsClarification ? ['请提供更具体的需求细节。'] : [],
        gaps: [],
      };
    } catch (error) {
      console.error('Error analyzing requirements:', error);
      const baseConfidence = Math.min(0.5 + clarificationRounds * 0.1, 0.7);
      // 如果已经有多轮澄清，倾向于认为需求已足够清晰
      const needsClarification =
        clarificationRounds < 3 && context.askedQuestions.length < 5;
      return {
        needsClarification,
        confidence: needsClarification
          ? baseConfidence
          : Math.max(baseConfidence, 0.75),
        questions: needsClarification ? ['我需要更多信息来理解您的需求。'] : [],
        gaps: [],
      };
    }
  }

  /**
   * 处理需要澄清的情况
   */
  private async handleClarificationNeeded(
    context: ConversationContext,
    analysis: any
  ): Promise<{
    success: boolean;
    conversationId: string;
    response: string;
    status: 'clarifying' | 'confirmed' | 'parsing' | 'completed';
    clarificationQuestions?: string[];
    confidence?: number;
  }> {
    context.status = 'clarifying';
    context.confidence = analysis.confidence;

    // 记录新提出的问题
    const newQuestions: ClarificationQuestion[] = analysis.questions.map(
      (q: string) => ({
        id: crypto.randomUUID(),
        question: q,
        category: this.categorizeQuestion(q),
        priority: 'medium',
        askedAt: Date.now(),
        status: 'pending' as const,
      })
    );

    context.askedQuestions.push(...newQuestions);

    const clarificationTurn: ConversationTurn = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: analysis.questions.join('\n\n'),
      timestamp: Date.now(),
      type: 'clarification',
    };
    context.turns.push(clarificationTurn);

    return {
      success: true,
      conversationId: context.conversationId,
      response: analysis.questions.join('\n\n'),
      status: 'clarifying',
      clarificationQuestions: analysis.questions,
      confidence: analysis.confidence,
    };
  }

  /**
   * 根据问题内容自动分类
   */
  private categorizeQuestion(
    question: string
  ): ClarificationQuestion['category'] {
    const q = question.toLowerCase();

    if (
      q.includes('功能') ||
      q.includes('操作') ||
      q.includes('行为') ||
      q.includes('流程')
    ) {
      return 'functional';
    }
    if (
      q.includes('技术') ||
      q.includes('实现') ||
      q.includes('架构') ||
      q.includes('数据库')
    ) {
      return 'technical';
    }
    if (
      q.includes('业务') ||
      q.includes('规则') ||
      q.includes('逻辑') ||
      q.includes('流程')
    ) {
      return 'business';
    }
    if (
      q.includes('界面') ||
      q.includes('UI') ||
      q.includes('用户体验') ||
      q.includes('交互')
    ) {
      return 'ui';
    }
    if (
      q.includes('性能') ||
      q.includes('速度') ||
      q.includes('响应') ||
      q.includes('并发')
    ) {
      return 'performance';
    }
    if (
      q.includes('安全') ||
      q.includes('权限') ||
      q.includes('认证') ||
      q.includes('授权')
    ) {
      return 'security';
    }

    return 'functional'; // 默认分类
  }

  /**
   * 处理需求完整的情况
   */
  private async handleRequirementsComplete(
    context: ConversationContext,
    analysis: any
  ): Promise<{
    success: boolean;
    conversationId: string;
    response: string;
    status: 'clarifying' | 'confirmed' | 'parsing' | 'completed';
    confidence?: number;
  }> {
    context.status = 'confirmed';
    context.currentUnderstanding = analysis.currentUnderstanding;
    context.confidence = analysis.confidence;

    const response = `我理解的需求如下：\n\n${analysis.currentUnderstanding}\n\n请确认这个理解是否正确？如果需要调整，请告诉我。如果确认无误，请说"确认"或类似的话，我将生成详细的需求文档。`;

    const confirmTurn: ConversationTurn = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
      type: 'confirmation',
    };
    context.turns.push(confirmTurn);

    return {
      success: true,
      conversationId: context.conversationId,
      response,
      status: 'confirmed',
      confidence: analysis.confidence,
    };
  }

  /**
   * 处理需求确认，生成结构化文档
   */
  private async handleRequirementConfirmation(
    context: ConversationContext
  ): Promise<{
    success: boolean;
    conversationId: string;
    response: string;
    status: 'clarifying' | 'confirmed' | 'parsing' | 'completed';
    requirementDocument?: any;
    confidence?: number;
  }> {
    context.status = 'parsing';

    try {
      // 使用需求建模Agent生成结构化文档
      const modelingAgent = new RequirementsModelingAgent({
        model: this.model,
        includeConfidenceAnalysis: true,
      });

      const fullRequirements = this.buildFullRequirementsText(context);
      const modelingResult = await modelingAgent.model(fullRequirements);

      if (modelingResult.success) {
        context.status = 'completed';
        context.requirementDocument = modelingResult.data;

        const parsingTurn: ConversationTurn = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '已生成详细的需求文档，包含实体、关系和业务规则定义。',
          timestamp: Date.now(),
          type: 'document',
        };
        context.turns.push(parsingTurn);

        return {
          success: true,
          conversationId: context.conversationId,
          response:
            '太好了！我已经根据我们的讨论生成了一份全面的需求文档。该文档包含了我们确定的所有实体、关系和业务规则。这份结构化文档现在已经准备好用于业务建模和系统设计了。',
          status: 'completed',
          requirementDocument: modelingResult.data!,
          confidence: modelingResult.data?.confidence || 0,
        };
      } else {
        return {
          success: false,
          conversationId: context.conversationId,
          response: `I encountered an issue generating the formal requirements document: ${modelingResult.error}.

But I have a clear understanding of your requirements from our discussion. You can proceed with the development, and I'll work with the structured information we've built together.`,
          status: 'completed',
          requirementDocument: {
            understanding: context.currentUnderstanding,
            entities: [],
            relationships: [],
            businessRules: [],
          },
        };
      }
    } catch (error) {
      console.error('Error generating requirement document:', error);
      return {
        success: false,
        conversationId: context.conversationId,
        response:
          'I have successfully understood your requirements from our discussion, but encountered a technical issue while generating the formal document structure. However, the conversational requirements analysis is complete and ready for the next phase.',
        status: 'completed',
        requirementDocument: {
          understanding: context.currentUnderstanding,
          entities: [],
          relationships: [],
          businessRules: [],
        },
      };
    }
  }

  /**
   * 构建完整的需求描述文本
   */
  private buildFullRequirementsText(context: ConversationContext): string {
    const conversationHistory = context.turns
      .filter(turn => turn.role === 'user' || turn.type === 'confirmation')
      .map(turn => turn.content)
      .join('\n\n');

    return `基于以下需求讨论，提取并构建完整的业务需求：

${conversationHistory}

${context.currentUnderstanding ? `当前理解：${context.currentUnderstanding}` : ''}

根据这个全面的需求讨论，提取所有业务实体、它们之间的关系以及业务规则。`;
  }
}
