/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @Description Requirements Clarification API Endpoint
 * @Author Claude Code
 * @Date 2025-09-19
 */

import type { H3Event } from 'h3';
import { RequirementsParserAgent } from '#server/core/agents/requirements-parser';

export interface ClarifyRequirementsRequest {
  currentRequirement: any;
  context: string;
  model?: string;
}

export interface ClarifyRequirementsResponse {
  success: boolean;
  questions?: string[];
  error?: string;
}

export default defineEventHandler(
  async (event: H3Event): Promise<ClarifyRequirementsResponse> => {
    try {
      const body = await readBody<ClarifyRequirementsRequest>(event);

      if (!body.currentRequirement || !body.context) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Current requirement and context are required',
        });
      }

      const parser = new RequirementsParserAgent({
        model: body.model,
      });

      const questions = await parser.generateAdditionalQuestions(
        body.currentRequirement,
        body.context
      );

      return {
        success: true,
        questions,
      };
    } catch (error) {
      console.error('API Error in requirements clarification:', error);

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
