/**
 * @Description 业务建模组合式函数
 * @Author Qoder AI
 * @Date 2025-09-22
 */

import { ref, computed } from 'vue';
import type {
  RequirementDocument,
  ValidationError,
} from '#shared/types/requirement';
import type {
  BusinessModel,
  BusinessModelingRequest,
  BusinessModelingResponse,
  ModelingOptions,
  ValidationResult,
} from '#shared/types/business-model';
import type { AvailableModelNames } from '#shared/types/model';

export interface BusinessModelingHookOptions {
  /** 使用的模型 */
  model?: AvailableModelNames;
  /** API端点 */
  apiEndpoint?: string;
  /** 自动验证 */
  autoValidate?: boolean;
}

export const useBusinessModeling = (
  options: BusinessModelingHookOptions = {}
) => {
  // 基础状态
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 建模结果
  const businessModel = ref<BusinessModel | null>(null);
  const validationErrors = ref<ValidationError[]>([]);
  const suggestions = ref<string[]>([]);
  const confidence = ref<number>(0);
  const processingTime = ref<number>(0);

  // 建模统计信息
  const metadata = ref<{
    entitiesGenerated: number;
    relationshipsGenerated: number;
    businessRulesGenerated: number;
    complexityLevel: string;
    domainMatched: boolean;
  } | null>(null);

  // 计算属性
  const isModelValid = computed(
    () =>
      businessModel.value?.validationStatus === 'valid' &&
      validationErrors.value.filter(e => e.severity === 'error').length === 0
  );

  const hasWarnings = computed(() =>
    validationErrors.value.some(e => e.severity === 'warning')
  );

  const modelComplexity = computed(
    () => businessModel.value?.complexity || 'unknown'
  );

  const confidenceLevel = computed(() => {
    if (confidence.value >= 0.8) return 'high';
    if (confidence.value >= 0.6) return 'medium';
    return 'low';
  });

  /**
   * 从需求文档生成业务模型
   */
  const generateBusinessModel = async (
    document: RequirementDocument,
    modelingOptions: Partial<ModelingOptions> = {}
  ): Promise<BusinessModel | null> => {
    if (!document) {
      error.value = '需求文档不能为空';
      return null;
    }

    loading.value = true;
    error.value = null;

    const startTime = Date.now();

    try {
      // 构建请求
      const request: BusinessModelingRequest = {
        requirementDocument: document,
        options: {
          model: options.model,
          includeConfidenceAnalysis: true,
          validationLevel: 'basic',
          ...modelingOptions,
        },
      };

      console.log('开始业务建模:', {
        documentId: document.id,
        documentTitle: document.title,
        domain: document.domain,
        options: request.options,
      });

      // 发送请求
      const response = await fetch(
        options.apiEndpoint || '/api/requirements/modeling',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API请求失败: ${response.status}`);
      }

      const result: BusinessModelingResponse = await response.json();

      // 处理结果
      if (result.success && result.businessModel) {
        businessModel.value = result.businessModel;
        confidence.value = result.businessModel.confidence;
        validationErrors.value = result.validationErrors || [];
        suggestions.value = result.suggestions || [];

        // 更新统计信息
        if (result.metadata) {
          metadata.value = result.metadata;
        }

        console.log('业务建模成功:', {
          modelId: result.businessModel.id,
          entitiesCount: result.businessModel.entities.length,
          relationshipsCount: result.businessModel.relationships.length,
          businessRulesCount: result.businessModel.businessRules.length,
          confidence: result.businessModel.confidence,
          validationStatus: result.businessModel.validationStatus,
        });

        return result.businessModel;
      } else {
        error.value = result.suggestions?.join('; ') || '业务建模失败';
        validationErrors.value = result.validationErrors || [];
        suggestions.value = result.suggestions || [];

        console.warn('业务建模失败:', {
          error: error.value,
          validationErrors: validationErrors.value,
          suggestions: suggestions.value,
        });

        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '业务建模失败';
      error.value = errorMessage;

      console.error('业务建模异常:', err);
      return null;
    } finally {
      processingTime.value = Date.now() - startTime;
      loading.value = false;
    }
  };

  /**
   * 验证业务模型
   */
  const validateModel = async (
    model?: BusinessModel
  ): Promise<ValidationResult | null> => {
    const targetModel = model || businessModel.value;
    if (!targetModel) {
      error.value = '没有可验证的业务模型';
      return null;
    }

    try {
      // 本地基础验证
      const localValidation = performLocalValidation(targetModel);

      // 可以扩展为调用远程验证API
      // const remoteValidation = await callRemoteValidation(targetModel);

      return localValidation;
    } catch (err) {
      console.error('模型验证失败:', err);
      return null;
    }
  };

  /**
   * 本地模型验证
   */
  const performLocalValidation = (model: BusinessModel): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 实体验证
    if (model.entities.length === 0) {
      errors.push({
        field: 'entities',
        message: '模型至少需要一个业务实体',
        severity: 'error',
      });
    }

    // 检查实体名称重复
    const entityNames = model.entities.map(e => e.name);
    const duplicateNames = entityNames.filter(
      (name, index) => entityNames.indexOf(name) !== index
    );

    if (duplicateNames.length > 0) {
      errors.push({
        field: 'entities',
        message: `实体名称重复: ${duplicateNames.join(', ')}`,
        severity: 'error',
      });
    }

    // 关系验证
    model.relationships.forEach((rel, index) => {
      const fromExists = entityNames.includes(rel.from);
      const toExists = entityNames.includes(rel.to);

      if (!fromExists) {
        errors.push({
          field: `relationships[${index}].from`,
          message: `关系引用了不存在的实体: ${rel.from}`,
          severity: 'error',
        });
      }

      if (!toExists) {
        errors.push({
          field: `relationships[${index}].to`,
          message: `关系引用了不存在的实体: ${rel.to}`,
          severity: 'error',
        });
      }

      if (rel.from === rel.to) {
        warnings.push({
          field: `relationships[${index}]`,
          message: '检测到自引用关系，请确认是否必要',
          severity: 'warning',
        });
      }
    });

    // 业务规则验证
    model.businessRules.forEach((rule, index) => {
      if (rule.entity && !entityNames.includes(rule.entity)) {
        errors.push({
          field: `businessRules[${index}].entity`,
          message: `业务规则引用了不存在的实体: ${rule.entity}`,
          severity: 'error',
        });
      }

      if (!rule.rule || rule.rule.length < 10) {
        warnings.push({
          field: `businessRules[${index}].rule`,
          message: '业务规则描述过于简短',
          severity: 'warning',
        });
      }
    });

    // 计算验证分数
    const errorCount = errors.length;
    const warningCount = warnings.length;
    const totalElements =
      model.entities.length +
      model.relationships.length +
      model.businessRules.length;

    const errorPenalty = errorCount * 0.2;
    const warningPenalty = warningCount * 0.05;
    const score = Math.max(1 - errorPenalty - warningPenalty, 0);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: generateValidationSuggestions(errors, warnings),
      score,
    };
  };

  /**
   * 生成验证建议
   */
  const generateValidationSuggestions = (
    errors: ValidationError[],
    warnings: ValidationError[]
  ): string[] => {
    const suggestions: string[] = [];

    if (errors.length > 0) {
      suggestions.push('请修复模型中的错误后重新验证');

      if (errors.some(e => e.field === 'entities')) {
        suggestions.push('建议检查实体定义的完整性和唯一性');
      }

      if (errors.some(e => e.field?.includes('relationships'))) {
        suggestions.push('建议检查实体关系的正确性');
      }

      if (errors.some(e => e.field?.includes('businessRules'))) {
        suggestions.push('建议检查业务规则的关联实体');
      }
    }

    if (warnings.length > 0) {
      suggestions.push('建议完善模型描述以提高质量');
    }

    if (errors.length === 0 && warnings.length === 0) {
      suggestions.push('模型验证通过，可以进行下一步开发');
    }

    return suggestions;
  };

  /**
   * 重置状态
   */
  const resetState = () => {
    businessModel.value = null;
    validationErrors.value = [];
    suggestions.value = [];
    confidence.value = 0;
    processingTime.value = 0;
    metadata.value = null;
    error.value = null;
  };

  /**
   * 导出业务模型
   */
  const exportModel = (format: 'json' | 'yaml' = 'json') => {
    if (!businessModel.value) {
      error.value = '没有可导出的业务模型';
      return null;
    }

    const exportData = {
      model: businessModel.value,
      metadata: metadata.value,
      validation: {
        isValid: isModelValid.value,
        errors: validationErrors.value,
        confidence: confidence.value,
        suggestions: suggestions.value,
      },
      exportTime: new Date().toISOString(),
      processingTime: processingTime.value,
    };

    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    } else {
      // 简单的YAML格式（实际项目中可以使用yaml库）
      return `# Business Model Export
# Generated at: ${exportData.exportTime}
# Processing time: ${exportData.processingTime}ms

model:
  id: ${exportData.model.id}
  domain: ${exportData.model.domain}
  complexity: ${exportData.model.complexity}
  confidence: ${exportData.model.confidence}
  
  entities: ${exportData.model.entities.length}
  relationships: ${exportData.model.relationships.length}
  businessRules: ${exportData.model.businessRules.length}

validation:
  isValid: ${exportData.validation.isValid}
  confidence: ${exportData.validation.confidence}
  errors: ${exportData.validation.errors.length}
  warnings: ${exportData.validation.errors.filter(e => e.severity === 'warning').length}`;
    }
  };

  /**
   * 获取模型统计信息
   */
  const getModelStats = () => {
    if (!businessModel.value) return null;

    return {
      overview: {
        entities: businessModel.value.entities.length,
        relationships: businessModel.value.relationships.length,
        businessRules: businessModel.value.businessRules.length,
        complexity: businessModel.value.complexity,
        confidence: businessModel.value.confidence,
        domain: businessModel.value.domain,
      },
      validation: {
        isValid: isModelValid.value,
        hasWarnings: hasWarnings.value,
        errorCount: validationErrors.value.filter(e => e.severity === 'error')
          .length,
        warningCount: validationErrors.value.filter(
          e => e.severity === 'warning'
        ).length,
      },
      quality: {
        confidenceLevel: confidenceLevel.value,
        validationStatus: businessModel.value.validationStatus,
        score: confidence.value,
      },
      processing: {
        processingTime: processingTime.value,
        modelUsed: businessModel.value.metadata.modelUsed,
        generatedAt: businessModel.value.metadata.createdAt,
      },
    };
  };

  return {
    // 状态
    loading: readonly(loading),
    error: readonly(error),

    // 结果
    businessModel: readonly(businessModel),
    validationErrors: readonly(validationErrors),
    suggestions: readonly(suggestions),
    confidence: readonly(confidence),
    processingTime: readonly(processingTime),
    metadata: readonly(metadata),

    // 计算属性
    isModelValid,
    hasWarnings,
    modelComplexity,
    confidenceLevel,

    // 方法
    generateBusinessModel,
    validateModel,
    resetState,
    exportModel,
    getModelStats,
  };
};
