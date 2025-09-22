/**
 * @Description 业务建模Agent - 专注需求文档到业务模型的转换
 * @Author Qoder AI
 * @Date 2025-09-22
 */

import { generateObject, generateText } from 'ai';
import { llmProvider } from '#server/utils/model';
import crypto from 'crypto';
import type { AvailableModelNames } from '#shared/types/model';
import type {
  RequirementDocument,
  ValidationError,
} from '#shared/types/requirement';
import type {
  BusinessModel,
  ModelingOptions,
  BusinessModelingResult,
  ValidationResult,
  OptimizationSuggestion,
} from '#shared/types/business-model';
import {
  BusinessModelSchema,
  ValidationResultSchema,
} from '#shared/types/business-model';
import {
  ParsedRequirementSchema,
  type BusinessEntity,
  type EntityRelationship,
  type BusinessRule,
} from '#server/core/agents/requirements-parser/types';
import { ConfidenceScorer } from '#server/core/agents/requirements-parser/confidence-scorer';

export class BusinessModelingAgent {
  private model: AvailableModelNames;
  private temperature: number;
  private maxRetries: number;

  constructor(
    options: {
      model?: AvailableModelNames;
      temperature?: number;
      maxRetries?: number;
    } = {}
  ) {
    this.model = options.model || 'DeepSeek-Chat';
    this.temperature = options.temperature || 0.2; // 建模需要更精确的结果
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * 从需求文档解析业务模型
   */
  async parseBusinessModel(
    document: RequirementDocument,
    options: ModelingOptions = {}
  ): Promise<BusinessModelingResult> {
    const startTime = Date.now();

    try {
      // 预处理文档
      const preprocessedDoc = this.preprocessDocument(document);

      // 生成业务模型
      const businessModel = await this.generateBusinessModel(
        preprocessedDoc,
        options
      );

      // 验证模型
      const validationResult = await this.validateModel(businessModel);

      // 计算置信度
      let confidence;
      if (options.includeConfidenceAnalysis) {
        confidence = this.calculateModelConfidence(businessModel, document);
      }

      // 优化模型
      const optimizedModel = options.optimizeForPerformance
        ? await this.optimizeModel(businessModel)
        : businessModel;

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        businessModel: {
          ...optimizedModel,
          metadata: {
            ...optimizedModel.metadata,
            processingTime,
          },
        },
        confidence,
        validationErrors: validationResult.errors.filter(
          e => e.severity === 'error'
        ),
        suggestions: this.generateSuggestions(validationResult, businessModel),
        processingTime,
        metadata: {
          entitiesGenerated: optimizedModel.entities.length,
          relationshipsGenerated: optimizedModel.relationships.length,
          businessRulesGenerated: optimizedModel.businessRules.length,
          complexityLevel: optimizedModel.complexity,
          domainMatched: !!document.domain,
        },
      };
    } catch (error) {
      console.error('Business modeling error:', error);
      return {
        success: false,
        suggestions: ['请确保需求文档格式正确且内容完整'],
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 验证业务模型一致性
   */
  async validateModel(model: BusinessModel): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 实体验证
    const entityValidation = this.validateEntities(model.entities);
    errors.push(...entityValidation.errors);
    warnings.push(...entityValidation.warnings);

    // 关系验证
    const relationshipValidation = this.validateRelationships(
      model.relationships,
      model.entities
    );
    errors.push(...relationshipValidation.errors);
    warnings.push(...relationshipValidation.warnings);

    // 业务规则验证
    const ruleValidation = this.validateBusinessRules(
      model.businessRules,
      model.entities
    );
    errors.push(...ruleValidation.errors);
    warnings.push(...ruleValidation.warnings);

    // 一致性检查
    const consistencyValidation = this.validateConsistency(model);
    errors.push(...consistencyValidation.errors);
    warnings.push(...consistencyValidation.warnings);

    const valid = errors.filter(e => e.severity === 'error').length === 0;
    const score = this.calculateValidationScore(errors, warnings, model);

    return {
      valid,
      errors,
      warnings,
      suggestions: this.generateValidationSuggestions(errors, warnings),
      score,
      details: {
        entityValidation: {
          valid: entityValidation.errors.length === 0,
          issues: entityValidation.errors.map(e => e.message),
        },
        relationshipValidation: {
          valid: relationshipValidation.errors.length === 0,
          issues: relationshipValidation.errors.map(e => e.message),
        },
        businessRuleValidation: {
          valid: ruleValidation.errors.length === 0,
          issues: ruleValidation.errors.map(e => e.message),
        },
        consistencyCheck: {
          valid: consistencyValidation.errors.length === 0,
          issues: consistencyValidation.errors.map(e => e.message),
        },
      },
    };
  }

  /**
   * 优化业务模型结构
   */
  async optimizeModel(model: BusinessModel): Promise<BusinessModel> {
    // 实体优化
    const optimizedEntities = this.optimizeEntities(model.entities);

    // 关系优化
    const optimizedRelationships = this.optimizeRelationships(
      model.relationships
    );

    // 规则优化
    const optimizedRules = this.optimizeBusinessRules(model.businessRules);

    return {
      ...model,
      entities: optimizedEntities,
      relationships: optimizedRelationships,
      businessRules: optimizedRules,
      metadata: {
        ...model.metadata,
        optimizationSuggestions:
          await this.generateOptimizationSuggestions(model),
      },
    };
  }

  /**
   * 预处理需求文档
   */
  private preprocessDocument(
    document: RequirementDocument
  ): RequirementDocument {
    // 合并相似的功能需求
    const mergedFunctionalReqs = this.mergeSimilarRequirements(
      document.functionalRequirements
    );

    // 提取隐含的业务规则
    const extractedRules = this.extractImplicitBusinessRules(document);

    return {
      ...document,
      functionalRequirements: mergedFunctionalReqs,
      businessConstraints: [...document.businessConstraints, ...extractedRules],
    };
  }

  /**
   * 生成业务模型
   */
  private async generateBusinessModel(
    document: RequirementDocument,
    options: ModelingOptions
  ): Promise<BusinessModel> {
    const systemPrompt = this.buildModelingSystemPrompt(
      document.domain,
      options
    );
    const userPrompt = this.buildModelingUserPrompt(document, options);

    try {
      // 使用结构化生成
      const { object } = await generateObject({
        model: llmProvider(this.model),
        temperature: this.temperature,
        system: systemPrompt,
        prompt: userPrompt,
        schema: ParsedRequirementSchema,
        maxRetries: this.maxRetries,
      });

      // 转换为业务模型格式
      return this.transformToBusinessModel(object, document, options);
    } catch (error) {
      console.warn('Structured generation failed, trying text mode:', error);

      // 降级到文本生成
      const { text } = await generateText({
        model: llmProvider(this.model),
        temperature: this.temperature,
        system: systemPrompt,
        prompt: userPrompt + '\n\n请输出JSON格式的业务模型。',
      });

      return this.parseTextToBusinessModel(text, document, options);
    }
  }

  /**
   * 构建建模系统提示
   */
  private buildModelingSystemPrompt(
    domain: string,
    options: ModelingOptions
  ): string {
    let prompt = `你是一个资深的系统架构师和业务分析师，专门从需求文档中提取业务模型。

**核心任务**: 将完整的需求说明文档转换为结构化的业务模型，包括：
1. 业务实体及其属性
2. 实体间的关系
3. 业务规则和约束
4. 架构建议

**建模原则**:
1. 实体设计遵循单一职责原则
2. 关系设计考虑数据一致性
3. 业务规则确保可执行性
4. 架构支持扩展性和维护性

**质量要求**:
- 实体命名清晰、一致
- 属性类型准确、验证完整
- 关系合理、避免循环依赖
- 规则具体、可测试`;

    if (domain) {
      prompt += `\n\n**领域专业知识**: 应用${domain}领域的最佳实践和标准模式。`;
    }

    if (options.architecturePattern) {
      prompt += `\n\n**架构模式**: 采用${options.architecturePattern}架构模式进行设计。`;
    }

    return prompt;
  }

  /**
   * 构建建模用户提示
   */
  private buildModelingUserPrompt(
    document: RequirementDocument,
    options: ModelingOptions
  ): string {
    const functionalReqs = document.functionalRequirements
      .map(req => `- ${req.title}: ${req.description}`)
      .join('\n');

    const nonFunctionalReqs = document.nonFunctionalRequirements
      .map(req => `- ${req.type}: ${req.description}`)
      .join('\n');

    const constraints = document.businessConstraints
      .map(constraint => `- ${constraint.type}: ${constraint.description}`)
      .join('\n');

    const scenarios = document.userScenarios
      .map(scenario => `- ${scenario.title}: ${scenario.description}`)
      .join('\n');

    return `请基于以下需求文档生成完整的业务模型:

**项目概述**:
- 标题: ${document.title}
- 描述: ${document.description}
- 领域: ${document.domain}

**功能需求**:
${functionalReqs}

**非功能需求**:
${nonFunctionalReqs}

**业务约束**:
${constraints}

**用户场景**:
${scenarios}

**术语表**:
${document.glossary.map(item => `- ${item.term}: ${item.definition}`).join('\n')}

**建模要求**:
1. 识别5-10个核心业务实体
2. 定义清晰的实体属性和验证规则
3. 建立合理的实体关系
4. 提取可执行的业务规则
5. 评估模型复杂度: ${options.targetComplexity || 'medium'}

请输出符合ParsedRequirement格式的JSON对象。`;
  }

  /**
   * 转换为业务模型
   */
  private transformToBusinessModel(
    parsedReq: any,
    document: RequirementDocument,
    options: ModelingOptions
  ): BusinessModel {
    const now = new Date();

    return {
      id: crypto.randomUUID(),
      sourceDocumentId: document.id,
      entities: parsedReq.entities || [],
      relationships: parsedReq.relationships || [],
      businessRules: parsedReq.businessRules || [],
      domain: document.domain,
      complexity: parsedReq.complexity || 'medium',
      confidence: parsedReq.confidence || 0.8,
      confidenceFactors: parsedReq.confidenceFactors || {
        entityRecognition: 0.8,
        relationshipClarity: 0.8,
        ruleCompleteness: 0.8,
        ambiguityLevel: 0.8,
      },
      validationStatus: 'valid',
      validationMessages: [],
      architecture: {
        pattern: options.architecturePattern,
        components: this.extractComponents(parsedReq.entities),
        technologies: [],
      },
      metadata: {
        createdAt: now,
        modelUsed: this.model,
        version: '1.0.0',
      },
    };
  }

  /**
   * 解析文本为业务模型
   */
  private parseTextToBusinessModel(
    text: string,
    document: RequirementDocument,
    options: ModelingOptions
  ): BusinessModel {
    // 尝试从文本中解析JSON
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.transformToBusinessModel(parsed, document, options);
      }
    } catch (error) {
      console.warn('Failed to parse JSON from text:', error);
    }

    // 降级：创建基本模型
    return this.createFallbackModel(document, options);
  }

  /**
   * 创建降级模型
   */
  private createFallbackModel(
    document: RequirementDocument,
    options: ModelingOptions
  ): BusinessModel {
    const now = new Date();

    // 从功能需求中提取基本实体
    const entities: BusinessEntity[] = document.functionalRequirements
      .slice(0, 5)
      .map((req, index) => ({
        id: crypto.randomUUID(),
        name: `Entity${index + 1}`,
        type: 'model' as const,
        attributes: [
          {
            name: 'id',
            type: 'string' as const,
            required: true,
            description: 'Unique identifier',
            validation: [],
          },
        ],
        description: req.description,
        complexity: 'simple' as const,
      }));

    return {
      id: crypto.randomUUID(),
      sourceDocumentId: document.id,
      entities,
      relationships: [],
      businessRules: [],
      domain: document.domain,
      complexity: 'simple',
      confidence: 0.3,
      confidenceFactors: {
        entityRecognition: 0.3,
        relationshipClarity: 0.3,
        ruleCompleteness: 0.3,
        ambiguityLevel: 0.7,
      },
      validationStatus: 'warning',
      validationMessages: ['模型生成失败，使用基本降级模型'],
      metadata: {
        createdAt: now,
        modelUsed: this.model,
        version: '1.0.0',
      },
    };
  }

  /**
   * 验证实体
   */
  private validateEntities(entities: BusinessEntity[]): {
    errors: ValidationError[];
    warnings: ValidationError[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    entities.forEach(entity => {
      // 检查实体名称
      if (!entity.name || entity.name.length < 2) {
        errors.push({
          field: `entity.${entity.id}.name`,
          message: '实体名称不能为空且至少2个字符',
          severity: 'error',
        });
      }

      // 检查属性
      if (!entity.attributes || entity.attributes.length === 0) {
        warnings.push({
          field: `entity.${entity.id}.attributes`,
          message: '实体应该至少有一个属性',
          severity: 'warning',
        });
      }

      // 检查描述
      if (!entity.description || entity.description.length < 10) {
        warnings.push({
          field: `entity.${entity.id}.description`,
          message: '实体描述应该更详细',
          severity: 'warning',
        });
      }
    });

    return { errors, warnings };
  }

  /**
   * 验证关系
   */
  private validateRelationships(
    relationships: EntityRelationship[],
    entities: BusinessEntity[]
  ): { errors: ValidationError[]; warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const entityNames = entities.map(e => e.name);

    relationships.forEach(rel => {
      // 检查关系的实体是否存在
      if (!entityNames.includes(rel.from)) {
        errors.push({
          field: `relationship.${rel.id}.from`,
          message: `关系引用了不存在的实体: ${rel.from}`,
          severity: 'error',
        });
      }

      if (!entityNames.includes(rel.to)) {
        errors.push({
          field: `relationship.${rel.id}.to`,
          message: `关系引用了不存在的实体: ${rel.to}`,
          severity: 'error',
        });
      }

      // 检查自引用关系
      if (rel.from === rel.to) {
        warnings.push({
          field: `relationship.${rel.id}`,
          message: '检测到自引用关系，请确认是否必要',
          severity: 'warning',
        });
      }
    });

    return { errors, warnings };
  }

  /**
   * 验证业务规则
   */
  private validateBusinessRules(
    rules: BusinessRule[],
    entities: BusinessEntity[]
  ): { errors: ValidationError[]; warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const entityNames = entities.map(e => e.name);

    rules.forEach(rule => {
      // 检查规则关联的实体是否存在
      if (rule.entity && !entityNames.includes(rule.entity)) {
        errors.push({
          field: `businessRule.${rule.id}.entity`,
          message: `业务规则引用了不存在的实体: ${rule.entity}`,
          severity: 'error',
        });
      }

      // 检查规则描述
      if (!rule.rule || rule.rule.length < 10) {
        warnings.push({
          field: `businessRule.${rule.id}.rule`,
          message: '业务规则描述应该更详细和具体',
          severity: 'warning',
        });
      }
    });

    return { errors, warnings };
  }

  /**
   * 验证一致性
   */
  private validateConsistency(model: BusinessModel): {
    errors: ValidationError[];
    warnings: ValidationError[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 检查孤立实体
    const connectedEntities = new Set();
    model.relationships.forEach(rel => {
      connectedEntities.add(rel.from);
      connectedEntities.add(rel.to);
    });

    model.entities.forEach(entity => {
      if (!connectedEntities.has(entity.name) && model.entities.length > 1) {
        warnings.push({
          field: `entity.${entity.id}`,
          message: `实体 ${entity.name} 没有与其他实体建立关系`,
          severity: 'warning',
        });
      }
    });

    return { errors, warnings };
  }

  /**
   * 计算验证分数
   */
  private calculateValidationScore(
    errors: ValidationError[],
    warnings: ValidationError[],
    model: BusinessModel
  ): number {
    const errorCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = warnings.filter(e => e.severity === 'warning').length;
    const totalElements =
      model.entities.length +
      model.relationships.length +
      model.businessRules.length;

    if (totalElements === 0) return 0;

    const errorPenalty = errorCount * 0.2;
    const warningPenalty = warningCount * 0.05;
    const totalPenalty = Math.min(errorPenalty + warningPenalty, 1);

    return Math.max(1 - totalPenalty, 0);
  }

  /**
   * 生成验证建议
   */
  private generateValidationSuggestions(
    errors: ValidationError[],
    warnings: ValidationError[]
  ): string[] {
    const suggestions: string[] = [];

    if (errors.length > 0) {
      suggestions.push('请修复模型中的错误后重新验证');
    }

    if (warnings.length > 0) {
      suggestions.push('建议完善模型描述以提高质量');
    }

    if (errors.length === 0 && warnings.length === 0) {
      suggestions.push('模型验证通过，可以进行下一步开发');
    }

    return suggestions;
  }

  /**
   * 计算模型置信度
   */
  private calculateModelConfidence(
    model: BusinessModel,
    document: RequirementDocument
  ): any {
    // 使用现有的置信度计算逻辑
    return ConfidenceScorer.calculateConfidence(
      document.description,
      model.entities,
      model.relationships,
      model.businessRules,
      [], // 不再需要澄清问题
      document.domain
    );
  }

  /**
   * 生成建议
   */
  private generateSuggestions(
    validation: ValidationResult,
    model: BusinessModel
  ): string[] {
    const suggestions: string[] = [];

    if (validation.score < 0.7) {
      suggestions.push('建议优化模型结构以提高质量');
    }

    if (model.entities.length < 3) {
      suggestions.push('考虑增加更多业务实体以完善模型');
    }

    if (model.relationships.length < model.entities.length) {
      suggestions.push('建议增加实体间的关系以提高模型完整性');
    }

    return suggestions;
  }

  /**
   * 合并相似需求
   */
  private mergeSimilarRequirements(requirements: any[]): any[] {
    // 简单的合并逻辑，实际应用中可以使用更复杂的算法
    return requirements;
  }

  /**
   * 提取隐含业务规则
   */
  private extractImplicitBusinessRules(document: RequirementDocument): any[] {
    // 从约束和场景中提取隐含规则
    return [];
  }

  /**
   * 提取组件
   */
  private extractComponents(entities: BusinessEntity[]): string[] {
    return entities.map(e => `${e.name}Component`);
  }

  /**
   * 优化实体
   */
  private optimizeEntities(entities: BusinessEntity[]): BusinessEntity[] {
    // 实体优化逻辑
    return entities;
  }

  /**
   * 优化关系
   */
  private optimizeRelationships(
    relationships: EntityRelationship[]
  ): EntityRelationship[] {
    // 关系优化逻辑
    return relationships;
  }

  /**
   * 优化业务规则
   */
  private optimizeBusinessRules(rules: BusinessRule[]): BusinessRule[] {
    // 规则优化逻辑
    return rules;
  }

  /**
   * 生成优化建议
   */
  private async generateOptimizationSuggestions(
    model: BusinessModel
  ): Promise<string[]> {
    return ['考虑应用设计模式优化模型结构'];
  }
}
