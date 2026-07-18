/**
 * Pure cost math for the AI cost calculator — zero Angular imports so it can
 * be unit-tested in isolation and reused outside components.
 *
 * Modeling assumptions (stated in the UI):
 * - 30-day month.
 * - Cache *reads* are modeled; cache writes, batch discounts and long-context
 *   surcharge tiers are not (they surface as per-model notes instead).
 * - Models without a published flat cache-read rate bill the cached share at
 *   the full input price (conservative estimate).
 */
import { LlmModelPricing } from './llm-pricing.data';

/** User-supplied workload scenario. All token counts are per request. */
export interface CalculatorInputs {
  /** Monthly active users. */
  users: number;
  /** Requests each user makes per day. */
  requestsPerUserPerDay: number;
  /** Average input (prompt) tokens per request. */
  avgInputTokens: number;
  /** Average output (completion) tokens per request. */
  avgOutputTokens: number;
  /** Fraction (0..1) of input tokens billed at the cache-read rate. */
  cachedInputShare: number;
}

/** Cost projection for one model under a given workload, all figures in USD. */
export interface CostEstimate {
  /** The pricing row the estimate was computed from. */
  model: LlmModelPricing;
  /** USD per single request. */
  costPerRequest: number;
  /** USD per day across all users. */
  costPerDay: number;
  /** USD per 30-day month across all users. */
  costPerMonth: number;
  /** USD per user per 30-day month. */
  costPerUserPerMonth: number;
}

/**
 * Clamp a raw numeric input to a non-negative finite number.
 * NaN, ±Infinity and negatives all collapse to 0 so downstream math can
 * never produce NaN — garbage input yields $0 rows, not broken ones.
 */
function sanitize(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/**
 * Estimate what a workload costs on a single model.
 *
 * Per-request math: the cached share of input tokens is billed at the
 * model's cache-read rate (falling back to the full input rate when none is
 * published), the rest at the input rate, and all output tokens at the
 * output rate. Day/month figures scale linearly from there.
 */
export function estimateCost(
  model: LlmModelPricing,
  inputs: CalculatorInputs,
): CostEstimate {
  const users = sanitize(inputs.users);
  const requestsPerUserPerDay = sanitize(inputs.requestsPerUserPerDay);
  const avgInputTokens = sanitize(inputs.avgInputTokens);
  const avgOutputTokens = sanitize(inputs.avgOutputTokens);
  const cachedInputShare = Math.min(1, sanitize(inputs.cachedInputShare));

  const effectiveInputRate =
    (1 - cachedInputShare) * model.inputPerMTok +
    cachedInputShare * (model.cacheReadPerMTok ?? model.inputPerMTok);

  const costPerRequest =
    (avgInputTokens * effectiveInputRate + avgOutputTokens * model.outputPerMTok) / 1e6;

  const requestsPerDay = users * requestsPerUserPerDay;
  const costPerDay = costPerRequest * requestsPerDay;
  const costPerMonth = costPerDay * 30;
  const costPerUserPerMonth = costPerRequest * requestsPerUserPerDay * 30;

  return { model, costPerRequest, costPerDay, costPerMonth, costPerUserPerMonth };
}

/**
 * Estimate a workload across many models, cheapest first.
 * Sorted by monthly cost ascending; ties keep the input order (stable sort),
 * so the table order is deterministic.
 */
export function estimateAll(
  models: LlmModelPricing[],
  inputs: CalculatorInputs,
): CostEstimate[] {
  return models
    .map((model) => estimateCost(model, inputs))
    .sort((a, b) => a.costPerMonth - b.costPerMonth);
}
