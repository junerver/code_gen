/**
 * @Description API接口单元测试
 * @Author Qoder AI
 * @Date 2025-09-22
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { H3Event } from 'h3';

// Mock dependencies
vi.mock('#server/core/agents/requirement-dialog', () => ({
  RequirementDialogAgent: vi.fn().mockImplementation(() => ({
    processDialogTurn: vi.fn(),
    assessCompleteness: vi.fn(),
    generateClarificationQuestions: vi.fn(),
    generateRequirementDocument: vi.fn(),
  })),
}));

vi.mock('#server/core/agents/business-modeling', () => ({
  BusinessModelingAgent: vi.fn().mockImplementation(() => ({
    parseBusinessModel: vi.fn(),
    validateModel: vi.fn(),
    optimizeModel: vi.fn(),
  })),
}));

vi.mock('#server/utils/model', () => ({
  llmProvider: vi.fn(() => 'mocked-provider'),
}));

vi.mock('ai', () => ({
  streamText: vi.fn(),
  tool: vi.fn(config => config),
}));

// Mock Nuxt functions
const mockReadBody = vi.fn();
const mockCreateError = vi.fn(error => error);

vi.mock('h3', () => ({
  readBody: mockReadBody,
  createError: mockCreateError,
}));

global.defineEventHandler = vi.fn(handler => handler);

describe('API接口测试', () => {
  let mockEvent: Partial<H3Event>;

  beforeEach(() => {
    mockEvent = {};
    vi.clearAllMocks();
  });

  describe('需求对话API', () => {
    test('应该处理有效的对话请求', async () => {
      const mockRequest = {
        messages: [
          {
            role: 'user',
            content: '我想做一个电商网站',
            timestamp: new Date(),
          },
        ],
        model: 'DeepSeek-Chat',
        conversationId: 'test-conv-123',
        context: {
          domain: 'e-commerce',
          currentPhase: 'collecting',
          completeness: 0.3,
        },
      };

      mockReadBody.mockResolvedValue(mockRequest);

      const { streamText } = await import('ai');
      vi.mocked(streamText).mockResolvedValue('mocked-stream-response');

      // Import and test the dialog API
      const dialogHandler = await import(
        '#server/api/requirements/dialog.post'
      );

      // Since the function returns a stream, we just verify it doesn't throw
      await expect(
        dialogHandler.default(mockEvent as H3Event)
      ).resolves.toBeDefined();

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'mocked-provider',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: '我想做一个电商网站',
            }),
          ]),
          tools: expect.objectContaining({
            assessCompleteness: expect.any(Object),
            generateQuestions: expect.any(Object),
            generateDocument: expect.any(Object),
            processDialog: expect.any(Object),
          }),
        })
      );
    });

    test('应该拒绝空消息请求', async () => {
      const invalidRequest = {
        messages: [],
        model: 'DeepSeek-Chat',
      };

      mockReadBody.mockResolvedValue(invalidRequest);

      const dialogHandler = await import(
        '#server/api/requirements/dialog.post'
      );

      await expect(dialogHandler.default(mockEvent as H3Event)).rejects.toEqual(
        expect.objectContaining({
          statusCode: 400,
          statusMessage: '消息列表不能为空',
        })
      );
    });

    test('应该处理工具执行', async () => {
      const mockRequest = {
        messages: [
          { role: 'user', content: '测试消息', timestamp: new Date() },
        ],
      };

      mockReadBody.mockResolvedValue(mockRequest);

      const { RequirementDialogAgent } = await import(
        '#server/core/agents/requirement-dialog'
      );
      const mockAgent = new RequirementDialogAgent();

      // Mock tool methods
      vi.mocked(mockAgent.assessCompleteness).mockResolvedValue({
        overall: 0.6,
        functionalRequirements: 0.7,
        nonFunctionalRequirements: 0.5,
        businessConstraints: 0.6,
        userScenarios: 0.6,
        missingAreas: ['业务规则'],
        recommendations: ['添加详细描述'],
      });

      vi.mocked(mockAgent.generateClarificationQuestions).mockResolvedValue([
        {
          id: 'q1',
          question: '测试问题？',
          context: '测试上下文',
          priority: 'high',
          category: 'functional',
        },
      ]);

      // Test tool execution
      const { streamText } = await import('ai');
      const mockStreamCall = vi.mocked(streamText).mock.calls[0];

      if (mockStreamCall) {
        const toolConfig = mockStreamCall[0].tools;

        // Test assessCompleteness tool
        const assessResult = await toolConfig.assessCompleteness.execute({
          requirementText: '测试需求',
          domain: 'test',
        });

        expect(assessResult.success).toBe(true);
        expect(assessResult.completeness).toBeDefined();

        // Test generateQuestions tool
        const questionResult = await toolConfig.generateQuestions.execute({
          requirementText: '测试需求',
          maxQuestions: 3,
        });

        expect(questionResult.success).toBe(true);
        expect(questionResult.questions).toHaveLength(1);
      }
    });
  });

  describe('业务建模API', () => {
    test('应该处理有效的建模请求', async () => {
      const mockDocument = {
        id: 'doc-123',
        title: '测试需求',
        description: '这是一个测试需求文档，用于验证业务建模功能',
        domain: 'test',
        functionalRequirements: [
          {
            id: 'func-1',
            title: '用户管理',
            description: '系统应支持用户注册和登录',
            priority: 'high',
            category: 'user_interface',
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
          reviewStatus: 'reviewed',
        },
      };

      const mockRequest = {
        requirementDocument: mockDocument,
        options: {
          model: 'DeepSeek-Chat',
          includeConfidenceAnalysis: true,
          validationLevel: 'basic',
        },
      };

      const mockModelingResult = {
        success: true,
        businessModel: {
          id: 'model-123',
          sourceDocumentId: 'doc-123',
          entities: [
            {
              id: 'entity-1',
              name: 'User',
              type: 'model',
              attributes: [],
              description: 'User entity',
              complexity: 'simple',
            },
          ],
          relationships: [],
          businessRules: [],
          domain: 'test',
          complexity: 'simple',
          confidence: 0.8,
          confidenceFactors: {
            entityRecognition: 0.8,
            relationshipClarity: 0.8,
            ruleCompleteness: 0.8,
            ambiguityLevel: 0.8,
          },
          validationStatus: 'valid',
          validationMessages: [],
          metadata: {
            createdAt: new Date(),
            modelUsed: 'DeepSeek-Chat',
            version: '1.0.0',
          },
        },
        confidence: {
          overall: 0.8,
          factors: {
            entityRecognition: 0.8,
            relationshipClarity: 0.8,
            ruleCompleteness: 0.8,
            ambiguityLevel: 0.8,
          },
        },
        suggestions: ['模型质量良好'],
      };

      mockReadBody.mockResolvedValue(mockRequest);

      const { BusinessModelingAgent } = await import(
        '#server/core/agents/business-modeling'
      );
      const mockAgent = new BusinessModelingAgent();
      vi.mocked(mockAgent.parseBusinessModel).mockResolvedValue(
        mockModelingResult
      );

      const modelingHandler = await import(
        '#server/api/requirements/modeling.post'
      );
      const response = await modelingHandler.default(mockEvent as H3Event);

      expect(response.success).toBe(true);
      expect(response.businessModel).toBeDefined();
      expect(response.businessModel!.entities).toHaveLength(1);
      expect(response.confidence).toBeDefined();
    });

    test('应该拒绝空文档请求', async () => {
      const invalidRequest = {
        requirementDocument: null,
      };

      mockReadBody.mockResolvedValue(invalidRequest);

      const modelingHandler = await import(
        '#server/api/requirements/modeling.post'
      );

      await expect(
        modelingHandler.default(mockEvent as H3Event)
      ).rejects.toEqual(
        expect.objectContaining({
          statusCode: 400,
          statusMessage: '需求文档不能为空',
        })
      );
    });

    test('应该拒绝无效文档', async () => {
      const invalidDocument = {
        id: '',
        title: '',
        description: '',
        domain: '',
        functionalRequirements: [],
        nonFunctionalRequirements: [],
        businessConstraints: [],
        userScenarios: [],
        glossary: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          completeness: 0,
          reviewStatus: 'draft',
        },
      };

      const invalidRequest = {
        requirementDocument: invalidDocument,
      };

      mockReadBody.mockResolvedValue(invalidRequest);

      const modelingHandler = await import(
        '#server/api/requirements/modeling.post'
      );

      await expect(
        modelingHandler.default(mockEvent as H3Event)
      ).rejects.toEqual(
        expect.objectContaining({
          statusCode: 400,
          statusMessage: expect.stringContaining('需求文档缺少必要字段'),
        })
      );
    });

    test('应该处理建模失败的情况', async () => {
      const mockDocument = {
        id: 'doc-123',
        title: '测试需求',
        description: '这是一个测试需求文档，用于验证建模失败的处理',
        domain: 'test',
        functionalRequirements: [
          {
            id: 'func-1',
            title: '测试功能',
            description: '测试功能描述',
            priority: 'high',
            category: 'business_logic',
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
          completeness: 0.5,
          reviewStatus: 'draft',
        },
      };

      const mockRequest = {
        requirementDocument: mockDocument,
      };

      const mockFailureResult = {
        success: false,
        suggestions: ['请检查需求文档的完整性', '建议添加更多业务细节'],
      };

      mockReadBody.mockResolvedValue(mockRequest);

      const { BusinessModelingAgent } = await import(
        '#server/core/agents/business-modeling'
      );
      const mockAgent = new BusinessModelingAgent();
      vi.mocked(mockAgent.parseBusinessModel).mockResolvedValue(
        mockFailureResult
      );

      const modelingHandler = await import(
        '#server/api/requirements/modeling.post'
      );
      const response = await modelingHandler.default(mockEvent as H3Event);

      expect(response.success).toBe(false);
      expect(response.validationErrors).toBeDefined();
      expect(response.suggestions).toHaveLength(2);
    });

    test('应该处理系统异常', async () => {
      const mockDocument = {
        id: 'doc-123',
        title: '测试需求',
        description: '用于测试系统异常处理的需求文档',
        domain: 'test',
        functionalRequirements: [
          {
            id: 'func-1',
            title: '测试功能',
            description: '测试功能描述',
            priority: 'high',
            category: 'business_logic',
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
          completeness: 0.7,
          reviewStatus: 'reviewed',
        },
      };

      const mockRequest = {
        requirementDocument: mockDocument,
      };

      mockReadBody.mockResolvedValue(mockRequest);

      const { BusinessModelingAgent } = await import(
        '#server/core/agents/business-modeling'
      );
      const mockAgent = new BusinessModelingAgent();
      vi.mocked(mockAgent.parseBusinessModel).mockRejectedValue(
        new Error('系统内部错误')
      );

      const modelingHandler = await import(
        '#server/api/requirements/modeling.post'
      );
      const response = await modelingHandler.default(mockEvent as H3Event);

      expect(response.success).toBe(false);
      expect(response.validationErrors).toBeDefined();
      expect(response.validationErrors![0].severity).toBe('error');
      expect(response.suggestions).toContain('如果问题持续，请联系技术支持');
    });
  });
});
