# Quick Reference: Working with Linear Issues

## Setup (One-time per session)

```powershell
$env:LINEAR_API_KEY="lin_api_xxx"
```

## Common Commands

### Start Working on an Issue
```powershell
node update-linear-issue.js VIX-329 --status "In Progress" --implementation "Starting work..."
```

### Add Progress Update
```powershell
node update-linear-issue.js VIX-329 --implementation "Completed feature X"
```

### Add Testing Notes
```powershell
node update-linear-issue.js VIX-329 --testing "Tested feature X - all tests passing"
```

### Add Comment
```powershell
node update-linear-issue.js VIX-329 --comment "Blocked on API endpoint"
```

### Mark as Done
```powershell
node update-linear-issue.js VIX-329 --status "Done" --implementation "All work complete" --testing "All tests passing"
```

## Using npm script

```powershell
npm run update-issue VIX-329 --status "In Progress"
```

## For AI Assistant

When working on a Linear issue:

1. **Fetch and start**: `node update-linear-issue.js <ID> --status "In Progress" --implementation "Starting work..."`
2. **Update progress**: `node update-linear-issue.js <ID> --implementation "Progress update..."`
3. **Add testing**: `node update-linear-issue.js <ID> --testing "Testing notes..."`
4. **Add comments**: `node update-linear-issue.js <ID> --comment "Comment text..."`
5. **Complete**: `node update-linear-issue.js <ID> --status "Done" --implementation "Complete" --testing "All tests passing"`

See `LINEAR_ISSUE_WORKFLOW.md` for detailed documentation.
