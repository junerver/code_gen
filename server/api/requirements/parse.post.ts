/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @Description Requirements Parser API Endpoint
 * @Author Claude Code
 * @Date 2025-09-19
 */

import type { H3Event } from 'h3';
import { parseRequirements } from '#server/core/agents/requirements-parser';
import type { ParseRequirementsOptions } from '#server/core/agents/requirements-parser';

export interface ParseRequirementsRequest {
  text: string;
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

      if (!body.text) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Requirement text is required',
        });
      }

      // Log the parsing request for monitoring
      console.log(`Parsing requirements request`, {
        textLength: body.text.length,
        hasOptions: !!body.options,
        model: body.options?.model,
      });

      const result = await parseRequirements(body.text, body.options);

      // Log parsing results
      if (result.success) {
        console.log(`Requirements parsed successfully`, {
          entityCount: result.data?.entities?.length || 0,
          relationshipCount: result.data?.relationships?.length || 0,
          ruleCount: result.data?.businessRules?.length || 0,
          confidence: result.data?.confidence,
          domain: result.data?.domain,
        });
      } else {
        console.warn(`Requirements parsing failed`, {
          error: result.error,
          retryable: result.retryable,
          hasValidationErrors: !!result.validationErrors,
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
