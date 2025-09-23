import { z } from 'zod';

export const insightUserSchema = z.object({
  label: z.string().min(2),
  description: z.string().min(12),
  topJobsToBeDone: z.array(z.string().min(6)).min(2),
  frustrations: z.array(z.string().min(6)).min(2),
});

export const insightFeatureSchema = z.object({
  name: z.string().min(2),
  objective: z.string().min(12),
  userValue: z.string().min(12),
  successSignals: z.array(z.string().min(6)).min(2),
  mainSteps: z.array(z.string().min(6)).min(5),
});

export const requirementInsightsSchema = z
  .object({
    productTitle: z.string().min(4),
    elevatorPitch: z.string().min(24),
    strategicPositioning: z.array(z.string().min(10)).min(2),
    primaryUsers: z.array(insightUserSchema).min(2),
    keyFeatures: z.array(insightFeatureSchema).min(3),
    operationalConstraints: z.array(z.string().min(8)).min(2),
    successMetrics: z.array(z.string().min(8)).min(3),
    openQuestions: z.array(z.string().min(10)).min(3),
    criticalRisks: z.array(z.string().min(10)).min(3),
  })
  .passthrough();

export type RequirementInsights = z.infer<typeof requirementInsightsSchema>;
export type InsightFeature = z.infer<typeof insightFeatureSchema>;
export type InsightUser = z.infer<typeof insightUserSchema>;
