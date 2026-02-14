// Ensure TypeScript sees vitest-axe matcher type augmentations during `tsc -b`.
//
// Vitest registers the matcher at runtime in `frontend/vitest.setup.ts`, but that
// setup file is not included in `tsconfig.app.json` (which only includes `src/`).
// Importing the matchers here makes `expect(...).toHaveNoViolations()` type-safe.
import 'vitest-axe/matchers'

