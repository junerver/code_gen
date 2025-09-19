/**
 * @Description Requirements Parser Types
 * @Author Claude Code
 * @Date 2025-09-19
 */

import { z } from 'zod';

// Enhanced entity definition with better validation
export const EntityAttributeSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid attribute name format'),
  type: z.enum([
    'string',
    'number',
    'boolean',
    'date',
    'array',
    'object',
    'enum',
  ]),
  required: z.boolean(),
  validation: z
    .array(
      z.object({
        rule: z
          .string()
          .min(1, 'Rule cannot be empty')
          .optional()
          .describe('Validation rule name or expression'),
        message: z.string().optional(),
        params: z.record(z.any(), z.any()).optional(),
      })
    )
    .optional(),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  constraints: z
    .object({
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
    })
    .optional(),
});

export const BusinessEntitySchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1)
    .regex(
      /^[A-Z][a-zA-Z0-9]*$/,
      'Entity name must start with uppercase letter'
    ),
  type: z.enum([
    'model',
    'service',
    'controller',
    'view',
    'repository',
    'dto',
    'enum',
  ]),
  attributes: z
    .array(EntityAttributeSchema)
    .min(1, 'Entity must have at least one attribute'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  domain: z.string().optional(), // Business domain this entity belongs to
  complexity: z.enum(['simple', 'medium', 'complex']),
  businessRules: z.array(z.string()).optional(),
});

// Enhanced relationship definition
export const EntityRelationshipSchema = z.object({
  id: z.string().optional(),
  from: z.string(),
  to: z.string(),
  type: z.enum([
    'one-to-one',
    'one-to-many',
    'many-to-many',
    'inheritance',
    'dependency',
    'aggregation',
  ]),
  description: z.string().min(5),
  bidirectional: z.boolean().default(false),
  cascade: z.enum(['none', 'all', 'persist', 'remove']).optional(),
  foreignKey: z.string().optional(),
  required: z.boolean().default(false),
  // Optional alternative field names for AI compatibility
  sourceEntityId: z.string().optional(),
  targetEntityId: z.string().optional(),
  source: z.string().optional(),
  target: z.string().optional(),
});

// Enhanced business rule definition
export const BusinessRuleSchema = z.object({
  id: z.string().optional(),
  rule: z
    .string()
    .min(10, 'Business rule description must be at least 10 characters'),
  entity: z.string(),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  category: z.enum([
    'validation',
    'business_logic',
    'security',
    'performance',
    'data_integrity',
  ]),
  conditions: z.array(z.string()).optional(),
  actions: z.array(z.string()).optional(),
  errorMessage: z.string().optional(),
  compensatingAction: z.string().optional(),
  // Optional description field as alternative to rule field for AI compatibility
  description: z.string().optional(),
});

// Enhanced clarification question with better context
export const ClarificationQuestionSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(10, 'Question must be at least 10 characters'),
  context: z.string().min(20, 'Context must be at least 20 characters'),
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
  whyImportant: z.string().optional(), // Explain why this clarification matters
  impact: z.string().optional(), // What impact this has on the final implementation
  dependencies: z.array(z.string()).optional(), // Other questions that depend on this
});

// Parsed requirement with enhanced validation and scoring
export const ParsedRequirementSchema = z.object({
  id: z.string().optional(),
  originalText: z
    .string()
    .describe("The user's raw input query text")
    .optional(),
  entities: z
    .array(BusinessEntitySchema)
    .min(1, 'At least one entity must be identified'),
  relationships: z.array(EntityRelationshipSchema),
  businessRules: z.array(BusinessRuleSchema),
  clarificationNeeded: z.array(ClarificationQuestionSchema).optional(),
  confidence: z.number().min(0).max(1),
  confidenceFactors: z
    .object({
      entityRecognition: z.number().min(0).max(1),
      relationshipClarity: z.number().min(0).max(1),
      ruleCompleteness: z.number().min(0).max(1),
      ambiguityLevel: z.number().min(0).max(1),
    })
    .optional(),
  domain: z.string().optional(),
  complexity: z
    .enum(['simple', 'medium', 'complex', 'highly_complex'])
    .optional(),
  estimatedEffort: z.enum(['days', 'weeks', 'months']).optional(),
  tags: z.array(z.string()).optional(), // Tags for categorization
  metadata: z
    .object({
      parsingTime: z.number().optional(), // Time taken to parse in ms
      retryCount: z.number().optional(), // Number of parsing retries
      modelUsed: z.string().optional(), // Which AI model was used
      version: z.string().optional(),
      confidenceExplanation: z.array(z.string()).optional(),
      improvementSuggestions: z.array(z.string()).optional(),
    })
    .optional(),
});

// Domain knowledge for better parsing
export const DomainKnowledgeSchema = z.object({
  name: z.string(),
  description: z.string(),
  commonEntities: z.array(z.string()),
  commonRelationships: z.array(z.string()),
  keywords: z.array(z.string()),
  patterns: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      regex: z.string().optional(),
      entities: z.array(z.string()),
      rules: z.array(z.string()),
    })
  ),
  businessRules: z.array(z.string()).optional(),
});

// Requirements parsing result with validation status
export const RequirementsParsingResultSchema = z.object({
  success: z.boolean(),
  data: ParsedRequirementSchema.optional(),
  error: z.string().optional(),
  validationErrors: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
        value: z.any().optional(),
      })
    )
    .optional(),
  retryable: z.boolean().default(false).optional(),
  suggestion: z.string().optional(),
});

export type EntityAttribute = z.infer<typeof EntityAttributeSchema>;
export type BusinessEntity = z.infer<typeof BusinessEntitySchema>;
export type EntityRelationship = z.infer<typeof EntityRelationshipSchema>;
export type BusinessRule = z.infer<typeof BusinessRuleSchema>;
export type ClarificationQuestion = z.infer<typeof ClarificationQuestionSchema>;
export type ParsedRequirement = z.infer<typeof ParsedRequirementSchema>;
export type DomainKnowledge = z.infer<typeof DomainKnowledgeSchema>;
export type RequirementsParsingResult = z.infer<
  typeof RequirementsParsingResultSchema
>;
