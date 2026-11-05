import type { Mocked } from 'vitest';

/** Test double with a `vi.fn()` for each named method, typed as the real service. */
export function createSpyObj<T = Record<string, unknown>>(methods: readonly (keyof T & string)[]): Mocked<T> {
  return Object.fromEntries(methods.map((name) => [name, vi.fn().mockName(name)])) as unknown as Mocked<T>;
}
