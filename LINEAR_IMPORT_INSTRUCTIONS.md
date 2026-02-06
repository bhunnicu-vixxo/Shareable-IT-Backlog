# Linear Import Instructions

This guide will help you import the epics and stories from `epics-and-stories.md` into your Linear project.

## Prerequisites

1. **Linear API Key**: You need a Personal API Key from Linear
2. **Node.js**: Version 18 or higher installed
3. **Team ID**: Your Linear team identifier (default: `vixxo`)
4. **Project ID**: Your Linear project identifier (default: `shareable-it-backlog-51d08bd393fa`)

## Step 1: Get Your Linear API Key

1. Go to [Linear Settings → API](https://linear.app/settings/api)
2. Click "Create API Key"
3. Give it a name (e.g., "Epic Import Script")
4. Copy the API key (it starts with `lin_api_`)

⚠️ **Important**: Keep your API key secure and never commit it to version control.

## Step 2: Find Your Team and Project IDs

### Team ID
- Your team ID is typically your team's URL slug
- For example, if your team URL is `https://linear.app/vixxo`, your team ID is `vixxo`
- Default is set to `vixxo` in the script

### Project ID
- Your project ID is in the project URL
- From your URL: `https://linear.app/vixxo/project/shareable-it-backlog-51d08bd393fa/issues`
- The project ID is: `shareable-it-backlog-51d08bd393fa`
- This is already set as the default in the script

## Step 3: Run the Import Script

### Option 1: Using Environment Variables (Recommended)

**Windows PowerShell:**
```powershell
$env:LINEAR_API_KEY="your_api_key_here"
$env:LINEAR_TEAM_ID="vixxo"
$env:LINEAR_PROJECT_ID="shareable-it-backlog-51d08bd393fa"
node import-to-linear.js
```

**Windows Command Prompt:**
```cmd
set LINEAR_API_KEY=your_api_key_here
set LINEAR_TEAM_ID=vixxo
set LINEAR_PROJECT_ID=shareable-it-backlog-51d08bd393fa
node import-to-linear.js
```

**macOS/Linux:**
```bash
LINEAR_API_KEY="your_api_key_here" \
LINEAR_TEAM_ID="vixxo" \
LINEAR_PROJECT_ID="shareable-it-backlog-51d08bd393fa" \
node import-to-linear.js
```

### Option 2: Using npm script

First, set your environment variables, then:
```bash
npm run import
```

## What the Script Does

1. **Parses** the `epics-and-stories.md` file to extract:
   - Epic titles, goals, and FR coverage
   - Story titles, user stories, acceptance criteria, and technical details

2. **Creates in Linear**:
   - Epics (one for each epic in the document)
   - Issues/Stories (linked to their parent epic)

3. **Associates** everything with your specified Linear project

## Expected Output

The script will:
- Show progress as it creates each epic and story
- Display Linear URLs for each created item
- Provide a summary at the end with counts and any errors

Example output:
```
📖 Parsing epics and stories from markdown...
✅ Found 12 epics with 52 total stories

🔗 Connecting to Linear API...
✅ Team ID: abc123...
✅ Project ID: xyz789...

🚀 Starting import...
📦 Creating Epic 1: Project Foundation & Setup...
   ✅ Created: Project Foundation & Setup (https://linear.app/vixxo/epic/...)
   📝 Creating Story 1.1: Initialize Frontend Project...
      ✅ Created: VIX-123 (https://linear.app/vixxo/issue/...)
   ...

📊 Import Summary
============================================================
✅ Epics created: 12/12
✅ Stories created: 52/52
❌ Errors: 0

✨ Import complete!
```

## Troubleshooting

### Error: "LINEAR_API_KEY environment variable is required"
- Make sure you've set the `LINEAR_API_KEY` environment variable
- Check that you copied the entire API key (it should start with `lin_api_`)

### Error: "Team not found"
- Verify your `LINEAR_TEAM_ID` is correct
- Check your team URL slug in Linear

### Error: "Project not found"
- Verify your `LINEAR_PROJECT_ID` matches the project identifier in the URL
- Make sure the project exists in Linear

### Error: "HTTP error! status: 401"
- Your API key is invalid or expired
- Generate a new API key from Linear settings

### Error: "HTTP error! status: 429"
- You're hitting Linear's rate limits
- The script includes delays, but you may need to wait and retry
- Linear allows ~200 requests per minute

### Stories not linking to epics
- This can happen if there's an error creating the epic
- Check the error messages in the summary
- You may need to manually link stories to epics in Linear

## After Import

1. **Review** the created epics and stories in Linear
2. **Verify** all stories are properly linked to their epics
3. **Assign** stories to team members as needed
4. **Set** priorities, labels, or other metadata
5. **Update** story statuses as work progresses

## Notes

- The script includes rate limiting delays to respect Linear's API limits
- Large imports may take several minutes
- If the script fails partway through, you can re-run it (Linear will handle duplicates, but you may want to clean up first)
- Story titles are prefixed with "Story N.M:" to maintain numbering
- All content (user stories, acceptance criteria, technical details) is preserved in the Linear issue descriptions

## Support

If you encounter issues:
1. Check the error messages in the console output
2. Verify your API key, team ID, and project ID are correct
3. Check Linear's API status: https://status.linear.app
4. Review Linear's API documentation: https://developers.linear.app/docs
