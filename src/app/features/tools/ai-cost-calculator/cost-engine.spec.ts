import { CalculatorInputs, estimateAll, estimateCost } from './cost-engine';
import { LLM_PRICING, LlmModelPricing } from './llm-pricing.data';

/** Build a synthetic pricing row with clean numbers for arithmetic-focused tests. */
function makeModel(overrides: Partial<LlmModelPricing> = {}): LlmModelPricing {
  return {
    id: 'test-model',
    provider: 'TestCorp',
    name: 'Test Model',
    inputPerMTok: 10,
    outputPerMTok: 20,
    cacheReadPerMTok: 1,
    contextWindow: 100000,
    sourceUrl: 'https://example.com/pricing',
    ...overrides,
  };
}

/** Baseline workload used across tests unless a test overrides fields. */
function makeInputs(overrides: Partial<CalculatorInputs> = {}): CalculatorInputs {
  return {
    users: 1000,
    requestsPerUserPerDay: 10,
    avgInputTokens: 1500,
    avgOutputTokens: 300,
    cachedInputShare: 0,
    ...overrides,
  };
}

describe('estimateCost', () => {
  it('computes exact per-request, per-day, per-month and per-user costs for a known model', () => {
    // Claude Sonnet 5: $2 in / $10 out / $0.2 cache-read per MTok.
    const sonnet = LLM_PRICING.find((m) => m.id === 'claude-sonnet-5')!;
    const result = estimateCost(
      sonnet,
      makeInputs({ cachedInputShare: 0.7 }),
    );

    // effectiveInputRate = 0.3 * 2 + 0.7 * 0.2 = 0.74
    // costPerRequest = (1500 * 0.74 + 300 * 10) / 1e6 = 0.00411
    expect(result.model).toBe(sonnet);
    expect(result.costPerRequest).toBeCloseTo(0.00411, 10);
    expect(result.costPerDay).toBeCloseTo(41.1, 8);
    expect(result.costPerMonth).toBeCloseTo(1233, 6);
    expect(result.costPerUserPerMonth).toBeCloseTo(1.233, 8);
  });

  it('bills all input at the full rate when cachedInputShare is 0', () => {
    const result = estimateCost(makeModel(), makeInputs({ cachedInputShare: 0 }));

    // (1500 * 10 + 300 * 20) / 1e6 = 0.021
    expect(result.costPerRequest).toBeCloseTo(0.021, 10);
  });

  it('bills all input at the cache-read rate when cachedInputShare is 1', () => {
    const result = estimateCost(makeModel(), makeInputs({ cachedInputShare: 1 }));

    // (1500 * 1 + 300 * 20) / 1e6 = 0.0075
    expect(result.costPerRequest).toBeCloseTo(0.0075, 10);
  });

  it('blends input and cache-read rates linearly when cachedInputShare is 0.5', () => {
    const result = estimateCost(makeModel(), makeInputs({ cachedInputShare: 0.5 }));

    // effectiveInputRate = 0.5 * 10 + 0.5 * 1 = 5.5
    // (1500 * 5.5 + 300 * 20) / 1e6 = 0.01425
    expect(result.costPerRequest).toBeCloseTo(0.01425, 10);
  });

  it('falls back to the full input price when cacheReadPerMTok is null', () => {
    const noCacheModel = makeModel({ cacheReadPerMTok: null });
    const cached = estimateCost(noCacheModel, makeInputs({ cachedInputShare: 0.9 }));
    const uncached = estimateCost(noCacheModel, makeInputs({ cachedInputShare: 0 }));

    // The cached share is billed at the input rate, so the share is irrelevant.
    expect(cached.costPerRequest).toBeCloseTo(uncached.costPerRequest, 12);
    expect(cached.costPerRequest).toBeCloseTo(0.021, 10);
  });

  it('clamps negative inputs to 0 and yields zero costs, never NaN', () => {
    const result = estimateCost(
      makeModel(),
      makeInputs({ users: -5, avgInputTokens: -1500, avgOutputTokens: -300 }),
    );

    expect(result.costPerRequest).toBe(0);
    expect(result.costPerDay).toBe(0);
    expect(result.costPerMonth).toBe(0);
    expect(result.costPerUserPerMonth).toBe(0);
  });

  it('treats NaN inputs as 0 and never propagates NaN into results', () => {
    const result = estimateCost(
      makeModel(),
      makeInputs({
        users: Number.NaN,
        requestsPerUserPerDay: Number.NaN,
        avgInputTokens: Number.NaN,
        avgOutputTokens: Number.NaN,
        cachedInputShare: Number.NaN,
      }),
    );

    expect(result.costPerRequest).toBe(0);
    expect(result.costPerDay).toBe(0);
    expect(result.costPerMonth).toBe(0);
    expect(result.costPerUserPerMonth).toBe(0);
  });

  it('treats Infinity inputs as 0 and never propagates NaN into results', () => {
    const result = estimateCost(
      makeModel(),
      makeInputs({
        users: Number.POSITIVE_INFINITY,
        avgInputTokens: Number.NEGATIVE_INFINITY,
        cachedInputShare: Number.POSITIVE_INFINITY,
      }),
    );

    // Output tokens only (300 * 20 / 1e6); infinite share clamps to 0.
    expect(result.costPerRequest).toBeCloseTo(0.006, 12);
    expect(result.costPerDay).toBe(0); // users clamp to 0
    expect(result.costPerMonth).toBe(0);
    expect(Number.isNaN(result.costPerUserPerMonth)).toBeFalse();
  });

  it('clamps cachedInputShare above 1 down to 1', () => {
    const clamped = estimateCost(makeModel(), makeInputs({ cachedInputShare: 1.5 }));
    const atOne = estimateCost(makeModel(), makeInputs({ cachedInputShare: 1 }));

    expect(clamped.costPerRequest).toBe(atOne.costPerRequest);
    expect(clamped.costPerMonth).toBe(atOne.costPerMonth);
  });

  it('keeps costPerUserPerMonth independent of the user count', () => {
    const few = estimateCost(makeModel(), makeInputs({ users: 10 }));
    const many = estimateCost(makeModel(), makeInputs({ users: 100000 }));

    expect(few.costPerUserPerMonth).toBe(many.costPerUserPerMonth);
    // 0.021 per request * 10 requests/day * 30 days = 6.3
    expect(few.costPerUserPerMonth).toBeCloseTo(6.3, 8);
  });
});

describe('estimateAll', () => {
  it('returns one estimate per model, covering every LLM_PRICING entry', () => {
    const results = estimateAll(LLM_PRICING, makeInputs({ cachedInputShare: 0.5 }));

    expect(results.length).toBe(18);
    const ids = results.map((r) => r.model.id);
    for (const model of LLM_PRICING) {
      expect(ids).toContain(model.id);
    }
  });

  it('sorts results by costPerMonth ascending', () => {
    const results = estimateAll(LLM_PRICING, makeInputs({ cachedInputShare: 0.3 }));

    for (let i = 1; i < results.length; i++) {
      expect(results[i].costPerMonth).toBeGreaterThanOrEqual(
        results[i - 1].costPerMonth,
      );
    }
  });

  it('keeps the input order for models tied on costPerMonth (stable sort)', () => {
    const twinA = makeModel({ id: 'twin-a' });
    const twinB = makeModel({ id: 'twin-b' });
    const cheap = makeModel({ id: 'cheap', inputPerMTok: 1, outputPerMTok: 2 });

    const results = estimateAll([twinA, twinB, cheap], makeInputs());

    expect(results.map((r) => r.model.id)).toEqual(['cheap', 'twin-a', 'twin-b']);
  });
});
