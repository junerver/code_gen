/**
 * @Description 需求对话Agent单元测试
 * @Author Qoder AI
 * @Date 2025-09-22
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { RequirementDialogAgent } from '#server/core/agents/requirement-dialog';
import type { DialogContext } from '#shared/types/requirement';
import type { ChatMessage } from '#shared/types/chat';

// Mock AI SDK
vi.mock('ai', () => ({
  generateText: vi.fn(),
  generateObject: vi.fn(),
}));

// Mock LLM Provider
vi.mock('#server/utils/model', () => ({
  llmProvider: vi.fn(() => 'mocked-llm-provider'),
}));

describe('RequirementDialogAgent', () => {
  let agent: RequirementDialogAgent;
  let mockMessages: ChatMessage[];
  let mockContext: DialogContext;

  beforeEach(() => {
    agent = new RequirementDialogAgent({
      model: 'DeepSeek-Chat',
      domain: 'test',
    });

    mockMessages = [
      {
        id: '1',
        role: 'user',
        content: '我想做一个电商网站',
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'assistant',
        content: '请详细描述一下您的电商网站需求',
        timestamp: new Date(),
      },
    ];

    mockContext = {
      domain: 'e-commerce',
      previousRequirements: [],
      userAnswers: {},
      sessionId: 'test-session',
      currentPhase: 'collecting',
      completeness: 0.3,
    };
  });

  describe('构造函数', () => {
    test('应该使用默认配置创建实例', () => {
      const defaultAgent = new RequirementDialogAgent();
      expect(defaultAgent).toBeInstanceOf(RequirementDialogAgent);
    });

    test('应该使用自定义配置创建实例', () => {
      const customAgent = new RequirementDialogAgent({
        model: 'Qwen3-Coder-30B',
        temperature: 0.8,
        domain: 'finance',
      });
      expect(customAgent).toBeInstanceOf(RequirementDialogAgent);
    });
  });

  describe('assessCompleteness', () => {
    test('应该返回完整性评分', async () => {
      // Mock generateObject
      const { generateObject } = await import('ai');
      vi.mocked(generateObject).mockResolvedValue({
        object: {
          overall: 0.6,
          functionalRequirements: 0.7,
          nonFunctionalRequirements: 0.5,
          businessConstraints: 0.6,
          userScenarios: 0.6,
          missingAreas: ['非功能需求', '业务约束'],
          recommendations: ['建议添加性能要求', '明确业务规则'],
        },
      });

      const result = await agent.assessCompleteness(
        '我想做一个电商网站，有商品展示和购买功能',
        'e-commerce'
      );

      expect(result.overall).toBe(0.6);
      expect(result.missingAreas).toContain('非功能需求');
      expect(result.recommendations).toHaveLength(2);
    });

    test('应该处理评估失败的情况', async () => {
      // Mock generateObject to throw error
      const { generateObject } = await import('ai');
      vi.mocked(generateObject).mockRejectedValue(
        new Error('AI service error')
      );

      const result = await agent.assessCompleteness('简单需求');

      // 应该返回降级的简单评估
      expect(result).toBeDefined();
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(1);
    });
  });

  describe('generateClarificationQuestions', () => {
    test('应该生成澄清问题', async () => {
      // Mock generateText
      const { generateText } = await import('ai');
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify([
          {
            question: '您希望支持哪些支付方式？',
            context: '支付功能是电商系统的核心',
            priority: 'high',
            category: 'functional',
          },
          {
            question: '预期同时在线用户数是多少？',
            context: '需要了解性能要求',
            priority: 'medium',
            category: 'performance',
          },
        ]),
      });

      const questions = await agent.generateClarificationQuestions(
        '我想做一个电商网站',
        mockContext
      );

      expect(questions).toHaveLength(2);
      expect(questions[0].question).toContain('支付');
      expect(questions[1].category).toBe('performance');
    });

    test('应该处理生成失败的情况', async () => {
      // Mock generateText to return invalid JSON
      const { generateText } = await import('ai');
      vi.mocked(generateText).mockResolvedValue({
        text: 'Invalid JSON response',
      });

      const questions = await agent.generateClarificationQuestions(
        '需求描述',
        mockContext
      );

      // 应该返回降级的问题
      expect(questions).toHaveLength(3);
      expect(questions[0].question).toBeDefined();
    });
  });

  describe('processDialogTurn', () => {
    test('应该处理对话轮次', async () => {
      // Mock assessCompleteness
      vi.spyOn(agent, 'assessCompleteness').mockResolvedValue({
        overall: 0.5,
        functionalRequirements: 0.6,
        nonFunctionalRequirements: 0.4,
        businessConstraints: 0.5,
        userScenarios: 0.5,
        missingAreas: ['业务规则'],
        recommendations: ['明确业务流程'],
      });

      // Mock generateText for response
      const { generateText } = await import('ai');
      vi.mocked(generateText).mockResolvedValue({
        text: '谢谢您的描述。为了更好地了解您的需求，请问您希望这个电商网站主要销售什么类型的商品？',
      });

      const response = await agent.processDialogTurn(mockMessages, mockContext);

      expect(response.message).toContain('电商网站');
      expect(response.dialogState).toBeDefined();
      expect(response.completeness).toBe(0.5);
    });

    test('应该根据完整性确定下一状态', async () => {
      // Test high completeness -> finalizing
      vi.spyOn(agent, 'assessCompleteness').mockResolvedValue({
        overall: 0.8,
        functionalRequirements: 0.8,
        nonFunctionalRequirements: 0.8,
        businessConstraints: 0.8,
        userScenarios: 0.8,
        missingAreas: [],
        recommendations: [],
      });

      const { generateText } = await import('ai');
      vi.mocked(generateText).mockResolvedValue({
        text: '您的需求描述已经比较完整了。',
      });

      const response = await agent.processDialogTurn(mockMessages, {
        ...mockContext,
        currentPhase: 'clarifying',
      });

      expect(response.dialogState).toBe('finalizing');
    });
  });

  describe('generateRequirementDocument', () => {
    test('应该生成需求文档', async () => {
      const mockDocument = {
        id: 'doc-123',
        title: '电商网站需求',
        description: '一个功能完整的电商网站系统',
        domain: 'e-commerce',
        functionalRequirements: [
          {
            id: 'func-1',
            title: '商品展示',
            description: '用户可以浏览商品列表',
            priority: 'high' as const,
            category: 'user_interface' as const,
          },
        ],
        nonFunctionalRequirements: [],
        businessConstraints: [],
        userScenarios: [],
        glossary: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          completeness: 0.8,
          reviewStatus: 'draft' as const,
        },
      };

      // Mock generateObject
      const { generateObject } = await import('ai');
      vi.mocked(generateObject).mockResolvedValue({
        object: mockDocument,
      });

      const document = await agent.generateRequirementDocument(mockMessages);

      expect(document.title).toBe('电商网站需求');
      expect(document.domain).toBe('e-commerce');
      expect(document.functionalRequirements).toHaveLength(1);
      expect(document.id).toBeDefined();
    });

    test('应该处理文档生成失败', async () => {
      // Mock generateObject to throw error
      const { generateObject } = await import('ai');
      vi.mocked(generateObject).mockRejectedValue(
        new Error('Generation failed')
      );

      await expect(
        agent.generateRequirementDocument(mockMessages)
      ).rejects.toThrow('需求文档生成失败');
    });
  });

  describe('私有方法测试', () => {
    test('extractUserRequirements应该提取用户消息', () => {
      const userRequirements = (agent as any).extractUserRequirements(
        mockMessages
      );
      expect(userRequirements).toBe('我想做一个电商网站');
    });

    test('determineNextState应该正确转换状态', () => {
      const highCompleteness = {
        overall: 0.9,
        functionalRequirements: 0.9,
        nonFunctionalRequirements: 0.9,
        businessConstraints: 0.9,
        userScenarios: 0.9,
        missingAreas: [],
        recommendations: [],
      };

      const nextState = (agent as any).determineNextState(
        highCompleteness,
        'collecting'
      );
      expect(nextState).toBe('finalizing');
    });

    test('simpleCompletenessAssessment应该提供降级评估', () => {
      const result = (agent as any).simpleCompletenessAssessment(
        '我需要一个用户管理功能，包括登录注册，性能要求响应时间小于1秒，需要符合数据保护规定'
      );

      expect(result.overall).toBeGreaterThan(0);
      expect(result.functionalRequirements).toBeGreaterThan(0);
      expect(result.missingAreas).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });
  });
});
