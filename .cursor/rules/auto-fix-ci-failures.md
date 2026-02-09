# Auto-Fix CI Failures

## Purpose
Automatically detect and fix common CI/CD test and lint failures when GitHub Actions reports them.

## Trigger Patterns

When you see any of these patterns, automatically fix them:

### Test Failures
- `FAIL` in test output
- `AssertionError`
- `TypeError` in tests
- `ReferenceError` in tests
- `expect(...).toBe(...)` failures
- `expect(...).toEqual(...)` failures
- Missing imports in test files
- Type errors in test files

### Lint Failures
- ESLint errors (format: `error  rule-name  message`)
- TypeScript errors (`TS####`)
- Unused imports
- Missing dependencies
- Formatting issues (Prettier)

## Auto-Fix Workflow

1. **Detect Failure**: When user mentions CI failure or shows test/lint errors:
   - Read the error message carefully
   - Identify the file(s) and line(s) affected
   - Determine the root cause

2. **Fix Automatically**:
   - Fix the code issue
   - Update tests if needed
   - Run local verification when possible
   - Commit the fix with message: `fix: [auto] resolve CI failure - [brief description]`

3. **Verify**:
   - If possible, run the failing command locally before committing
   - Ensure fix doesn't break other tests
   - Push the fix to trigger CI again

## Common Fixes

### Missing Imports
```typescript
// Error: Cannot find name 'SomeType'
// Fix: Add import
import type { SomeType } from './types'
```

### Type Errors
```typescript
// Error: Type 'X' is not assignable to type 'Y'
// Fix: Add proper type assertion or fix the type
const value: Y = x as Y
```

### Test Assertions
```typescript
// Error: Expected X but got Y
// Fix: Update expectation or fix the code being tested
expect(actual).toBe(expected)
```

### Lint Errors
```typescript
// Error: 'variable' is assigned a value but never used
// Fix: Remove unused variable or prefix with underscore
const _unused = value
```

### Missing Dependencies
```bash
# Error: Cannot find module 'package-name'
# Fix: Install the package
npm install package-name -w backend
```

## Auto-Commit Pattern

When fixing CI failures automatically:
1. Stage the fixed files
2. Commit with format: `fix: [auto] resolve CI failure - [component] - [issue]`
3. Push to trigger CI again
4. Inform user: "Fixed [issue]. Committed and pushed. CI will re-run."

## User Commands

- "Fix CI failures" - Read latest PR comments, identify failures, fix all
- "Auto-fix tests" - Fix all test failures automatically
- "Fix lint errors" - Fix all linting errors automatically
- "Fix [specific error]" - Fix a specific error mentioned by user

## Safety

- Always verify fixes don't break other functionality
- Don't auto-fix security issues without user confirmation
- Don't auto-fix architectural changes without discussion
- Ask for confirmation before fixing HIGH priority issues that might have side effects
