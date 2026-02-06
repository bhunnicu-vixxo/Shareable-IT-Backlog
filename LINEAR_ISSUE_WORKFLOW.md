# Linear Issue Workflow

This document describes how to work with Linear issues and automatically update their status, implementation notes, testing notes, and comments.

## Quick Start

When starting work on a Linear issue:

```powershell
# Set your API key (one time per session)
$env:LINEAR_API_KEY="lin_api_xxx"

# Start working on an issue - mark as "In Progress"
node update-linear-issue.js VIX-329 --status "In Progress"

# Add implementation notes as you work
node update-linear-issue.js VIX-329 --implementation "Implemented user authentication using JWT tokens. Added login form component with validation."

# Add testing notes when testing
node update-linear-issue.js VIX-329 --testing "Tested login flow with valid credentials. Verified error handling for invalid credentials. Need to test password reset flow."

# Add a comment
node update-linear-issue.js VIX-329 --comment "Blocked on API endpoint - waiting for backend team"

# Mark as done when complete
node update-linear-issue.js VIX-329 --status "Done"
```

### Recommended (so you don't keep re-entering it)

Store your API key in your **local** `backend/.env` file (this file is gitignored and should never be committed):

```env
LINEAR_API_KEY=lin_api_xxx
```

Both `update-linear-issue.js` and `import-to-linear.js` will automatically load `LINEAR_API_KEY` from `backend/.env` if it is not already set in your shell environment.

## Usage

### Basic Syntax

```powershell
node update-linear-issue.js <ISSUE_IDENTIFIER> [options]
```

### Options

- `--status <state>` - Update issue status (e.g., "In Progress", "Done", "Canceled")
- `--implementation <notes>` - Add implementation notes to the issue description
- `--testing <notes>` - Add testing notes to the issue description
- `--comment <text>` - Add a comment to the issue
- `--description <text>` - Replace the entire issue description

### Examples

#### Starting Work on an Issue

```powershell
node update-linear-issue.js VIX-329 --status "In Progress" --implementation "Starting implementation of user authentication feature."
```

#### Adding Progress Updates

```powershell
# Add implementation notes
node update-linear-issue.js VIX-329 --implementation "Completed login form component. Working on JWT token handling."

# Add testing notes
node update-linear-issue.js VIX-329 --testing "Tested login with valid credentials - working correctly. Found issue with error messages not displaying properly."
```

#### Adding Comments

```powershell
# Add a comment (appears in Linear's comment thread)
node update-linear-issue.js VIX-329 --comment "Need clarification on password requirements from product team"
```

#### Completing Work

```powershell
node update-linear-issue.js VIX-329 --status "Done" --implementation "All acceptance criteria met. Code reviewed and merged." --testing "All test cases passing. Manual testing complete."
```

## Workflow for AI Assistant

When working on a Linear issue, follow this workflow:

1. **Fetch the issue** - Get the issue details from Linear
2. **Update status to "In Progress"** - Mark that work has started
3. **Add implementation notes** - Document what you're implementing as you work
4. **Add testing notes** - Document test cases and results
5. **Add comments** - For questions, blockers, or important updates
6. **Update status to "Done"** - When work is complete

### Example AI Workflow

```powershell
# 1. Start working
node update-linear-issue.js VIX-329 --status "In Progress" --implementation "Beginning implementation of user authentication feature. Setting up React components and API integration."

# 2. During development - add progress
node update-linear-issue.js VIX-329 --implementation "Completed login form component with validation. Implemented JWT token storage in localStorage. Next: implement logout functionality."

# 3. When testing
node update-linear-issue.js VIX-329 --testing "Tested login flow: ✅ Valid credentials work, ✅ Invalid credentials show error, ✅ Token persists on refresh. Need to test: password reset flow."

# 4. If blocked
node update-linear-issue.js VIX-329 --comment "Blocked: Waiting for backend team to provide password reset endpoint. Expected ETA: 2 days."

# 5. When complete
node update-linear-issue.js VIX-329 --status "Done" --implementation "All acceptance criteria implemented. Code reviewed and merged to main branch." --testing "All test cases passing. Manual testing complete. Ready for QA."
```

## Status Values

Common status values (may vary by team):
- "Todo" or "Backlog"
- "In Progress" or "In Development"
- "In Review" or "Review"
- "Done" or "Completed"
- "Canceled"

The script will try to match your status string to available states in your Linear workspace. If it can't find an exact match, it will show available states.

## Notes Format

Implementation and testing notes are added to the issue description in markdown format:

```markdown
---

### Implementation Notes

_Updated: 2026-02-05_

Your implementation notes here...

---

### Testing Notes

_Updated: 2026-02-05_

Your testing notes here...
```

If sections already exist, they will be updated with new timestamps.

## Comments vs Notes

- **Comments** (`--comment`) - Appear in Linear's comment thread, useful for discussions, questions, blockers
- **Implementation/Testing Notes** (`--implementation`, `--testing`) - Added to issue description, useful for documentation and progress tracking

## Troubleshooting

### Error: "Issue not found"
- Verify the issue identifier is correct (e.g., `VIX-329`)
- Check that you have access to the issue in Linear

### Error: "State not found"
- The script will show available states for your team
- Use one of the displayed state names

### Error: "HTTP 401"
- Your API key is invalid or expired
- Get a new key at https://linear.app/settings/api

### Error: "HTTP 429"
- You're hitting Linear's rate limits
- Wait a few seconds and try again

## Integration with Development Workflow

### Before Starting Work

```powershell
node update-linear-issue.js VIX-329 --status "In Progress" --implementation "Starting work on this issue. Reviewing requirements and setting up development environment."
```

### During Development

```powershell
# After implementing a feature
node update-linear-issue.js VIX-329 --implementation "Completed feature X. Next: implement feature Y."

# After testing
node update-linear-issue.js VIX-329 --testing "Tested feature X - all tests passing. Found edge case: need to handle null values."
```

### After Completing Work

```powershell
node update-linear-issue.js VIX-329 --status "Done" --implementation "All work complete. Code reviewed and merged." --testing "All tests passing. Manual QA complete."
```
