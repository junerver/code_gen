/**
 * @Description 业务建模Agent单元测试
 * @Author Qoder AI
 * @Date 2025-09-22
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { BusinessModelingAgent } from '#server/core/agents/business-modeling';
import type { RequirementDocument } from '#shared/types/requirement';
import type {
  BusinessModel,
  ModelingOptions,
} from '#shared/types/business-model';

// Mock AI SDK
vi.mock('ai', () => ({
  generateText: vi.fn(),
  generateObject: vi.fn(),
}));

// Mock LLM Provider
vi.mock('#server/utils/model', () => ({
  llmProvider: vi.fn(() => 'mocked-llm-provider'),
}));

// Mock Confidence Scorer
vi.mock('#server/core/agents/requirements-parser/confidence-scorer', () => ({
  ConfidenceScorer: {
    calculateConfidence: vi.fn(() => ({
      overall: 0.8,
      factors: {
        entityRecognition: 0.8,
        relationshipClarity: 0.8,
        ruleCompleteness: 0.8,
        ambiguityLevel: 0.8,
      },
      explanation: ['模型质量良好'],
      suggestions: ['考虑添加更多验证规则'],
    })),
  },
}));

describe('BusinessModelingAgent', () => {
  let agent: BusinessModelingAgent;
  let mockDocument: RequirementDocument;

  beforeEach(() => {
    agent = new BusinessModelingAgent({
      model: 'DeepSeek-Chat',
      temperature: 0.2,
    });

    mockDocument = {
      id: 'doc-123',
      title: '电商系统需求',
      description: '一个完整的电商系统，包括用户管理、商品管理、订单处理等功能',
      domain: 'e-commerce',
      functionalRequirements: [
        {
          id: 'func-1',
          title: '用户注册登录',
          description: '用户可以注册账号并登录系统',
          priority: 'high',
          category: 'user_interface',
        },
        {
          id: 'func-2',
          title: '商品管理',
          description: '管理员可以添加、编辑、删除商品',
          priority: 'high',
          category: 'business_logic',
        },
      ],
      nonFunctionalRequirements: [
        {
          id: 'nf-1',
          type: 'performance',
          description: '系统响应时间应小于2秒',
          priority: 'high',
        },
      ],
      businessConstraints: [
        {
          id: 'bc-1',
          type: 'regulatory',
          description: '必须符合GDPR数据保护规定',
          impact: 'blocking',
        },
      ],
      userScenarios: [
        {
          id: 'us-1',
          title: '用户购买商品',
          actor: '注册用户',
          description: '用户浏览商品，加入购物车，完成支付',
          steps: ['浏览商品', '加入购物车', '结算支付'],
          expectedOutcome: '订单创建成功',
        },
      ],
      glossary: [
        {
          id: 'term-1',
          term: 'SKU',
          definition: '库存保持单位，最小存货单元',
        },
      ],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        completeness: 0.8,
        reviewStatus: 'reviewed',
      },
    };
  });

  describe('构造函数', () => {
    test('应该使用默认配置创建实例', () => {
      const defaultAgent = new BusinessModelingAgent();
      expect(defaultAgent).toBeInstanceOf(BusinessModelingAgent);
    });

    test('应该使用自定义配置创建实例', () => {
      const customAgent = new BusinessModelingAgent({
        model: 'Qwen3-Coder-30B',
        temperature: 0.1,
        maxRetries: 5,
      });
      expect(customAgent).toBeInstanceOf(BusinessModelingAgent);
    });
  });

  describe('parseBusinessModel', () => {
    test('应该成功解析业务模型', async () => {
      const mockParsedModel = {
        entities: [
          {
            id: 'entity-1',
            name: 'User',
            type: 'model',
            attributes: [
              {
                name: 'id',
                type: 'string',
                required: true,
                description: 'User unique identifier',
                validation: [],
              },
              {
                name: 'email',
                type: 'string',
                required: true,
                description: 'User email address',
                validation: [],
              },
            ],
            description: 'System user entity',
            complexity: 'simple',
          },
          {
            id: 'entity-2',
            name: 'Product',
            type: 'model',
            attributes: [
              {
                name: 'id',
                type: 'string',
                required: true,
                description: 'Product unique identifier',
                validation: [],
              },
              {
                name: 'name',
                type: 'string',
                required: true,
                description: 'Product name',
                validation: [],
              },
            ],
            description: 'Product entity',
            complexity: 'simple',
          },
        ],
        relationships: [
          {
            id: 'rel-1',
            from: 'User',
            to: 'Order',
            type: 'one-to-many',
            description: 'User can have multiple orders',
          },
        ],
        businessRules: [
          {
            id: 'rule-1',
            rule: 'User email must be unique in the system',
            entity: 'User',
            priority: 'critical',
            category: 'validation',
          },
        ],
        confidence: 0.8,
        confidenceFactors: {
          entityRecognition: 0.8,
          relationshipClarity: 0.8,
          ruleCompleteness: 0.8,
          ambiguityLevel: 0.8,
        },
        complexity: 'medium',
      };

      // Mock generateObject
      const { generateObject } = await import('ai');
      vi.mocked(generateObject).mockResolvedValue({
        object: mockParsedModel,
      });

      const options: ModelingOptions = {
        includeConfidenceAnalysis: true,
        validationLevel: 'basic',
        targetComplexity: 'medium',
      };

      const result = await agent.parseBusinessModel(mockDocument, options);

      expect(result.success).toBe(true);
      expect(result.businessModel).toBeDefined();
      expect(result.businessModel!.entities).toHaveLength(2);
      expect(result.businessModel!.relationships).toHaveLength(1);
      expect(result.businessModel!.businessRules).toHaveLength(1);
      expect(result.businessModel!.domain).toBe('e-commerce');
      expect(result.confidence).toBeDefined();
    });

    test('应该处理解析失败的情况', async () => {
      // Mock generateObject to throw error
      const { generateObject } = await import('ai');
      vi.mocked(generateObject).mockRejectedValue(
        new Error('AI service error')
      );

      // Mock generateText to also fail
      const { generateText } = await import('ai');
      vi.mocked(generateText).mockRejectedValue(
        new Error('Text generation failed')
      );

      const result = await agent.parseBusinessModel(mockDocument);

      expect(result.success).toBe(false);
      expect(result.suggestions).toContain('请确保需求文档格式正确且内容完整');
    });

    test('应该处理结构化生成失败但文本生成成功的情况', async () => {
      // Mock generateObject to fail
      const { generateObject } = await import('ai');
      vi.mocked(generateObject).mockRejectedValue(
        new Error('Structured generation failed')
      );

      // Mock generateText to return JSON
      const { generateText } = await import('ai');
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({
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
          confidence: 0.6,
        }),
      });

      const result = await agent.parseBusinessModel(mockDocument);

      expect(result.success).toBe(true);
      expect(result.businessModel!.entities).toHaveLength(1);
    });
  });

  describe('validateModel', () => {
    test('应该验证业务模型', async () => {
      const mockModel: BusinessModel = {
        id: 'model-123',
        sourceDocumentId: 'doc-123',
        entities: [
          {
            id: 'entity-1',
            name: 'User',
            type: 'model',
            attributes: [
              {
                name: 'id',
                type: 'string',
                required: true,
                description: 'User ID',
                validation: [],
              },
            ],
            description: 'User entity for the system',
            complexity: 'simple',
          },
        ],
        relationships: [
          {
            id: 'rel-1',
            from: 'User',
            to: 'Order',
            type: 'one-to-many',
            description: 'User has orders',
          },
        ],
        businessRules: [
          {
            id: 'rule-1',
            rule: 'User email must be unique',
            entity: 'User',
            priority: 'critical',
            category: 'validation',
          },
        ],
        domain: 'e-commerce',
        complexity: 'medium',
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
      };

      const validation = await agent.validateModel(mockModel);

      expect(validation).toBeDefined();
      expect(validation!.valid).toBe(false); // Order entity doesn't exist
      expect(validation!.errors.length).toBeGreaterThan(0);
      expect(validation!.score).toBeGreaterThanOrEqual(0);
      expect(validation!.score).toBeLessThanOrEqual(1);
    });

    test('应该验证完全有效的模型', async () => {
      const validModel: BusinessModel = {
        id: 'model-123',
        sourceDocumentId: 'doc-123',
        entities: [
          {
            id: 'entity-1',
            name: 'User',
            type: 'model',
            attributes: [
              {
                name: 'id',
                type: 'string',
                required: true,
                description: 'User identifier',
                validation: [],
              },
            ],
            description: 'User entity for the system',
            complexity: 'simple',
          },
          {
            id: 'entity-2',
            name: 'Order',
            type: 'model',
            attributes: [
              {
                name: 'id',
                type: 'string',
                required: true,
                description: 'Order identifier',
                validation: [],
              },
            ],
            description: 'Order entity for the system',
            complexity: 'simple',
          },
        ],
        relationships: [
          {
            id: 'rel-1',
            from: 'User',
            to: 'Order',
            type: 'one-to-many',
            description: 'User can have multiple orders',
          },
        ],
        businessRules: [
          {
            id: 'rule-1',
            rule: 'User email must be unique in the system',
            entity: 'User',
            priority: 'critical',
            category: 'validation',
          },
        ],
        domain: 'e-commerce',
        complexity: 'medium',
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
      };

      const validation = await agent.validateModel(validModel);

      expect(validation!.valid).toBe(true);
      expect(validation!.errors).toHaveLength(0);
      expect(validation!.score).toBeGreaterThan(0.8);
    });
  });

  describe('optimizeModel', () => {
    test('应该优化业务模型', async () => {
      const inputModel: BusinessModel = {
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
        domain: 'e-commerce',
        complexity: 'simple',
        confidence: 0.6,
        confidenceFactors: {
          entityRecognition: 0.6,
          relationshipClarity: 0.6,
          ruleCompleteness: 0.6,
          ambiguityLevel: 0.6,
        },
        validationStatus: 'valid',
        validationMessages: [],
        metadata: {
          createdAt: new Date(),
          modelUsed: 'DeepSeek-Chat',
          version: '1.0.0',
        },
      };

      const optimizedModel = await agent.optimizeModel(inputModel);

      expect(optimizedModel).toBeDefined();
      expect(optimizedModel.id).toBe(inputModel.id);
      expect(optimizedModel.metadata.optimizationSuggestions).toBeDefined();
    });
  });

  describe('私有方法测试', () => {
    test('preprocessDocument应该预处理需求文档', () => {
      const preprocessed = (agent as any).preprocessDocument(mockDocument);

      expect(preprocessed).toBeDefined();
      expect(preprocessed.id).toBe(mockDocument.id);
      expect(preprocessed.functionalRequirements).toBeDefined();
    });

    test('validateEntities应该验证实体', () => {
      const entities = [
        {
          id: 'entity-1',
          name: 'User',
          type: 'model',
          attributes: [],
          description: 'User entity for testing',
          complexity: 'simple',
        },
        {
          id: 'entity-2',
          name: '', // Invalid name
          type: 'model',
          attributes: [],
          description: 'Invalid entity',
          complexity: 'simple',
        },
      ];

      const validation = (agent as any).validateEntities(entities);

      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0].message).toContain('实体名称');
      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    test('validateRelationships应该验证关系', () => {
      const entities = [
        {
          id: 'e1',
          name: 'User',
          type: 'model',
          attributes: [],
          description: 'User',
          complexity: 'simple',
        },
        {
          id: 'e2',
          name: 'Order',
          type: 'model',
          attributes: [],
          description: 'Order',
          complexity: 'simple',
        },
      ];

      const relationships = [
        {
          id: 'rel-1',
          from: 'User',
          to: 'Order',
          type: 'one-to-many',
          description: 'Valid relationship',
        },
        {
          id: 'rel-2',
          from: 'User',
          to: 'NonExistent',
          type: 'one-to-one',
          description: 'Invalid relationship',
        },
      ];

      const validation = (agent as any).validateRelationships(
        relationships,
        entities
      );

      expect(validation.errors.length).toBe(1);
      expect(validation.errors[0].message).toContain('NonExistent');
    });

    test('calculateValidationScore应该计算验证分数', () => {
      const errors = [{ field: 'test', message: 'Error', severity: 'error' }];
      const warnings = [
        { field: 'test', message: 'Warning', severity: 'warning' },
      ];
      const mockModel = {
        entities: [{}],
        relationships: [{}],
        businessRules: [{}],
      };

      const score = (agent as any).calculateValidationScore(
        errors,
        warnings,
        mockModel
      );

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      expect(score).toBeLessThan(1); // Should be penalized for errors
    });
  });
});
