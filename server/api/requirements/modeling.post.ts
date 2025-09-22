/**
 * @Description 业务建模API接口 - 将需求文档转换为业务模型
 * @Author Qoder AI
 * @Date 2025-09-22
 */

import type { H3Event } from 'h3';
import { BusinessModelingAgent } from '#server/core/agents/business-modeling';
import type {
  BusinessModelingRequest,
  BusinessModelingResponse,
} from '#shared/types/business-model';
import type { RequirementDocument } from '#shared/types/requirement';
import type { AvailableModelNames } from '#shared/types/model';

// 默认模型
const DEFAULT_MODEL: AvailableModelNames = 'DeepSeek-Chat';

export default defineEventHandler(
  async (event: H3Event): Promise<BusinessModelingResponse> => {
    const startTime = Date.now();

    try {
      const request = await readBody<BusinessModelingRequest>(event);

      // 验证请求参数
      if (!request.requirementDocument) {
        throw createError({
          statusCode: 400,
          statusMessage: '需求文档不能为空',
        });
      }

      // 验证需求文档基本字段
      const document = request.requirementDocument;
      if (!document.id || !document.title || !document.domain) {
        throw createError({
          statusCode: 400,
          statusMessage: '需求文档缺少必要字段 (id, title, domain)',
        });
      }

      // 验证文档内容完整性
      const hasContent =
        document.functionalRequirements.length > 0 ||
        document.userScenarios.length > 0 ||
        document.description.length > 50;

      if (!hasContent) {
        throw createError({
          statusCode: 400,
          statusMessage: '需求文档内容不足，无法进行业务建模',
        });
      }

      // 获取建模选项
      const options = {
        model: (request.options?.model as AvailableModelNames) || DEFAULT_MODEL,
        includeConfidenceAnalysis:
          request.options?.includeConfidenceAnalysis ?? true,
        validationLevel: request.options?.validationLevel || 'basic',
        targetComplexity: request.options?.targetComplexity,
        optimizeForPerformance: false,
        generateDocumentation: true,
      };

      // 日志记录
      console.log('Business modeling request:', {
        documentId: document.id,
        documentTitle: document.title,
        domain: document.domain,
        functionalRequirements: document.functionalRequirements.length,
        nonFunctionalRequirements: document.nonFunctionalRequirements.length,
        userScenarios: document.userScenarios.length,
        businessConstraints: document.businessConstraints.length,
        model: options.model,
        validationLevel: options.validationLevel,
        targetComplexity: options.targetComplexity,
      });

      // 创建业务建模Agent
      const modelingAgent = new BusinessModelingAgent({
        model: options.model,
        temperature: 0.2, // 建模需要更精确的结果
      });

      // 执行业务建模
      const modelingResult = await modelingAgent.parseBusinessModel(
        document,
        options
      );

      // 处理建模结果
      if (!modelingResult.success) {
        console.warn('Business modeling failed:', {
          documentId: document.id,
          suggestions: modelingResult.suggestions,
          processingTime: Date.now() - startTime,
        });

        return {
          success: false,
          validationErrors: [
            {
              field: 'modeling',
              message: '业务建模失败',
              severity: 'error',
            },
          ],
          suggestions: modelingResult.suggestions || [
            '请检查需求文档的完整性和准确性',
          ],
        };
      }

      // 成功日志
      console.log('Business modeling completed successfully:', {
        documentId: document.id,
        businessModelId: modelingResult.businessModel?.id,
        entitiesCount: modelingResult.businessModel?.entities.length,
        relationshipsCount: modelingResult.businessModel?.relationships.length,
        businessRulesCount: modelingResult.businessModel?.businessRules.length,
        confidence: modelingResult.businessModel?.confidence,
        validationStatus: modelingResult.businessModel?.validationStatus,
        processingTime: modelingResult.processingTime,
        totalTime: Date.now() - startTime,
      });

      // 构建响应
      const response: BusinessModelingResponse = {
        success: true,
        businessModel: modelingResult.businessModel,
        confidence: modelingResult.confidence,
        validationErrors: modelingResult.validationErrors,
        suggestions: modelingResult.suggestions,
      };

      return response;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      console.error('Business modeling API error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        processingTime,
      });

      // 处理不同类型的错误
      if (error && typeof error === 'object' && 'statusCode' in error) {
        throw error; // 重新抛出 HTTP 错误
      }

      // 处理其他错误
      const errorMessage =
        error instanceof Error ? error.message : '业务建模处理失败';

      return {
        success: false,
        validationErrors: [
          {
            field: 'system',
            message: errorMessage,
            severity: 'error',
          },
        ],
        suggestions: [
          '请检查需求文档格式是否正确',
          '确保文档包含足够的业务信息',
          '如果问题持续，请联系技术支持',
        ],
      };
    }
  }
);

/**
 * 验证需求文档格式和内容
 */
function validateRequirementDocument(document: RequirementDocument): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 必要字段检查
  if (!document.id) errors.push('文档ID缺失');
  if (!document.title || document.title.length < 5) errors.push('文档标题无效');
  if (!document.domain || document.domain.length < 2)
    errors.push('业务领域未指定');
  if (!document.description || document.description.length < 50)
    errors.push('文档描述过于简短');

  // 内容完整性检查
  if (document.functionalRequirements.length === 0) {
    warnings.push('没有功能需求，可能影响建模质量');
  }

  if (document.userScenarios.length === 0) {
    warnings.push('没有用户场景，建议添加以提高模型准确性');
  }

  if (document.businessConstraints.length === 0) {
    warnings.push('没有业务约束，可能遗漏重要的业务规则');
  }

  // 功能需求质量检查
  document.functionalRequirements.forEach((req, index) => {
    if (!req.title || req.title.length < 3) {
      errors.push(`功能需求${index + 1}标题无效`);
    }
    if (!req.description || req.description.length < 10) {
      errors.push(`功能需求${index + 1}描述过于简短`);
    }
  });

  // 用户场景质量检查
  document.userScenarios.forEach((scenario, index) => {
    if (!scenario.steps || scenario.steps.length === 0) {
      warnings.push(`用户场景${index + 1}缺少操作步骤`);
    }
    if (!scenario.expectedOutcome) {
      warnings.push(`用户场景${index + 1}缺少期望结果`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 评估文档复杂度
 */
function assessDocumentComplexity(
  document: RequirementDocument
): 'simple' | 'medium' | 'complex' | 'highly_complex' {
  let score = 0;

  // 基于需求数量评分
  score += Math.min(document.functionalRequirements.length * 2, 20);
  score += Math.min(document.nonFunctionalRequirements.length * 3, 15);
  score += Math.min(document.userScenarios.length * 2, 10);
  score += Math.min(document.businessConstraints.length * 2, 10);

  // 基于内容复杂度评分
  const totalTextLength =
    document.description.length +
    document.functionalRequirements.reduce(
      (sum, req) => sum + req.description.length,
      0
    ) +
    document.userScenarios.reduce(
      (sum, scenario) => sum + scenario.description.length,
      0
    );

  score += Math.min((totalTextLength / 1000) * 5, 15);

  // 基于术语表复杂度评分
  score += Math.min(document.glossary.length, 10);

  // 复杂度分级
  if (score < 20) return 'simple';
  if (score < 40) return 'medium';
  if (score < 70) return 'complex';
  return 'highly_complex';
}

/**
 * 生成建模提示
 */
function generateModelingHints(document: RequirementDocument): string[] {
  const hints: string[] = [];

  const complexity = assessDocumentComplexity(document);

  switch (complexity) {
    case 'simple':
      hints.push('文档相对简单，建议重点关注核心实体和关系');
      break;
    case 'medium':
      hints.push('文档复杂度适中，建议平衡实体设计和业务规则');
      break;
    case 'complex':
      hints.push('文档较为复杂，建议采用分层设计方法');
      break;
    case 'highly_complex':
      hints.push('文档高度复杂，建议使用领域驱动设计方法');
      break;
  }

  // 基于领域添加提示
  const domain = document.domain.toLowerCase();
  if (domain.includes('电商') || domain.includes('commerce')) {
    hints.push('电商领域建议重点关注用户、商品、订单等核心实体');
  } else if (domain.includes('金融') || domain.includes('finance')) {
    hints.push('金融领域建议重点关注账户、交易、风控等关键流程');
  } else if (domain.includes('教育') || domain.includes('education')) {
    hints.push('教育领域建议重点关注用户角色、课程、学习等核心概念');
  }

  return hints;
}
