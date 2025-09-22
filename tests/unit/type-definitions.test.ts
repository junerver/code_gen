/**
 * @Description 类型定义单元测试
 * @Author Qoder AI
 * @Date 2025-09-22
 */

import { describe, test, expect } from 'vitest';
import {
  RequirementDocumentSchema,
  DialogContextSchema,
  BusinessModelingRequestSchema,
  CompletenessScoreSchema,
  ClarificationQuestionSchema,
} from '#shared/types/requirement';
import {
  BusinessModelSchema,
  ValidationResultSchema,
} from '#shared/types/business-model';
import { ChatMessageSchema } from '#shared/types/chat';

describe('类型定义测试', () => {
  describe('需求文档类型', () => {
    test('应该验证有效的需求文档', () => {
      const validDocument = {
        id: 'doc-123',
        title: '电商系统需求',
        description:
          '这是一个完整的电商系统需求描述，包含了用户管理、商品管理、订单处理等核心功能',
        domain: 'e-commerce',
        functionalRequirements: [
          {
            id: 'func-1',
            title: '用户注册',
            description: '用户可以通过邮箱注册系统账号',
            priority: 'high',
            category: 'user_interface',
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
            title: '用户购买流程',
            actor: '注册用户',
            description: '用户浏览商品，加入购物车，完成支付的完整流程',
            steps: [
              '浏览商品',
              '加入购物车',
              '填写订单信息',
              '选择支付方式',
              '完成支付',
            ],
            expectedOutcome: '订单创建成功，用户收到确认邮件',
          },
        ],
        glossary: [
          {
            id: 'term-1',
            term: 'SKU',
            definition: '库存保持单位，用于标识具体的商品规格',
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

      expect(() =>
        RequirementDocumentSchema.parse(validDocument)
      ).not.toThrow();
    });

    test('应该拒绝无效的需求文档', () => {
      const invalidDocument = {
        id: '', // 空ID
        title: 'A', // 标题过短
        description: 'Short', // 描述过短
        domain: 'E', // 领域过短
        functionalRequirements: [],
        nonFunctionalRequirements: [],
        businessConstraints: [],
        userScenarios: [],
        glossary: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          completeness: 1.5, // 超出范围
          reviewStatus: 'reviewed',
        },
      };

      expect(() => RequirementDocumentSchema.parse(invalidDocument)).toThrow();
    });

    test('应该验证功能需求的必要字段', () => {
      const invalidFunctionalReq = {
        id: 'func-1',
        title: 'AB', // 过短
        description: 'Short', // 过短
        priority: 'high',
        category: 'user_interface',
      };

      expect(() =>
        RequirementDocumentSchema.parse({
          id: 'doc-123',
          title: '测试文档',
          description:
            '这是一个用于测试功能需求验证的需求文档，包含详细的描述信息',
          domain: 'test',
          functionalRequirements: [invalidFunctionalReq],
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
        })
      ).toThrow();
    });

    test('应该验证用户场景的步骤要求', () => {
      const invalidUserScenario = {
        id: 'us-1',
        title: '测试场景',
        actor: '用户',
        description: '这是一个用于测试的用户场景描述',
        steps: [], // 空步骤数组
        expectedOutcome: '预期结果',
      };

      expect(() =>
        RequirementDocumentSchema.parse({
          id: 'doc-123',
          title: '测试文档',
          description:
            '这是一个用于测试用户场景验证的需求文档，包含详细的描述信息',
          domain: 'test',
          functionalRequirements: [],
          nonFunctionalRequirements: [],
          businessConstraints: [],
          userScenarios: [invalidUserScenario],
          glossary: [],
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            version: '1.0.0',
            completeness: 0.5,
            reviewStatus: 'draft',
          },
        })
      ).toThrow();
    });
  });

  describe('对话上下文类型', () => {
    test('应该验证有效的对话上下文', () => {
      const validContext = {
        domain: 'e-commerce',
        previousRequirements: ['用户管理', '商品管理'],
        userAnswers: {
          '您希望支持哪些支付方式？': '支付宝、微信支付、银行卡',
          '预期日活用户数是多少？': '约10000人',
        },
        sessionId: 'session-123',
        currentPhase: 'clarifying',
        completeness: 0.6,
      };

      expect(() => DialogContextSchema.parse(validContext)).not.toThrow();
    });

    test('应该接受可选字段为空的上下文', () => {
      const minimalContext = {
        currentPhase: 'collecting',
      };

      expect(() => DialogContextSchema.parse(minimalContext)).not.toThrow();
    });

    test('应该拒绝无效的阶段值', () => {
      const invalidContext = {
        currentPhase: 'invalid_phase',
      };

      expect(() => DialogContextSchema.parse(invalidContext)).toThrow();
    });
  });

  describe('业务建模请求类型', () => {
    test('应该验证有效的建模请求', () => {
      const validRequest = {
        requirementDocument: {
          id: 'doc-123',
          title: '测试需求',
          description: '这是一个用于测试业务建模请求验证的完整需求描述文档',
          domain: 'test',
          functionalRequirements: [],
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
        },
        options: {
          model: 'DeepSeek-Chat',
          includeConfidenceAnalysis: true,
          validationLevel: 'strict',
          targetComplexity: 'medium',
        },
      };

      expect(() =>
        BusinessModelingRequestSchema.parse(validRequest)
      ).not.toThrow();
    });

    test('应该接受最小化的建模请求', () => {
      const minimalRequest = {
        requirementDocument: {
          id: 'doc-123',
          title: '最小测试需求',
          description:
            '这是一个最小化的需求描述，用于测试建模请求的基本验证功能',
          domain: 'test',
          functionalRequirements: [],
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
        },
      };

      expect(() =>
        BusinessModelingRequestSchema.parse(minimalRequest)
      ).not.toThrow();
    });
  });

  describe('完整性评分类型', () => {
    test('应该验证有效的完整性评分', () => {
      const validScore = {
        overall: 0.75,
        functionalRequirements: 0.8,
        nonFunctionalRequirements: 0.6,
        businessConstraints: 0.7,
        userScenarios: 0.9,
        missingAreas: ['非功能需求细节', '业务约束说明'],
        recommendations: [
          '建议添加性能要求的具体指标',
          '明确数据备份和恢复策略',
          '补充用户权限管理规则',
        ],
      };

      expect(() => CompletenessScoreSchema.parse(validScore)).not.toThrow();
    });

    test('应该拒绝超出范围的评分', () => {
      const invalidScore = {
        overall: 1.5, // 超出范围
        functionalRequirements: -0.1, // 负数
        nonFunctionalRequirements: 0.6,
        businessConstraints: 0.7,
        userScenarios: 0.8,
        missingAreas: [],
        recommendations: [],
      };

      expect(() => CompletenessScoreSchema.parse(invalidScore)).toThrow();
    });
  });

  describe('澄清问题类型', () => {
    test('应该验证有效的澄清问题', () => {
      const validQuestion = {
        id: 'q-123',
        question: '您希望系统支持哪些语言？',
        context:
          '多语言支持是国际化产品的重要特性，需要确定具体的语言需求和实现方式',
        priority: 'medium',
        category: 'functional',
        suggestedAnswers: ['中文', '英文', '多语言支持'],
        whyImportant: '影响系统架构设计和用户体验',
        impact: '需要设计多语言数据模型和界面适配',
        dependencies: ['用户界面设计', '数据库设计'],
        targetArea: 'functional_requirements',
      };

      expect(() =>
        ClarificationQuestionSchema.parse(validQuestion)
      ).not.toThrow();
    });

    test('应该验证最小化的澄清问题', () => {
      const minimalQuestion = {
        id: 'q-456',
        question: '用户密码复杂度要求是什么？',
        context: '密码安全策略需要明确定义以确保系统安全性',
        priority: 'high',
        category: 'security',
      };

      expect(() =>
        ClarificationQuestionSchema.parse(minimalQuestion)
      ).not.toThrow();
    });

    test('应该拒绝过短的问题和上下文', () => {
      const invalidQuestion = {
        id: 'q-789',
        question: '？', // 过短
        context: '短', // 过短
        priority: 'low',
        category: 'functional',
      };

      expect(() =>
        ClarificationQuestionSchema.parse(invalidQuestion)
      ).toThrow();
    });
  });

  describe('业务模型类型', () => {
    test('应该验证有效的业务模型', () => {
      const validModel = {
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
                description: 'Unique identifier for user',
                validation: [],
              },
            ],
            description: 'User entity representing system users',
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
        confidence: 0.85,
        confidenceFactors: {
          entityRecognition: 0.9,
          relationshipClarity: 0.8,
          ruleCompleteness: 0.85,
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

      expect(() => BusinessModelSchema.parse(validModel)).not.toThrow();
    });
  });

  describe('验证结果类型', () => {
    test('应该验证有效的验证结果', () => {
      const validResult = {
        valid: true,
        errors: [],
        warnings: [
          {
            field: 'entity.User.description',
            message: '实体描述可以更详细',
            severity: 'warning',
          },
        ],
        suggestions: ['考虑添加更多属性验证规则'],
        score: 0.92,
        details: {
          entityValidation: {
            valid: true,
            issues: [],
          },
          relationshipValidation: {
            valid: true,
            issues: [],
          },
          businessRuleValidation: {
            valid: true,
            issues: [],
          },
          consistencyCheck: {
            valid: true,
            issues: [],
          },
        },
      };

      expect(() => ValidationResultSchema.parse(validResult)).not.toThrow();
    });

    test('应该验证有错误的验证结果', () => {
      const errorResult = {
        valid: false,
        errors: [
          {
            field: 'relationship.rel-1.to',
            message: '关系引用了不存在的实体',
            severity: 'error',
          },
        ],
        warnings: [],
        suggestions: ['请确保所有关系引用的实体都已定义'],
        score: 0.3,
      };

      expect(() => ValidationResultSchema.parse(errorResult)).not.toThrow();
    });
  });

  describe('聊天消息类型', () => {
    test('应该验证有效的聊天消息', () => {
      const validMessage = {
        id: 'msg-123',
        role: 'user',
        content: '我想开发一个电商网站',
        timestamp: new Date(),
        metadata: {
          tokens: 150,
          model: 'DeepSeek-Chat',
          processingTime: 1200,
        },
      };

      expect(() => ChatMessageSchema.parse(validMessage)).not.toThrow();
    });

    test('应该验证最小化的聊天消息', () => {
      const minimalMessage = {
        role: 'assistant',
        content: '好的，请详细描述一下您的需求。',
      };

      expect(() => ChatMessageSchema.parse(minimalMessage)).not.toThrow();
    });

    test('应该验证包含工具调用的消息', () => {
      const toolMessage = {
        id: 'msg-456',
        role: 'assistant',
        content: '我正在分析您的需求...',
        timestamp: new Date(),
        metadata: {
          toolCalls: [
            {
              id: 'tool-call-1',
              type: 'function',
              function: {
                name: 'assessCompleteness',
                arguments: '{"requirement": "电商网站"}',
              },
            },
          ],
        },
      };

      expect(() => ChatMessageSchema.parse(toolMessage)).not.toThrow();
    });

    test('应该拒绝无效的角色', () => {
      const invalidMessage = {
        role: 'invalid_role',
        content: '测试消息',
      };

      expect(() => ChatMessageSchema.parse(invalidMessage)).toThrow();
    });
  });
});
