/**
 * @Description 需求解析系统数据模型类型定义
 * @Author Qoder AI
 * @Date 2025-09-22
 */

import { z } from 'zod';

// 功能需求定义
export const FunctionalRequirementSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(5, '标题至少5个字符'),
  description: z.string().min(20, '描述至少20个字符'),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  category: z.enum([
    'user_interface',
    'business_logic',
    'data_management',
    'integration',
    'security',
  ]),
  acceptanceCriteria: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  estimatedEffort: z.enum(['hours', 'days', 'weeks']).optional(),
});

// 非功能需求定义
export const NonFunctionalRequirementSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'performance',
    'security',
    'usability',
    'reliability',
    'scalability',
    'maintainability',
  ]),
  description: z.string().min(20, '描述至少20个字符'),
  metric: z.string().optional(),
  target: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
});

// 业务约束定义
export const BusinessConstraintSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'regulatory',
    'business_policy',
    'technical',
    'budget',
    'timeline',
  ]),
  description: z.string().min(20, '描述至少20个字符'),
  impact: z.enum(['blocking', 'major', 'minor']),
  workaround: z.string().optional(),
});

// 用户场景定义
export const UserScenarioSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(5, '标题至少5个字符'),
  actor: z.string().min(2, '角色至少2个字符'),
  description: z.string().min(30, '描述至少30个字符'),
  preconditions: z.array(z.string()).optional(),
  steps: z.array(z.string()).min(1, '至少包含一个步骤'),
  expectedOutcome: z.string().min(10, '期望结果至少10个字符'),
  alternativeFlows: z.array(z.string()).optional(),
  businessValue: z.string().optional(),
});

// 术语表项定义
export const GlossaryItemSchema = z.object({
  id: z.string().uuid(),
  term: z.string().min(1, '术语不能为空'),
  definition: z.string().min(10, '定义至少10个字符'),
  category: z.string().optional(),
  synonyms: z.array(z.string()).optional(),
  relatedTerms: z.array(z.string()).optional(),
});

// 需求说明文档定义
export const RequirementDocumentSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(5, '标题至少5个字符'),
  description: z.string().min(50, '描述至少50个字符'),
  domain: z.string().min(2, '领域至少2个字符'),

  // 功能需求
  functionalRequirements: z.array(FunctionalRequirementSchema),

  // 非功能需求
  nonFunctionalRequirements: z.array(NonFunctionalRequirementSchema),

  // 业务约束
  businessConstraints: z.array(BusinessConstraintSchema),

  // 用户场景
  userScenarios: z.array(UserScenarioSchema),

  // 术语表
  glossary: z.array(GlossaryItemSchema),

  // 元数据
  metadata: z.object({
    createdAt: z.date(),
    updatedAt: z.date(),
    version: z.string().default('1.0.0'),
    completeness: z.number().min(0).max(1),
    reviewStatus: z.enum(['draft', 'reviewed', 'approved']).default('draft'),
    author: z.string().optional(),
    reviewers: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

// 对话状态定义
export const DialogStateSchema = z.enum([
  'collecting',
  'clarifying',
  'finalizing',
  'completed',
]);

// 对话上下文定义
export const DialogContextSchema = z.object({
  domain: z.string().optional(),
  previousRequirements: z.array(z.string()).optional(),
  userAnswers: z.record(z.string(), z.string()).optional(),
  sessionId: z.string().optional(),
  currentPhase: DialogStateSchema,
  completeness: z.number().min(0).max(1).optional(),
});

// 需求对话请求定义
export const RequirementDialogRequestSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string().optional(),
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
      timestamp: z.date().optional(),
    })
  ),
  model: z.string().optional(),
  conversationId: z.string().optional(),
  context: DialogContextSchema.optional(),
});

// 需求对话响应定义
export const RequirementDialogResponseSchema = z.object({
  message: z.string(),
  dialogState: DialogStateSchema,
  completeness: z.number().min(0).max(1).optional(),
  requirementDocument: RequirementDocumentSchema.optional(),
  suggestions: z.array(z.string()).optional(),
  nextQuestions: z.array(z.string()).optional(),
});

// 置信度因子定义（基于现有类型扩展）
export const ConfidenceFactorsSchema = z.object({
  entityRecognition: z.number().min(0).max(1),
  relationshipClarity: z.number().min(0).max(1),
  ruleCompleteness: z.number().min(0).max(1),
  ambiguityLevel: z.number().min(0).max(1),
  domainKnowledgeMatch: z.number().min(0).max(1).optional(),
  requirementCompleteness: z.number().min(0).max(1).optional(),
});

// 置信度评估定义
export const ConfidenceScoreSchema = z.object({
  overall: z.number().min(0).max(1),
  factors: ConfidenceFactorsSchema,
  explanation: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional(),
});

// 验证错误定义
export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string().optional(),
  severity: z.enum(['error', 'warning', 'info']),
  suggestion: z.string().optional(),
});

// 业务建模请求定义
export const BusinessModelingRequestSchema = z.object({
  requirementDocument: RequirementDocumentSchema,
  options: z
    .object({
      model: z.string().optional(),
      includeConfidenceAnalysis: z.boolean().default(true),
      validationLevel: z.enum(['basic', 'strict']).default('basic'),
      targetComplexity: z
        .enum(['simple', 'medium', 'complex', 'highly_complex'])
        .optional(),
    })
    .optional(),
});

// 业务建模响应定义
export const BusinessModelingResponseSchema = z.object({
  success: z.boolean(),
  businessModel: z
    .object({
      id: z.string().uuid(),
      sourceDocumentId: z.string().uuid(),

      // 使用现有的业务实体、关系和规则定义
      entities: z.array(z.any()), // 引用现有的 BusinessEntitySchema
      relationships: z.array(z.any()), // 引用现有的 EntityRelationshipSchema
      businessRules: z.array(z.any()), // 引用现有的 BusinessRuleSchema

      // 领域信息
      domain: z.string(),
      complexity: z.enum(['simple', 'medium', 'complex', 'highly_complex']),

      // 置信度评估
      confidence: z.number().min(0).max(1),
      confidenceFactors: ConfidenceFactorsSchema,

      // 验证结果
      validationStatus: z.enum(['valid', 'invalid', 'warning']),
      validationMessages: z.array(z.string()),

      // 元数据
      metadata: z.object({
        createdAt: z.date(),
        processingTime: z.number().optional(),
        modelUsed: z.string().optional(),
        version: z.string().default('1.0.0'),
      }),
    })
    .optional(),
  confidence: ConfidenceScoreSchema.optional(),
  validationErrors: z.array(ValidationErrorSchema).optional(),
  suggestions: z.array(z.string()).optional(),
});

// 导出类型定义
export type FunctionalRequirement = z.infer<typeof FunctionalRequirementSchema>;
export type NonFunctionalRequirement = z.infer<
  typeof NonFunctionalRequirementSchema
>;
export type BusinessConstraint = z.infer<typeof BusinessConstraintSchema>;
export type UserScenario = z.infer<typeof UserScenarioSchema>;
export type GlossaryItem = z.infer<typeof GlossaryItemSchema>;
export type RequirementDocument = z.infer<typeof RequirementDocumentSchema>;
export type DialogState = z.infer<typeof DialogStateSchema>;
export type DialogContext = z.infer<typeof DialogContextSchema>;
export type RequirementDialogRequest = z.infer<
  typeof RequirementDialogRequestSchema
>;
export type RequirementDialogResponse = z.infer<
  typeof RequirementDialogResponseSchema
>;
export type ConfidenceFactors = z.infer<typeof ConfidenceFactorsSchema>;
export type ConfidenceScore = z.infer<typeof ConfidenceScoreSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type BusinessModelingRequest = z.infer<
  typeof BusinessModelingRequestSchema
>;
export type BusinessModelingResponse = z.infer<
  typeof BusinessModelingResponseSchema
>;

// 完整性评估结果
export const CompletenessScoreSchema = z.object({
  overall: z.number().min(0).max(1),
  functionalRequirements: z.number().min(0).max(1),
  nonFunctionalRequirements: z.number().min(0).max(1),
  businessConstraints: z.number().min(0).max(1),
  userScenarios: z.number().min(0).max(1),
  missingAreas: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export type CompletenessScore = z.infer<typeof CompletenessScoreSchema>;

// 澄清问题定义（扩展现有类型）
export const ClarificationQuestionSchema = z.object({
  id: z.string().uuid(),
  question: z.string().min(10, '问题至少10个字符'),
  context: z.string().min(20, '上下文至少20个字符'),
  priority: z.enum(['high', 'medium', 'low']),
  category: z.enum([
    'functional',
    'technical',
    'business',
    'performance',
    'security',
    'ui_ux',
  ]),
  suggestedAnswers: z.array(z.string()).optional(),
  whyImportant: z.string().optional(),
  impact: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  targetArea: z
    .enum([
      'functional_requirements',
      'non_functional_requirements',
      'business_constraints',
      'user_scenarios',
    ])
    .optional(),
});

export type ClarificationQuestion = z.infer<typeof ClarificationQuestionSchema>;
