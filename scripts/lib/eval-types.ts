import { z } from "zod";

export const evalCaseSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  expectedTerms: z.array(z.string()).default([]),
  expectCitation: z.boolean(),
  expectRefusal: z.boolean(),
});

export type EvalCase = z.infer<typeof evalCaseSchema>;

export type EvalCaseResult = {
  id: string;
  retrievalHit: boolean;
  citationPresent: boolean;
  refusalCorrect: boolean;
  passed: boolean;
  latencyMs: number;
  bestScore: number | null;
  reasons: string[];
};

export type EvalSummary = {
  retrieval: { passed: number; total: number; rate: number };
  citation: { passed: number; total: number; rate: number };
  refusal: { passed: number; total: number; rate: number };
  aggregate: { passed: number; total: number; rate: number };
  failures: Array<{ id: string; reasons: string[] }>;
};
