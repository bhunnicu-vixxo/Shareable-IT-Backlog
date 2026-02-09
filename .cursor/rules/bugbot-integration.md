# Bugbot-Cursor Integration

## Overview
This rule enables automatic communication between GitHub Actions (Bugbot) and Cursor to create a self-healing CI/CD loop.

## How It Works

1. **GitHub Actions detects failures** → Posts detailed comments on PR
2. **Cursor reads PR comments** → Identifies failures
3. **Cursor auto-fixes** → Commits and pushes
4. **CI re-runs** → Loop continues until all tests pass

## Setup Instructions

### 1. GitHub Actions (Already Configured)
The `.github/workflows/pr-checks.yml` workflow:
- Captures test/lint output
- Posts detailed failure reports as PR comments
- Includes error details and file locations

### 2. Cursor Auto-Fix Rule (Already Configured)
The `.cursor/rules/auto-fix-ci-failures.md` rule:
- Detects common failure patterns
- Automatically fixes issues
- Commits and pushes fixes

### 3. Manual Trigger (For Now)

Since Cursor can't automatically monitor GitHub PRs, use this workflow:

**When CI fails:**
1. Open the PR in GitHub
2. Copy the failure comment from Bugbot
3. In Cursor, say: "Fix CI failures" and paste the error
4. Cursor will:
   - Parse the errors
   - Fix them automatically
   - Commit and push
   - CI will re-run automatically

**Example:**
```
User: Fix CI failures
[Paste error from GitHub PR comment]

Cursor: [Fixes errors, commits, pushes]
```

## Future Automation (Optional)

To make this fully automatic, you could:

1. **GitHub App Integration**: Create a GitHub App that:
   - Monitors PR comments
   - Calls Cursor API/webhook when failures detected
   - Triggers auto-fix workflow

2. **Local Script**: Create a script that:
   - Polls GitHub API for PR comments
   - Extracts failure details
   - Calls Cursor CLI to fix issues

3. **GitHub Actions → Linear**: Post failures to Linear issues, Cursor monitors Linear

## Current Workflow

```
PR Created/Updated
  ↓
GitHub Actions Runs Tests
  ↓
Tests Fail → Bugbot Posts Comment
  ↓
[Manual] User copies error to Cursor
  ↓
Cursor Auto-Fixes → Commits → Pushes
  ↓
GitHub Actions Re-runs (automatic)
  ↓
Loop until all pass ✅
```

## Tips

- Keep PR comments focused - Bugbot posts detailed errors
- Fix one type of error at a time for cleaner commits
- Review auto-fixes before merging
- Use "Fix CI failures" command to batch-fix multiple issues
