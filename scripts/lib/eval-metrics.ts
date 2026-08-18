import { extractCitationOrdinals } from "../../src/rag/citations";
import { BOOKS_REFUSAL, OFF_TOPIC_REFUSAL } from "../../src/rag/copy";
import type { GroundedAnswer, RetrievedPassage } from "../../src/rag/types";
import type { EvalCase, EvalCaseResult, EvalSummary } from "./eval-types";

export function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function retrievalHit(
  passages: RetrievedPassage[],
  expectedTerms: string[],
): boolean {
  if (expectedTerms.length === 0) {
    return true;
  }

  const corpus = normalizeForMatch(
    passages.map((passage) => passage.content).join(" "),
  );

  return expectedTerms.some((term) =>
    corpus.includes(normalizeForMatch(term)),
  );
}

export function citationPresent(
  answer: GroundedAnswer,
  sourceCount: number,
): boolean {
  if (answer.refused !== false) {
    return false;
  }

  return extractCitationOrdinals(answer.answer, sourceCount).length > 0;
}

export function refusalCorrect(
  answer: GroundedAnswer,
  expectRefusal: boolean,
): boolean {
  const refused =
    answer.refused !== false ||
    answer.answer === BOOKS_REFUSAL ||
    answer.answer === OFF_TOPIC_REFUSAL;

  return expectRefusal ? refused : !refused;
}

export function evaluateCaseResult(input: {
  evalCase: EvalCase;
  passages: RetrievedPassage[];
  answer: GroundedAnswer;
  latencyMs: number;
}): EvalCaseResult {
  const { evalCase, passages, answer, latencyMs } = input;
  const reasons: string[] = [];

  const hit = retrievalHit(passages, evalCase.expectedTerms);
  if (!hit) {
    reasons.push("retrieval miss");
  }

  const cited = evalCase.expectCitation
    ? citationPresent(answer, passages.length)
    : !citationPresent(answer, passages.length);
  if (!cited) {
    reasons.push(
      evalCase.expectCitation
        ? "expected citation markers"
        : "unexpected citation markers",
    );
  }

  const refused = refusalCorrect(answer, evalCase.expectRefusal);
  if (!refused) {
    reasons.push(
      evalCase.expectRefusal
        ? "expected grounded refusal"
        : "unexpected refusal",
    );
  }

  const retrievalPassed = evalCase.expectedTerms.length === 0 ? true : hit;
  const citationPassed = evalCase.expectCitation
    ? citationPresent(answer, passages.length)
    : !citationPresent(answer, passages.length);
  const refusalPassed = refusalCorrect(answer, evalCase.expectRefusal);

  return {
    id: evalCase.id,
    retrievalHit: retrievalPassed,
    citationPresent: citationPassed,
    refusalCorrect: refusalPassed,
    passed: retrievalPassed && citationPassed && refusalPassed,
    latencyMs,
    bestScore:
      passages.length > 0
        ? Math.max(...passages.map((passage) => passage.score))
        : null,
    reasons,
  };
}

function metricRate(passed: number, total: number): number {
  if (total === 0) {
    return 100;
  }
  return (passed / total) * 100;
}

export function summarize(
  results: EvalCaseResult[],
  cases: EvalCase[],
): EvalSummary {
  const caseById = new Map(cases.map((evalCase) => [evalCase.id, evalCase]));

  const retrievalResults = results.filter((result) => {
    const evalCase = caseById.get(result.id);
    return evalCase !== undefined && evalCase.expectedTerms.length > 0;
  });
  const citationResults = results.filter((result) => {
    const evalCase = caseById.get(result.id);
    return evalCase?.expectCitation === true;
  });

  return {
    retrieval: {
      passed: retrievalResults.filter((result) => result.retrievalHit).length,
      total: retrievalResults.length,
      rate: metricRate(
        retrievalResults.filter((result) => result.retrievalHit).length,
        retrievalResults.length,
      ),
    },
    citation: {
      passed: citationResults.filter((result) => result.citationPresent).length,
      total: citationResults.length,
      rate: metricRate(
        citationResults.filter((result) => result.citationPresent).length,
        citationResults.length,
      ),
    },
    refusal: {
      passed: results.filter((result) => result.refusalCorrect).length,
      total: results.length,
      rate: metricRate(
        results.filter((result) => result.refusalCorrect).length,
        results.length,
      ),
    },
    aggregate: {
      passed: results.filter((result) => result.passed).length,
      total: results.length,
      rate: metricRate(
        results.filter((result) => result.passed).length,
        results.length,
      ),
    },
    failures: results
      .filter((result) => !result.passed)
      .map((result) => ({ id: result.id, reasons: result.reasons })),
  };
}

export function formatSummaryTable(summary: EvalSummary): string {
  const rows = [
    ["Retrieval hit", summary.retrieval],
    ["Citation presence", summary.citation],
    ["Refusal accuracy", summary.refusal],
    ["Aggregate pass", summary.aggregate],
  ] as const;

  const lines = [
    "| Metric | Passed | Total | Rate |",
    "|---|---:|---:|---:|",
    ...rows.map(
      ([label, metric]) =>
        `| ${label} | ${metric.passed} | ${metric.total} | ${metric.rate.toFixed(1)}% |`,
    ),
  ];

  return lines.join("\n");
}
