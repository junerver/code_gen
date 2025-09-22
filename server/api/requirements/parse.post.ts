/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @Description Requirements Parser API Endpoint - 专注于业务建模
 * @Author Claude Code
 * @Date 2025-09-19
 * @Updated 2025-01-19 - 重构为专注业务建模的接口
 */

import type { H3Event } from 'h3';
import {
  parseRequirements,
  parseRequirementsFromDocument,
} from '#server/core/agents/requirements-parser';
import type { ParseRequirementsOptions } from '#server/core/agents/requirements-parser';

export interface ParseRequirementsRequest {
  text?: string; // 原始文本输入（向后兼容）
  requirementDocument?: string; // 完整需求文档（推荐使用）
  options?: ParseRequirementsOptions;
}

export interface ParseRequirementsResponse {
  success: boolean;
  data?: any;
  error?: string;
  validationErrors?: any[];
  retryable?: boolean;
  suggestion?: string;
}

export default defineEventHandler(
  async (event: H3Event): Promise<ParseRequirementsResponse> => {
    try {
      const body = await readBody<ParseRequirementsRequest>(event);

      // 验证输入参数
      if (!body.text && !body.requirementDocument) {
        throw createError({
          statusCode: 400,
          statusMessage: '需要提供文本输入或需求文档',
        });
      }

      // 优先使用需求文档进行业务建模
      const inputText = body.requirementDocument || body.text!;
      const isDocument = !!body.requirementDocument;

      // 记录解析请求
      console.log(`业务建模请求`, {
        inputType: isDocument ? 'document' : 'text',
        textLength: inputText.length,
        hasOptions: !!body.options,
        model: body.options?.model,
      });

      // 根据输入类型选择合适的解析方法
      const result = isDocument
        ? await parseRequirementsFromDocument(inputText, body.options)
        : await parseRequirements(inputText, body.options);

      // 记录解析结果
      if (result.success) {
        console.log(`业务建模成功`, {
          entityCount: result.data?.entities?.length || 0,
          relationshipCount: result.data?.relationships?.length || 0,
          businessRuleCount: result.data?.businessRules?.length || 0,
          confidence: result.data?.confidence
            ? Math.round(result.data.confidence * 100)
            : 'N/A',
        });
      } else {
        console.log(`业务建模失败`, {
          error: result.error,
          retryable: result.retryable,
          validationErrorCount: result.validationErrors?.length || 0,
        });
      }

      return result;
    } catch (error) {
      console.error('API Error in requirements parser:', error);

      throw createError({
        statusCode:
          error instanceof Error && 'statusCode' in error
            ? (error as any).statusCode
            : 500,
        statusMessage:
          error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
);
