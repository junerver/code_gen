import { z } from 'zod';

export const priorityLevelSchema = z.enum(['高', '中', '低']);
export const importanceLevelSchema = z.enum(['必须', '应该', '可以']);

export const prdSchema = z.object({
  metadata: z.object({
    title: z.string().min(5, '标题至少5个字符'),
    version: z.string().min(1, '请提供版本号'),
    lastUpdated: z.string().min(4, '请提供最近更新日期'),
    summary: z
      .string()
      .min(30, '请提供50字左右的摘要')
      .max(300, '摘要请保持简洁'),
    stakeholders: z
      .array(z.string().min(2))
      .min(1, '请至少提供一位干系人')
      .max(8, '干系人不宜超过8位')
      .optional(),
    assumptions: z.array(z.string().min(4)).max(10).optional(),
    scope: z.object({
      inScope: z.array(z.string().min(4)).min(1),
      outOfScope: z.array(z.string().min(4)).min(0),
    }),
    successMetrics: z.array(z.string().min(4)).min(1).max(6),
  }),
  background: z.object({
    businessContext: z.string().min(40),
    targetUsers: z
      .array(
        z.object({
          name: z.string().min(2),
          description: z.string().min(30),
          primaryNeeds: z.array(z.string().min(4)).min(2),
        })
      )
      .min(1),
    usageScenarios: z.array(z.string().min(20)).min(2),
  }),
  goals: z
    .array(
      z.object({
        goal: z.string().min(15),
        priority: priorityLevelSchema,
        successMetric: z.string().min(10),
      })
    )
    .min(3),
  personas: z
    .array(
      z.object({
        name: z.string().min(2),
        description: z.string().min(50),
        responsibilities: z.array(z.string().min(6)).min(2),
        painPoints: z.array(z.string().min(6)).min(2),
      })
    )
    .min(1),
  features: z
    .array(
      z.object({
        name: z.string().min(3),
        priority: z.enum(['核心', '重要', '可选']),
        description: z.string().min(40),
        trigger: z.string().min(10),
        preconditions: z.string().min(10),
        mainFlow: z.array(z.string().min(6)).min(5),
        alternateFlows: z.array(z.string().min(6)).min(1).optional(),
        postconditions: z.string().min(10),
        exceptions: z.array(z.string().min(6)).min(1),
        dependencies: z.array(z.string().min(4)).optional(),
        dataNeeds: z.array(z.string().min(4)).optional(),
        notes: z.array(z.string().min(4)).optional(),
        clarifications: z.array(z.string().min(6)).optional(),
      })
    )
    .min(3),
  workflows: z
    .array(
      z.object({
        name: z.string().min(3),
        overview: z.string().min(40),
        steps: z.array(z.string().min(6)).min(6),
        alternatePaths: z.array(z.string().min(6)).optional(),
        artifacts: z.array(z.string().min(4)).optional(),
        notes: z.array(z.string().min(6)).optional(),
      })
    )
    .min(2),
  dataDictionary: z
    .array(
      z.object({
        name: z.string().min(2),
        label: z.string().min(2),
        type: z.string().min(3),
        required: z.boolean(),
        description: z.string().min(20),
        example: z.string().min(2),
        constraints: z.string().min(6).optional(),
        source: z.string().min(4).optional(),
      })
    )
    .min(10),
  nonFunctionalRequirements: z
    .array(
      z.object({
        category: z.enum([
          '性能',
          '安全性',
          '可用性',
          '兼容性',
          '可扩展性',
          '可维护性',
        ]),
        statement: z.string().min(20),
        metric: z.string().min(10),
        priority: priorityLevelSchema,
      })
    )
    .min(5),
  exceptionScenarios: z
    .array(
      z.object({
        scenario: z.string().min(15),
        handling: z.string().min(20),
        priority: priorityLevelSchema,
        detection: z.string().min(10).optional(),
      })
    )
    .min(5),
  risks: z
    .array(
      z.object({
        risk: z.string().min(15),
        likelihood: priorityLevelSchema,
        impact: priorityLevelSchema,
        mitigation: z.string().min(20),
        owner: z.string().min(2).optional(),
      })
    )
    .min(3),
  acceptanceCriteria: z
    .array(
      z.object({
        feature: z.string().min(3),
        criteria: z
          .array(
            z.object({
              label: importanceLevelSchema,
              scenario: z.string().min(8),
              given: z.string().min(10),
              when: z.string().min(10),
              then: z.string().min(10),
            })
          )
          .min(2),
      })
    )
    .min(3),
  glossary: z
    .array(
      z.object({
        term: z.string().min(2),
        definition: z.string().min(15),
      })
    )
    .optional(),
  outstandingQuestions: z.array(z.string().min(6)).optional(),
});

export type PrdDocument = z.infer<typeof prdSchema>;
