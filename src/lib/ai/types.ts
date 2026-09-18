import { z } from "zod";

export const AiRepairProposalSchema = z.object({
  title: z.string().min(3),
  explanation: z.string().min(10),
  auditEvidenceCited: z.string(),
  riskLevel: z.enum(["low", "medium", "high"]),
  confidence: z.number().min(0).max(1),
  blastRadiusPages: z.number().int().positive().default(1),
  patches: z.array(
    z.object({
      targetResource: z.string(), // e.g. "index.html" or "post:1"
      operation: z.enum([
        "update_title",
        "update_meta_description",
        "inject_schema",
        "add_canonical",
        "add_viewport",
        "update_img_alt",
        "create_llms_txt",
        "custom_patch",
      ]),
      beforeSnippet: z.string(),
      afterSnippet: z.string(),
      explanation: z.string(),
    })
  ),
  precautions: z.array(z.string()).default([]),
});

export type AiRepairProposal = z.infer<typeof AiRepairProposalSchema>;

export interface AiModelMetadata {
  provider: string;
  model: string;
  promptVersion: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  estimatedCostUsd?: number;
}
