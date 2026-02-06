import { z } from 'zod/v4'

const linearConfigSchema = z.object({
  apiKey: z.string().min(1, 'LINEAR_API_KEY is required'),
  apiUrl: z.string().url().default('https://api.linear.app/graphql'),
})

export type LinearConfig = z.infer<typeof linearConfigSchema>

/**
 * Lazily parsed Linear configuration.
 * Throws a descriptive ZodError when LINEAR_API_KEY is missing or empty.
 *
 * Call this function instead of reading a module-level constant so that
 * modules can be imported in test / CLI contexts that lack the env var.
 */
export function getLinearConfig(): LinearConfig {
  return linearConfigSchema.parse({
    apiKey: process.env.LINEAR_API_KEY,
    apiUrl: process.env.LINEAR_API_URL,
  })
}

/**
 * Lazily-evaluated config object for callers that prefer property access.
 *
 * IMPORTANT: This proxy defers env validation until first property access,
 * matching the story's lazy-initialisation requirement (Task 5.10).
 */
export const linearConfig: LinearConfig = new Proxy({} as LinearConfig, {
  get(_target, prop) {
    return (getLinearConfig() as Record<string, unknown>)[String(prop)]
  },
})
