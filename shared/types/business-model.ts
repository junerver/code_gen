/**
 * @Description 业务建模类型定义 - 增强版
 * @Author Qoder AI
 * @Date 2025-09-22
 */

import { z } from 'zod';
import {
  BusinessEntitySchema,
  EntityRelationshipSchema,
  BusinessRuleSchema,
  type BusinessEntity,
  type EntityRelationship,
  type BusinessRule,
} from '#server/core/agents/requirements-parser/types';
import { ConfidenceFactorsSchema, ValidationErrorSchema } from './requirement';

// 业务模型定义
export const BusinessModelSchema = z.object({
  id: z.string().uuid(),
  sourceDocumentId: z.string().uuid(),

  // 业务实体
  entities: z.array(BusinessEntitySchema),

  // 实体关系
  relationships: z.array(EntityRelationshipSchema),

  // 业务规则
  businessRules: z.array(BusinessRuleSchema),

  // 领域信息
  domain: z.string().min(2, '领域至少2个字符'),
  complexity: z.enum(['simple', 'medium', 'complex', 'highly_complex']),

  // 置信度评估
  confidence: z.number().min(0).max(1),
  confidenceFactors: ConfidenceFactorsSchema,

  // 验证结果
  validationStatus: z.enum(['valid', 'invalid', 'warning']),
  validationMessages: z.array(z.string()),

  // 架构信息
  architecture: z
    .object({
      pattern: z
        .enum(['mvc', 'layered', 'microservices', 'domain_driven'])
        .optional(),
      components: z.array(z.string()).optional(),
      technologies: z.array(z.string()).optional(),
    })
    .optional(),

  // 元数据
  metadata: z.object({
    createdAt: z.date(),
    updatedAt: z.date().optional(),
    processingTime: z.number().optional(),
    modelUsed: z.string().optional(),
    version: z.string().default('1.0.0'),
    generationRules: z.array(z.string()).optional(),
    optimizationSuggestions: z.array(z.string()).optional(),
  }),
});

// 建模配置选项
export const ModelingOptionsSchema = z.object({
  model: z.string().optional(),
  includeConfidenceAnalysis: z.boolean().default(true),
  validationLevel: z.enum(['basic', 'strict']).default('basic'),
  targetComplexity: z
    .enum(['simple', 'medium', 'complex', 'highly_complex'])
    .optional(),
  architecturePattern: z
    .enum(['mvc', 'layered', 'microservices', 'domain_driven'])
    .optional(),
  optimizeForPerformance: z.boolean().default(false),
  generateDocumentation: z.boolean().default(true),
});

// 建模结果
export const BusinessModelingResultSchema = z.object({
  success: z.boolean(),
  businessModel: BusinessModelSchema.optional(),
  confidence: z
    .object({
      overall: z.number().min(0).max(1),
      factors: ConfidenceFactorsSchema,
      explanation: z.array(z.string()).optional(),
      suggestions: z.array(z.string()).optional(),
    })
    .optional(),
  validationErrors: z.array(ValidationErrorSchema).optional(),
  suggestions: z.array(z.string()).optional(),
  processingTime: z.number().optional(),
  metadata: z
    .object({
      entitiesGenerated: z.number(),
      relationshipsGenerated: z.number(),
      businessRulesGenerated: z.number(),
      complexityLevel: z.enum([
        'simple',
        'medium',
        'complex',
        'highly_complex',
      ]),
      domainMatched: z.boolean(),
    })
    .optional(),
});

// 模型验证结果
export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(ValidationErrorSchema),
  suggestions: z.array(z.string()),
  score: z.number().min(0).max(1),
  details: z
    .object({
      entityValidation: z.object({
        valid: z.boolean(),
        issues: z.array(z.string()),
      }),
      relationshipValidation: z.object({
        valid: z.boolean(),
        issues: z.array(z.string()),
      }),
      businessRuleValidation: z.object({
        valid: z.boolean(),
        issues: z.array(z.string()),
      }),
      consistencyCheck: z.object({
        valid: z.boolean(),
        issues: z.array(z.string()),
      }),
    })
    .optional(),
});

// 模型优化建议
export const OptimizationSuggestionSchema = z.object({
  type: z.enum([
    'performance',
    'maintainability',
    'scalability',
    'security',
    'consistency',
  ]),
  description: z.string(),
  impact: z.enum(['high', 'medium', 'low']),
  effort: z.enum(['high', 'medium', 'low']),
  implementation: z.array(z.string()),
  benefits: z.array(z.string()),
});

// 导出类型
export type BusinessModel = z.infer<typeof BusinessModelSchema>;
export type ModelingOptions = z.infer<typeof ModelingOptionsSchema>;
export type BusinessModelingResult = z.infer<
  typeof BusinessModelingResultSchema
>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type OptimizationSuggestion = z.infer<
  typeof OptimizationSuggestionSchema
>;

// 重新导出基础类型以便使用
export type { BusinessEntity, EntityRelationship, BusinessRule };
