/* eslint-disable @typescript-eslint/no-explicit-any */
// noinspection ES6UnusedImports

/**
 * @Description Requirements Parser Agent
 * @Author Claude Code
 * @Date 2025-09-19
 */

import { generateObject, generateText } from 'ai';
import { llmProvider } from '#server/utils/model';
import crypto from 'crypto';
import {
  DOMAIN_KNOWLEDGE_BASE,
  getDomainBusinessRules,
  getDomainEntities,
  matchDomain,
} from './domain-knowledge';
import { ConfidenceScorer } from './confidence-scorer';
import {
  type ParsedRequirement,
  ParsedRequirementSchema,
  type RequirementsParsingResult,
} from './types';

/**
 * Generate a proper UUID v4 pattern that Zod UUID validator accepts
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

export interface ParseRequirementsOptions {
  model?: AvailableModelNames;
  temperature?: number;
  maxRetries?: number;
  includeConfidenceAnalysis?: boolean;
  context?: {
    domain?: string;
    previousRequirements?: string[];
    userAnswers?: Record<string, string>;
  };
}

export class RequirementsParserAgent {
  private model: AvailableModelNames;
  private temperature: number;
  private maxRetries: number;
  private includeConfidenceAnalysis: boolean;
  private context?: ParseRequirementsOptions['context'];

  constructor(options: ParseRequirementsOptions = {}) {
    this.model = options.model || DEFAULT_MODEL;
    this.temperature = options.temperature || 0.3; // Lower temperature for more consistent parsing
    this.maxRetries = options.maxRetries || 3;
    this.includeConfidenceAnalysis =
      options.includeConfidenceAnalysis !== false;
    this.context = options.context;
  }

  /**
   * Parse natural language requirements into structured format
   */
  async parse(requirementText: string): Promise<RequirementsParsingResult> {
    try {
      // Detect domain if not provided
      const domain = this.context?.domain || matchDomain(requirementText);

      // Get domain-specific context
      const domainContext = domain ? DOMAIN_KNOWLEDGE_BASE[domain] : null;
      const domainEntities = domain ? getDomainEntities(domain) : [];
      const domainRules = domain ? getDomainBusinessRules(domain) : [];

      // Generate structured requirements using AI
      const parsedResult = await this.generateStructuredRequirements(
        requirementText,
        domain,
        domainContext,
        domainEntities,
        domainRules
      );

      // Post-process to ensure schema compliance
      const processedResult = this.postProcessRequirement(
        parsedResult,
        requirementText
      );

      // Validate the parsed result
      const validation = await this.validateParsedRequirements(processedResult);
      if (!validation.valid) {
        return {
          success: false,
          error: 'Validation failed',
          validationErrors: validation.errors,
          retryable: true,
          suggestion:
            'Try providing more specific requirements or answer clarification questions',
        };
      }

      // Calculate confidence scores
      let finalResult = processedResult;
      if (this.includeConfidenceAnalysis) {
        const confidenceScore = ConfidenceScorer.calculateConfidence(
          requirementText,
          processedResult.entities,
          processedResult.relationships,
          processedResult.businessRules,
          processedResult?.clarificationNeeded || [],
          domain
        );

        finalResult = {
          ...processedResult,
          confidence: confidenceScore.overall,
          confidenceFactors: confidenceScore.factors,
          metadata: {
            ...processedResult.metadata,
            confidenceExplanation: confidenceScore.explanation,
            improvementSuggestions: confidenceScore.suggestions,
          },
        };
      }

      return {
        success: true,
        data: finalResult,
      };
    } catch (error) {
      console.error('Requirements parsing error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown parsing error',
        retryable: true,
        suggestion:
          'Try rephrasing your requirements with more specific technical details',
      };
    }
  }

  /**
   * Generate structured requirements using AI
   */
  private async generateStructuredRequirements(
    text: string,
    domain: string | null,
    domainContext: any,
    domainEntities: string[],
    domainRules: string[]
  ): Promise<ParsedRequirement> {
    const systemPrompt = this.buildSystemPrompt(
      domain,
      domainContext,
      domainEntities,
      domainRules
    );
    const userPrompt = this.buildUserPrompt(text, domain);

    try {
      // Try with strict schema mode first
      const { object } = await generateObject({
        model: llmProvider(this.model),
        temperature: this.temperature,
        system: systemPrompt,
        prompt: userPrompt,
        schema: ParsedRequirementSchema,
        maxRetries: 3,
      });

      return object as ParsedRequirement;
    } catch (schemaError) {
      console.warn(
        'Schema validation failed, trying with text mode:',
        schemaError
      );

      // Fallback: Generate as text then manually parse
      const { text: generatedText } = await generateText({
        model: llmProvider(this.model),
        temperature: this.temperature,
        system: systemPrompt,
        prompt: `${userPrompt}\n\nGenerate ONLY the JSON response, no explanatory text.`,
      });

      // Extract JSON from the text response
      try {
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return parsed as ParsedRequirement;
        } else {
          throw new Error('No JSON structure found in AI response');
        }
      } catch (parseError) {
        console.error('Failed to parse JSON from text response:', parseError);
        throw schemaError; // Fall back to original error
      }
    }
  }

  /**
   * Post-process the requirement to fix any schema issues
   */
  private postProcessRequirement(
    requirement: ParsedRequirement,
    originalText: string
  ): ParsedRequirement {
    // Helper function to validate if a UUID follows proper v4 format
    const validateUUID = (uuid: string): boolean => {
      if (!uuid || typeof uuid !== 'string') return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        uuid
      );
    };

    // Ensure all required top-level fields are present
    const processed = { ...requirement };

    // Fix UUID generation logic
    if (!processed.id || !validateUUID(processed.id)) {
      processed.id = generateUUID();
    }
    if (!processed.originalText) {
      processed.originalText = originalText;
    }
    if (!processed.complexity) {
      processed.complexity = 'medium';
    }
    if (!processed.confidenceFactors) {
      processed.confidenceFactors = {
        entityRecognition: 0.5,
        relationshipClarity: 0.5,
        ruleCompleteness: 0.5,
        ambiguityLevel: 0.5,
      };
    }

    // Build entity names mapping for relationships
    const entityNames = processed.entities.map(e => e?.name).filter(Boolean);

    // Process entities
    processed.entities = processed.entities.map(entity => {
      const processedEntity = {
        id: entity?.id && validateUUID(entity.id) ? entity.id : generateUUID(),
        name: entity?.name || 'UnknownEntity',
        type: entity?.type || 'model',
        attributes: entity?.attributes || [],
        description:
          entity?.description && entity.description.length >= 10
            ? entity.description
            : `This ${entity?.name || 'Unknown'} entity manages core business data and operations within the system`,
        complexity: entity?.complexity || 'simple',
      };

      // Fix type if invalid
      const validTypes = [
        'model',
        'service',
        'controller',
        'view',
        'repository',
        'dto',
        'enum',
      ];
      if (!validTypes.includes(processedEntity.type)) {
        processedEntity.type = 'model';
      }

      // Fix complexity
      const validComplexity = ['simple', 'medium', 'complex'];
      if (!validComplexity.includes(processedEntity.complexity)) {
        processedEntity.complexity = 'simple';
      }

      // Process attributes
      processedEntity.attributes = processedEntity.attributes.map(attr => {
        // Fix attribute structure
        const processedAttr = {
          name: attr?.name || 'unnamedAttribute',
          type: attr?.type || 'string',
          required: typeof attr?.required === 'boolean' ? attr.required : true,
          description:
            attr?.description && attr.description.length >= 5
              ? attr.description
              : `The ${attr?.name || 'unnamed'} attribute stores important data`,
          validation: Array.isArray(attr?.validation)
            ? attr.validation
                .filter(v => v && typeof v === 'object')
                .map(v => ({
                  rule: v.rule || 'required',
                  message:
                    v.message || `${attr?.name || 'field'} validation rule`,
                  params: v.params || undefined,
                }))
            : [],
          constraints: attr?.constraints || undefined,
        };

        const validAttributeTypes = [
          'string',
          'number',
          'boolean',
          'date',
          'array',
          'object',
          'enum',
        ];
        if (!validAttributeTypes.includes(processedAttr.type)) {
          processedAttr.type = 'string';
        }

        return processedAttr;
      });

      return processedEntity;
    });

    // Process relationships - fix common AI field mapping errors
    processed.relationships = processed.relationships.map(rel => {
      const processedRel = { ...rel };

      // Fix UUID generation logic
      if (!processedRel.id || !validateUUID(processedRel.id)) {
        processedRel.id = generateUUID();
      }

      // Handle various AI field name variations
      if (rel?.sourceEntityId && !rel?.from) {
        processedRel.from = rel.sourceEntityId;
        delete processedRel.sourceEntityId;
      }
      if (rel?.targetEntityId && !rel?.to) {
        processedRel.to = rel.targetEntityId;
        delete processedRel.targetEntityId;
      }

      // Handle other variations
      if (!processedRel.from) {
        processedRel.from = rel?.source || entityNames[0] || 'UnknownEntity';
      }
      if (!processedRel.to) {
        processedRel.to = rel?.target || entityNames[1] || 'UnknownEntity2';
      }

      // Fix relationship type to valid enum values
      const validRelationshipTypes = [
        'one-to-one',
        'one-to-many',
        'many-to-many',
        'inheritance',
        'dependency',
        'aggregation',
      ];
      if (
        !processedRel.type ||
        !validRelationshipTypes.includes(processedRel.type)
      ) {
        processedRel.type = 'one-to-many'; // Default fallback
      }

      if (!processedRel.description || processedRel.description.length < 5) {
        processedRel.description = `Relationship between ${processedRel.from} and ${processedRel.to}`;
      }

      // Set defaults for optional fields
      if (!processedRel.bidirectional) {
        processedRel.bidirectional = false;
      }
      if (!processedRel.required) {
        processedRel.required = false;
      }

      return processedRel;
    });

    // Process business rules - fix structure
    processed.businessRules = processed.businessRules.map(rule => {
      const processedRule = {
        id: rule?.id && validateUUID(rule.id) ? rule.id : generateUUID(),
        rule:
          rule?.rule && rule.rule.length >= 10
            ? rule.rule
            : rule?.description && rule.description.length >= 10
              ? rule.description
              : 'This business rule specifies validation logic and constraints for the entity operations',
        entity: rule?.entity || entityNames[0] || 'UnknownEntity',
        priority: rule?.priority || 'medium',
        category: rule?.category || 'validation',
        conditions: rule?.conditions || undefined,
        actions: rule?.actions || undefined,
        errorMessage: rule?.errorMessage || undefined,
        compensatingAction: rule?.compensatingAction || undefined,
      };

      // Fix priority to valid enum
      const validPriorities = ['critical', 'high', 'medium', 'low'];
      if (!validPriorities.includes(processedRule.priority)) {
        processedRule.priority = 'medium';
      }

      // Fix category to valid enum
      const validCategories = [
        'validation',
        'business_logic',
        'security',
        'performance',
        'data_integrity',
      ];
      if (!validCategories.includes(processedRule.category)) {
        processedRule.category = 'validation';
      }

      return processedRule;
    });

    // Process clarification questions
    if (processed.clarificationNeeded) {
      processed.clarificationNeeded = processed.clarificationNeeded.map(q => {
        const processedQ = {
          id: q?.id && validateUUID(q.id) ? q.id : generateUUID(),
          question:
            q?.question && q.question.length >= 10
              ? q.question
              : 'Could you provide more specific details about this requirement?',
          context:
            q?.context && q.context.length >= 20
              ? q.context
              : 'Additional context and clarification is needed to better understand the specific requirements and implementation details',
          priority: q?.priority || 'medium',
          category: q?.category || 'functional',
          suggestedAnswers: q?.suggestedAnswers || undefined,
          whyImportant: q?.whyImportant || undefined,
          impact: q?.impact || undefined,
          dependencies: q?.dependencies || undefined,
        };

        // Fix priority to valid enum
        const validQuestionPriorities = ['high', 'medium', 'low'];
        if (!validQuestionPriorities.includes(processedQ.priority)) {
          processedQ.priority = 'medium';
        }

        // Fix category to valid enum
        const validQuestionCategories = [
          'functional',
          'technical',
          'business',
          'performance',
          'security',
          'ui_ux',
        ];
        if (!validQuestionCategories.includes(processedQ.category)) {
          processedQ.category = 'functional';
        }

        return processedQ;
      });
    }

    return processed;
  }

  /**
   * Build system prompt with domain context
   */
  private buildSystemPrompt(
    domain: string | null,
    domainContext: any,
    domainEntities: string[],
    domainRules: string[]
  ): string {
    let prompt = `You are a business analyst with 20 years of product experience, specializing in requirements analysis, business modeling, and system architecture.

Your task is to extract key business information from general customer requirements, including business entities, attributes, relationships, business rules, and points requiring clarification.

Please extract the following key business information:
1. Business entities and their attributes
2. Relationships between entities 
3. Business rules and constraints
4. Points requiring clarification

Your task is to analyze natural language requirements and EXACTLY follow the output format shown below.

**CRITICAL FORMAT REQUIREMENTS - FOLLOW EXACTLY:**

The output MUST be a JSON object with this EXACT structure:
{
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // UUID for this requirement set
  "originalText": "The original input text goes here",
  "entities": [
    {
      "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // UUID for this entity
      "name": "User",
      "type": "model",
      "attributes": [
        {
          "name": "userId",
          "type": "string", // MUST be lowercase: string, number, boolean, date, array, object, enum
          "required": true, // MUST be boolean: true or false
          "description": "User unique identifier",
          "validation": [], // MUST be array of validation rule objects
          "constraints": {} // Optional object
        }
      ],
      "description": "System user entity",
      "complexity": "simple" // MUST be: simple, medium, or complex
    }
  ],
  "relationships": [
    {
      "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // UUID for this relationship
      "from": "User", // Entity name (NOT ID!)
      "to": "Order", // Entity name (NOT ID!)
      "type": "one-to-many", // MUST be: one-to-one, one-to-many, many-to-many, inheritance, dependency, aggregation
      "description": "One user can have multiple orders"
    }
  ],
  "businessRules": [
    {
      "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // UUID for this rule
      "rule": "User email must be unique and valid format",
      "entity": "User", // Entity name (NOT ID!)
      "priority": "critical", // MUST be: critical, high, medium, or low
      "category": "validation" // MUST be: validation, business_logic, security, performance, data_integrity
    }
  ],
  "clarificationNeeded": [
    {
      "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // UUID for this question
      "question": "What specific design requirements?",
      "context": "More details about UI design needed",
      "priority": "high", // MUST be: high, medium, or low
      "category": "functional" // MUST be: functional, technical, business, performance, security, ui_ux
    }
  ],
  "confidence": 0.85, // Number between 0 and 1
  "confidenceFactors": {
    "entityRecognition": 0.9, // Number between 0 and 1
    "relationshipClarity": 0.8,
    "ruleCompleteness": 0.7,
    "ambiguityLevel": 0.6
  },
  "domain": "user_management", // Optional domain name
  "complexity": "medium", // MUST be: simple, medium, complex, or highly_complex
  "estimatedEffort": "weeks", // Optional: days, weeks, or months
  "tags": ["authentication", "user-management"], // Optional tags
  "metadata": {
    "parsingTime": 1234, // Optional parsing time in milliseconds
    "retryCount": 0, // Optional retry count
    "modelUsed": "Qwen3-Coder-30B" // Optional model name
  }
}

**REQUIRED FIELD VALUES - USE EXACTLY THESE:**
- entity.type: model, service, controller, view, repository, dto, enum
- attribute.type: string, number, boolean, date, array, object, enum (all lowercase)
- relationship.type: one-to-one, one-to-many, many-to-many, inheritance, dependency, aggregation
- businessRule.priority: critical, high, medium, low
- businessRule.category: validation, business_logic, security, performance, data_integrity
- entity.complexity: simple, medium, complex
- overall.complexity: simple, medium, complex, highly_complex
- Boolean fields: MUST be true or false, NOT string or undefined

**MANDATORY RULES:**
- Generate valid UUIDs for ALL id fields (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
- Entity description: minimum 10 characters
- Attribute description: minimum 5 characters
- Business rule text: minimum 10 characters
- Relationship description: minimum 5 characters
- NO required field can be undefined or missing
- Use entity NAMES (not IDs) in relationships and business rules
- required field must be boolean: true or false
- validation field must be array (empty if no validation)
`;

    if (domain && domainContext) {
      prompt += `\n**${domain.toUpperCase()} Domain Context:**
- Common entities: ${domainEntities.join(', ')}
- Domain-specific rules:
${domainRules.map(rule => `  - ${rule}`).join('\n')}

**Use your knowledge of ${domain} systems to:**
- Identify standard entities that might be missing
- Suggest relevant business rules
- Recognize common patterns in this domain
- Flag domain-specific requirements that need clarification

`;
    }

    prompt += `**Confidence Assessment:**
- Only include entities you're confident about
- Flag unclear requirements for clarification
- Provide specific reasons why clarification is needed
- Suggest concrete examples where helpful

**FAILURE HANDLING:**
If you cannot generate valid output, still provide ALL required fields with reasonable default values rather than leaving them undefined.

Always prioritize accuracy over completeness. It's better to ask for clarification than to make incorrect assumptions.`;

    return prompt;
  }

  /**
   * Build user prompt with contextual information
   */
  private buildUserPrompt(text: string, domain: string | null): string {
    let prompt = `Please analyze the following requirements and output EXACTLY the JSON structure I specified in system prompt.

**INPUT TEXT:**
"${text}"

**CRITICAL FORMAT VERIFICATION CHECKLIST:**
BEFORE YOU GENERATE, VERIFY YOU HAVE:
✓ Generated proper UUIDs: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
✓ Use EXACTLY: relationships[].from = "EntityName", relationships[].to = "EntityName"
✓ Use EXACTLY: businessRules[].rule = "Rule description", businessRules[].entity = "EntityName"
✓ NO field names like 'sourceEntityId' or 'targetEntityId'
✓ NO field names like 'ruleDescription' instead of 'rule'
✓ All required string fields have minimum character lengths
✓ All enum values use EXACT lowercase strings from my examples

**REQUIRED FIELD VALIDATIONS - DOUBLE CHECK:**
- relationships: [{"id": "uuid", "from": "EntityName", "to": "EntityName", "type": "one-to-many", "description": "text"}]
- businessRules: [{"id": "uuid", "rule": "description text", "entity": "EntityName", "priority": "high|medium|low", "category": "validation|business_logic|security|performance|data_integrity"}]
- entities: [{"id": "uuid", "name": "EntityName", "type": "model", "complexity": "simple|medium|complex", "description": "text >=10 chars"}]
- attributes: [{"name": "attributeName", "type": "string", "required": true, "description": "text >=5 chars", "validation": []}]

Generate the complete JSON NOW:`;

    if (this.context?.previousRequirements?.length) {
      prompt += `**Previous Requirements Context:**
${this.context.previousRequirements.map(req => `- ${req}`).join('\n')}

`;
    }

    if (this.context?.userAnswers) {
      prompt += `**Previous User Answers:**
${Object.entries(this.context.userAnswers)
  .map(([question, answer]) => `- Q: ${question}\n  A: ${answer}`)
  .join('\n')}

`;
    }

    if (domain) {
      prompt += `**Detected Domain:** ${domain}\n\n`;
    }

    prompt += `**Extraction Requirements:**
1. Identify all business entities mentioned or clearly implied
2. Define attributes for each entity with proper types and validation
3. Specify relationships between entities with correct cardinality
4. Extract business rules, constraints, and validation logic
5. Flag any ambiguous, unclear, or missing requirements
6. Suggest reasonable interpretations where appropriate, but flag them for verification

**Quality Checks:**
- Ensure all entity names follow proper naming conventions (singular, uppercase)
- Verify that relationships make logical sense
- Check that business rules are specific and implementable (minimum 10 characters)
- Identify conflicting requirements
- Flag requirements that need technical decision making

**DO NOT:**
- Leave any required fields undefined or missing
- Use capitalized data types like 'String', 'Integer', 'Boolean'
- Use validation as string instead of array
- Skip description fields

Provide detailed analysis with high confidence threshold. All fields must be properly formatted according to the schema.`;

    return prompt;
  }

  /**
   * Validate parsed requirements
   */
  private async validateParsedRequirements(
    parsed: ParsedRequirement
  ): Promise<{ valid: boolean; errors: any[] }> {
    const errors: any[] = [];

    try {
      // Validate against schema
      ParsedRequirementSchema.parse(parsed);

      // Additional business logic validation
      if (parsed.entities.length === 0) {
        errors.push({
          field: 'entities',
          message: 'At least one entity must be identified',
        });
      }

      // Check for duplicate entity names
      const entityNames = parsed.entities.map(e => e.name);
      const duplicates = entityNames.filter(
        (name, index) => entityNames.indexOf(name) !== index
      );
      if (duplicates.length > 0) {
        errors.push({
          field: 'entities',
          message: `Duplicate entity names found: ${duplicates.join(', ')}`,
        });
      }

      // Validate relationships
      for (const rel of parsed.relationships) {
        const fromExists = parsed.entities.some(e => e.name === rel.from);
        const toExists = parsed.entities.some(e => e.name === rel.to);

        if (!fromExists) {
          errors.push({
            field: 'relationships',
            message: `Relationship references non-existent entity: ${rel.from}`,
          });
        }
        if (!toExists) {
          errors.push({
            field: 'relationships',
            message: `Relationship references non-existent entity: ${rel.to}`,
          });
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (schemaError) {
      return {
        valid: false,
        errors: [schemaError],
      };
    }
  }

  /**
   * Generate additional clarification questions if needed
   */
  /**
   * 根据需求文档进行业务建模
   * @param requirementDocument 完整的需求文档
   * @returns 结构化的业务模型
   */
  async parseFromDocument(
    requirementDocument: string
  ): Promise<RequirementsParsingResult> {
    try {
      console.log('开始根据需求文档进行业务建模', {
        documentLength: requirementDocument.length,
      });

      // 检测业务领域
      const domain = this.context?.domain || matchDomain(requirementDocument);

      // 获取领域特定上下文
      const domainContext = domain ? DOMAIN_KNOWLEDGE_BASE[domain] : null;
      const domainEntities = domain ? getDomainEntities(domain) : [];
      const domainRules = domain ? getDomainBusinessRules(domain) : [];

      // 生成结构化业务模型
      const parsedResult = await this.generateStructuredRequirements(
        requirementDocument,
        domain,
        domainContext,
        domainEntities,
        domainRules
      );

      // 后处理确保模式合规
      const processedResult = this.postProcessRequirement(
        parsedResult,
        requirementDocument
      );

      // 验证解析结果
      const validation = await this.validateParsedRequirements(processedResult);
      if (!validation.valid) {
        return {
          success: false,
          error: '业务建模验证失败',
          validationErrors: validation.errors,
          retryable: true,
          suggestion:
            '需求文档可能缺少关键信息，请检查功能需求和业务规则的完整性',
        };
      }

      // 计算置信度
      let confidenceScore = 0.8; // 基于完整需求文档的基础置信度
      if (this.includeConfidenceAnalysis) {
        const scorer = new ConfidenceScorer();
        confidenceScore = await scorer.calculateConfidence(
          processedResult,
          requirementDocument
        );
        processedResult.confidence = confidenceScore;
      }

      console.log('业务建模完成', {
        entityCount: processedResult.entities?.length || 0,
        relationshipCount: processedResult.relationships?.length || 0,
        businessRuleCount: processedResult.businessRules?.length || 0,
        confidence: Math.round(confidenceScore * 100),
      });

      return {
        success: true,
        data: processedResult,
      };
    } catch (error) {
      console.error('业务建模过程中出错:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '业务建模失败',
        retryable: true,
      };
    }
  }
}

// 便捷函数导出 - 支持传统文本解析和新的文档建模
export async function parseRequirements(
  text: string,
  options?: ParseRequirementsOptions
): Promise<RequirementsParsingResult> {
  const parser = new RequirementsParserAgent(options);
  return parser.parse(text);
}

export async function parseRequirementsFromDocument(
  requirementDocument: string,
  options?: ParseRequirementsOptions
): Promise<RequirementsParsingResult> {
  const parser = new RequirementsParserAgent(options);
  return parser.parseFromDocument(requirementDocument);
}
