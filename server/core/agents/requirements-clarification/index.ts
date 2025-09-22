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

export interface ConversationContext {
  conversationId: string;
  turns: ConversationTurn[];
  currentUnderstanding?: string;
  requirementDocument?: any;
  status: 'new' | 'clarifying' | 'confirmed' | 'parsing' | 'completed';
  confidence: number;
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
    };
    this.conversations.set(conversationId, context);
    return context;
  }

  private generateConversationId(): string {
    return crypto.randomUUID();
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
    }
  ): Promise<{
    success: boolean;
    conversationId: string;
    response: string;
    status: 'clarifying' | 'confirmed' | 'parsing' | 'completed';
    clarificationQuestions?: string[];
    requirementDocument?: any;
    confidence?: number;
  }> {
    const conversationId = context?.previousMessages?.[0]?.timestamp
      ? this.generateConversationId()
      : (context?.previousMessages?.[0] as any)?.conversationId ||
        this.generateConversationId();

    let conversationContext = this.conversations.get(conversationId);
    if (!conversationContext) {
      conversationContext = this.initializeConversation(conversationId);
    }

    // 添加用户消息到对话历史
    const userTurn: ConversationTurn = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    conversationContext.turns.push(userTurn);

    try {
      // 检查是否需求确认触发
      const isConfirmed = await this.checkRequirementConfirmation(message);

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
        response:
          'Sorry, I encountered an error processing your request. Please try again.',
        status: 'clarifying',
        confidence: 0,
      };
    }
  }

  /**
   * 检查用户是否确认了需求
   */
  private async checkRequirementConfirmation(
    message: string
  ): Promise<boolean> {
    const systemPrompt = `You are analyzing user messages to detect if they are confirming their requirements as complete and ready for processing. Look for phrases indicating completion, satisfaction, or readiness to proceed.`;

    const userPrompt = `Analyze this message and determine if it indicates the user is confirming their requirements are complete and ready for processing:

Message: "${message}"

Looking for patterns like:
- "yes, that's correct" / "that's right"
- "I think we're done" / "this looks good"
- "let's proceed" / "move forward"
- "no more questions" / "that's all"
- "confirmed" / "approved" / "ready"

Reply with only "true" or "false".`;

    try {
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
    const systemPrompt = `You are a requirements analysis expert. Analyze the conversation history to identify gaps, ambiguities, and areas needing clarification.`;

    const conversationHistory = context.turns
      .map(turn => `${turn.role.toUpperCase()}: ${turn.content}`)
      .join('\n\n');

    const userPrompt = `Analyze this requirements conversation and identify what needs clarification:

Conversation History:
${conversationHistory}

Current Status: ${context.status}

Please identify:
1. Areas where the requirements are unclear or ambiguous
2. Missing technical details
3. Implementation gaps
4. Business logic that needs specification
5. Edge cases not considered
6. Performance/security requirements

Return your analysis in JSON format:
{
  "needsClarification": boolean,
  "currentUnderstanding": "A summary of what you understand about the requirements",
  "confidence": 0.0-1.0,
  "questions": ["specific clarification questions"],
  "gaps": ["areas where information is missing"]
}`;

    try {
      const { text } = await generateText({
        model: llmProvider(this.model),
        temperature: 0.3,
        system: systemPrompt,
        prompt: userPrompt,
      });

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return {
          needsClarification: analysis.needsClarification || false,
          currentUnderstanding: analysis.currentUnderstanding || '',
          confidence: analysis.confidence || 0,
          questions: analysis.questions || [],
          gaps: analysis.gaps || [],
        };
      }

      return {
        needsClarification: true,
        confidence: 0.5,
        questions: [
          'Please provide more specific details about your requirements.',
        ],
        gaps: [],
      };
    } catch (error) {
      console.error('Error analyzing requirements:', error);
      return {
        needsClarification: true,
        confidence: 0,
        questions: ['I need more information to understand your requirements.'],
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
            'Perfect! I have generated a comprehensive requirements document based on our discussion. The document includes all the entities, relationships, and business rules we identified. This structured document is now ready for business modeling and system design.',
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

    return `Based on the following requirements discussion, extract and structure the complete business requirements:

${conversationHistory}

${context.currentUnderstanding ? `Current Understanding: ${context.currentUnderstanding}` : ''}

Extract all business entities, their relationships, and business rules based on this comprehensive requirements discussion.`;
  }
}
