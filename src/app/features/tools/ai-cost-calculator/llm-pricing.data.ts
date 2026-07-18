/**
 * Static LLM API pricing table for the AI cost calculator.
 *
 * All prices are USD per 1 million tokens on each provider's standard
 * (non-batch, base-tier) API. The table is refreshed manually — re-verify
 * against every `sourceUrl` monthly and bump `PRICING_AS_OF` accordingly;
 * the date is displayed in the UI so stale data is self-disclosing.
 *
 * Deliberate exclusion: Mistral Large 3 is omitted because Mistral's own
 * pages publish two conflicting prices ($0.50/$1.50 vs $2/$6) — accuracy
 * outranks coverage.
 */

/** Pricing row for a single model, as published on the provider's official page. */
export interface LlmModelPricing {
  /** Stable slug used in URLs and tests, e.g. 'claude-sonnet-5'. */
  id: string;
  /** Provider display name, e.g. 'OpenAI', 'Anthropic'. */
  provider: string;
  /** Model display name — a product name, never localized. */
  name: string;
  /** USD per 1M input tokens (standard, non-batch, base tier). */
  inputPerMTok: number;
  /** USD per 1M output tokens. */
  outputPerMTok: number;
  /** USD per 1M cached input tokens; null when the provider publishes no flat cache-read rate. */
  cacheReadPerMTok: number | null;
  /** Context window in tokens; null if not published. */
  contextWindow: number | null;
  /** Official pricing page the numbers were transcribed from. */
  sourceUrl: string;
  /** Short caveat surfaced in the UI (e.g. intro pricing, long-context surcharge). */
  note?: string;
}

/** Date the prices below were last verified against the official pricing pages. */
export const PRICING_AS_OF = '2026-07-18';

/** Verified pricing rows, one per model (18 total). */
export const LLM_PRICING: LlmModelPricing[] = [
  {
    id: 'gpt-5-6-sol',
    provider: 'OpenAI',
    name: 'GPT-5.6 Sol',
    inputPerMTok: 5,
    outputPerMTok: 30,
    cacheReadPerMTok: 0.5,
    contextWindow: 1050000,
    sourceUrl: 'https://developers.openai.com/api/docs/pricing',
  },
  {
    id: 'gpt-5-6-terra',
    provider: 'OpenAI',
    name: 'GPT-5.6 Terra',
    inputPerMTok: 2.5,
    outputPerMTok: 15,
    cacheReadPerMTok: 0.25,
    contextWindow: 1050000,
    sourceUrl: 'https://developers.openai.com/api/docs/pricing',
  },
  {
    id: 'gpt-5-6-luna',
    provider: 'OpenAI',
    name: 'GPT-5.6 Luna',
    inputPerMTok: 1,
    outputPerMTok: 6,
    cacheReadPerMTok: 0.1,
    contextWindow: 1050000,
    sourceUrl: 'https://developers.openai.com/api/docs/pricing',
  },
  {
    id: 'gpt-5-4-mini',
    provider: 'OpenAI',
    name: 'GPT-5.4 mini',
    inputPerMTok: 0.75,
    outputPerMTok: 4.5,
    cacheReadPerMTok: 0.075,
    contextWindow: null,
    sourceUrl: 'https://developers.openai.com/api/docs/pricing',
  },
  {
    id: 'claude-fable-5',
    provider: 'Anthropic',
    name: 'Claude Fable 5',
    inputPerMTok: 10,
    outputPerMTok: 50,
    cacheReadPerMTok: 1,
    contextWindow: 1000000,
    sourceUrl: 'https://platform.claude.com/docs/en/about-claude/pricing',
  },
  {
    id: 'claude-opus-4-8',
    provider: 'Anthropic',
    name: 'Claude Opus 4.8',
    inputPerMTok: 5,
    outputPerMTok: 25,
    cacheReadPerMTok: 0.5,
    contextWindow: 1000000,
    sourceUrl: 'https://platform.claude.com/docs/en/about-claude/pricing',
  },
  {
    id: 'claude-sonnet-5',
    provider: 'Anthropic',
    name: 'Claude Sonnet 5',
    inputPerMTok: 2,
    outputPerMTok: 10,
    cacheReadPerMTok: 0.2,
    contextWindow: 1000000,
    sourceUrl: 'https://platform.claude.com/docs/en/about-claude/pricing',
    note: 'Intro pricing through 2026-08-31; $3 in / $15 out afterwards',
  },
  {
    id: 'claude-haiku-4-5',
    provider: 'Anthropic',
    name: 'Claude Haiku 4.5',
    inputPerMTok: 1,
    outputPerMTok: 5,
    cacheReadPerMTok: 0.1,
    contextWindow: 200000,
    sourceUrl: 'https://platform.claude.com/docs/en/about-claude/pricing',
  },
  {
    id: 'gemini-3-1-pro',
    provider: 'Google',
    name: 'Gemini 3.1 Pro',
    inputPerMTok: 2,
    outputPerMTok: 12,
    cacheReadPerMTok: 0.2,
    contextWindow: 1000000,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
    note: 'Roughly 2x price for prompts above 200K tokens',
  },
  {
    id: 'gemini-3-5-flash',
    provider: 'Google',
    name: 'Gemini 3.5 Flash',
    inputPerMTok: 1.5,
    outputPerMTok: 9,
    cacheReadPerMTok: 0.15,
    contextWindow: 1000000,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
  },
  {
    id: 'gemini-3-1-flash-lite',
    provider: 'Google',
    name: 'Gemini 3.1 Flash-Lite',
    inputPerMTok: 0.25,
    outputPerMTok: 1.5,
    cacheReadPerMTok: 0.025,
    contextWindow: null,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
  },
  {
    id: 'deepseek-v4-pro',
    provider: 'DeepSeek',
    name: 'DeepSeek V4 Pro',
    inputPerMTok: 0.435,
    outputPerMTok: 0.87,
    cacheReadPerMTok: 0.003625,
    contextWindow: 1000000,
    sourceUrl: 'https://api-docs.deepseek.com/quick_start/pricing',
  },
  {
    id: 'deepseek-v4-flash',
    provider: 'DeepSeek',
    name: 'DeepSeek V4 Flash',
    inputPerMTok: 0.14,
    outputPerMTok: 0.28,
    cacheReadPerMTok: 0.0028,
    contextWindow: 1000000,
    sourceUrl: 'https://api-docs.deepseek.com/quick_start/pricing',
  },
  {
    id: 'mistral-medium-3-5',
    provider: 'Mistral',
    name: 'Mistral Medium 3.5',
    inputPerMTok: 1.5,
    outputPerMTok: 7.5,
    cacheReadPerMTok: null,
    contextWindow: null,
    sourceUrl: 'https://mistral.ai/pricing',
  },
  {
    id: 'mistral-small-4',
    provider: 'Mistral',
    name: 'Mistral Small 4',
    inputPerMTok: 0.15,
    outputPerMTok: 0.6,
    cacheReadPerMTok: null,
    contextWindow: null,
    sourceUrl: 'https://mistral.ai/pricing',
  },
  {
    id: 'grok-4-5',
    provider: 'xAI',
    name: 'Grok 4.5',
    inputPerMTok: 2,
    outputPerMTok: 6,
    cacheReadPerMTok: 0.5,
    contextWindow: 500000,
    sourceUrl: 'https://docs.x.ai/docs/models',
    note: 'Roughly 2x price for prompts above 200K tokens',
  },
  {
    id: 'grok-4-3',
    provider: 'xAI',
    name: 'Grok 4.3',
    inputPerMTok: 1.25,
    outputPerMTok: 2.5,
    cacheReadPerMTok: 0.2,
    contextWindow: 1000000,
    sourceUrl: 'https://docs.x.ai/docs/models',
    note: 'Roughly 2x price for prompts above 200K tokens',
  },
  {
    id: 'llama-3-3-70b-groq',
    provider: 'Groq',
    name: 'Llama 3.3 70B (Groq)',
    inputPerMTok: 0.59,
    outputPerMTok: 0.79,
    cacheReadPerMTok: null,
    contextWindow: 128000,
    sourceUrl: 'https://groq.com/pricing',
    note: 'Open-weights model served on Groq hardware',
  },
];
