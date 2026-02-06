#!/usr/bin/env node

/**
 * Update Linear Issue Script
 * Fetches an issue from Linear and updates its status, adds implementation notes, testing notes, and comments
 * 
 * Usage:
 *   $env:LINEAR_API_KEY="lin_api_xxx"; node update-linear-issue.js VIX-329
 *   $env:LINEAR_API_KEY="lin_api_xxx"; node update-linear-issue.js VIX-329 --status "In Progress" --implementation "Started work on..." --testing "Need to test..." --comment "Additional notes"
 */

// Allow reading key from local env files (never committed).
// Preference order:
// 1) existing process.env.LINEAR_API_KEY (explicit shell env)
// 2) backend/.env
// 3) .env (repo root)
function tryLoadLinearApiKeyFromEnvFiles() {
  if (process.env.LINEAR_API_KEY) return

  const fs = require('fs')
  const path = require('path')

  const candidates = [
    path.join(process.cwd(), 'backend', '.env'),
    path.join(process.cwd(), '.env'),
  ]

  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) continue
      const content = fs.readFileSync(filePath, 'utf8')

      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue
        if (!/^LINEAR_API_KEY\s*=/.test(line) && !/^LINEAR_API_KEY\s*=/.test(line.replace(/\s+/g, ''))) {
          // Handle weird whitespace cases (e.g., "LINEAR_API_KEY= lin_api_..." or "LINEAR_API_KEY = lin_api_...")
          if (!/^LINEAR_API_KEY\s*=/.test(line.replace(/\s*=\s*/, '='))) continue
        }

        const normalized = line.replace(/\s*=\s*/, '=')
        let value = normalized.split('=').slice(1).join('=').trim()
        // Strip optional quotes
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }

        if (value) {
          process.env.LINEAR_API_KEY = value
          return
        }
      }
    } catch {
      // ignore and try next candidate
    }
  }
}

tryLoadLinearApiKeyFromEnvFiles()

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const LINEAR_API_URL = 'https://api.linear.app/graphql';

if (!LINEAR_API_KEY) {
  console.error('ERROR: LINEAR_API_KEY environment variable is required');
  console.log('\nUsage (PowerShell):');
  console.log('  $env:LINEAR_API_KEY="lin_api_xxx"; node update-linear-issue.js VIX-329');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const issueIdentifier = args[0];

if (!issueIdentifier) {
  console.error('ERROR: Issue identifier required (e.g., VIX-329)');
  console.log('\nUsage:');
  console.log('  node update-linear-issue.js VIX-329 [options]');
  console.log('\nOptions:');
  console.log('  --status <state>           Update issue status (e.g., "In Progress", "Done", "Canceled")');
  console.log('  --implementation <notes>  Add implementation notes');
  console.log('  --testing <notes>         Add testing notes');
  console.log('  --comment <text>          Add a comment to the issue');
  console.log('  --description <text>      Update the issue description');
  process.exit(1);
}

// Parse options
const options = {};
for (let i = 1; i < args.length; i += 2) {
  const key = args[i];
  const value = args[i + 1];
  if (key && value) {
    if (key === '--status') options.status = value;
    else if (key === '--implementation') options.implementation = value;
    else if (key === '--testing') options.testing = value;
    else if (key === '--comment') options.comment = value;
    else if (key === '--description') options.description = value;
  }
}

// ============================================================
// LINEAR API CLIENT
// ============================================================

async function linearGQL(query, variables = {}) {
  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': LINEAR_API_KEY
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const json = await response.json();
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors, null, 2)}`);
  }
  return json.data;
}

// ============================================================
// LINEAR API OPERATIONS
// ============================================================

async function getIssueByIdentifier(identifier) {
  // Parse identifier (e.g., "VIX-330" → team key "VIX", number 330)
  const match = identifier.match(/^([A-Z]+)-(\d+)$/i);
  if (!match) {
    throw new Error(`Invalid identifier format: ${identifier}. Expected format: VIX-330`);
  }
  const teamKey = match[1].toUpperCase();
  const issueNumber = parseInt(match[2]);

  const searchData = await linearGQL(`
    query($filter: IssueFilter) {
      issues(filter: $filter, first: 1) {
        nodes {
          id
          identifier
          title
          description
          state {
            id
            name
            type
          }
          team {
            id
            name
            key
          }
          url
        }
      }
    }
  `, {
    filter: {
      number: { eq: issueNumber },
      team: { key: { eq: teamKey } }
    }
  });

  if (searchData.issues.nodes.length === 0) {
    throw new Error(`Issue not found: ${identifier}`);
  }
  return searchData.issues.nodes[0];
}

async function getWorkflowStates(teamId) {
  const data = await linearGQL(`
    query($teamId: String!) {
      team(id: $teamId) {
        states {
          nodes {
            id
            name
            type
            position
          }
        }
      }
    }
  `, { teamId });
  return data.team.states.nodes;
}

async function findStateByName(teamId, stateName) {
  const states = await getWorkflowStates(teamId);
  // Try exact match first
  let state = states.find(s => s.name.toLowerCase() === stateName.toLowerCase());
  if (state) return state;

  // Try partial match
  state = states.find(s => s.name.toLowerCase().includes(stateName.toLowerCase()));
  if (state) return state;

  // Try common variations
  const variations = {
    'in progress': ['in progress', 'in-progress', 'in development', 'doing', 'active'],
    'done': ['done', 'completed', 'complete', 'finished'],
    'todo': ['todo', 'to do', 'backlog', 'planned'],
    'canceled': ['canceled', 'cancelled', 'cancelled']
  };

  const lowerName = stateName.toLowerCase();
  for (const [key, variants] of Object.entries(variations)) {
    if (variants.includes(lowerName)) {
      state = states.find(s => {
        const sLower = s.name.toLowerCase();
        return variants.some(v => sLower.includes(v));
      });
      if (state) return state;
    }
  }

  return null;
}

async function updateIssueStatus(issueId, stateId) {
  const data = await linearGQL(`
    mutation($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue {
          id
          identifier
          state {
            id
            name
          }
        }
      }
    }
  `, {
    id: issueId,
    input: { stateId }
  });

  if (!data.issueUpdate.success) {
    throw new Error('Failed to update issue status');
  }
  return data.issueUpdate.issue;
}

async function updateIssueDescription(issueId, description) {
  const data = await linearGQL(`
    mutation($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue {
          id
          identifier
          description
        }
      }
    }
  `, {
    id: issueId,
    input: { description }
  });

  if (!data.issueUpdate.success) {
    throw new Error('Failed to update issue description');
  }
  return data.issueUpdate.issue;
}

async function addComment(issueId, body) {
  const data = await linearGQL(`
    mutation($input: CommentCreateInput!) {
      commentCreate(input: $input) {
        success
        comment {
          id
          body
        }
      }
    }
  `, {
    input: {
      issueId,
      body
    }
  });

  if (!data.commentCreate.success) {
    throw new Error('Failed to add comment');
  }
  return data.commentCreate.comment;
}

function appendToDescription(originalDescription, section, content) {
  if (!content) return originalDescription;

  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const sectionHeader = `\n\n---\n\n### ${section}\n\n_Updated: ${timestamp}_\n\n${content}`;

  if (!originalDescription) {
    return sectionHeader;
  }

  // Check if section already exists
  const sectionRegex = new RegExp(`### ${section}[\\s\\S]*?(?=###|$)`, 'i');
  if (sectionRegex.test(originalDescription)) {
    // Update existing section
    return originalDescription.replace(
      sectionRegex,
      `### ${section}\n\n_Updated: ${timestamp}_\n\n${content}`
    );
  }

  // Append new section
  return originalDescription + sectionHeader;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('='.repeat(60));
  console.log('  Update Linear Issue');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Step 1: Fetch the issue
    console.log(`[1/4] Fetching issue: ${issueIdentifier}...`);
    const issue = await getIssueByIdentifier(issueIdentifier);
    console.log(`       Found: ${issue.identifier} - ${issue.title}`);
    console.log(`       Current status: ${issue.state.name}`);
    console.log(`       URL: ${issue.url}\n`);

    let updated = false;
    let newDescription = issue.description || '';

    // Step 2: Update status if requested
    if (options.status) {
      console.log(`[2/4] Updating status to: "${options.status}"...`);
      const newState = await findStateByName(issue.team.id, options.status);
      
      if (!newState) {
        console.log(`       ⚠️  State "${options.status}" not found. Available states:`);
        const states = await getWorkflowStates(issue.team.id);
        states.forEach(s => console.log(`         - ${s.name} (${s.type})`));
        console.log(`       Skipping status update.\n`);
      } else {
        await updateIssueStatus(issue.id, newState.id);
        console.log(`       ✅ Status updated to: ${newState.name}\n`);
        updated = true;
      }
    } else {
      console.log(`[2/4] No status update requested\n`);
    }

    // Step 3: Add implementation notes
    if (options.implementation) {
      console.log(`[3/4] Adding implementation notes...`);
      newDescription = appendToDescription(newDescription, 'Implementation Notes', options.implementation);
      console.log(`       ✅ Implementation notes added\n`);
      updated = true;
    } else {
      console.log(`[3/4] No implementation notes provided\n`);
    }

    // Step 4: Add testing notes
    if (options.testing) {
      console.log(`[4/4] Adding testing notes...`);
      newDescription = appendToDescription(newDescription, 'Testing Notes', options.testing);
      console.log(`       ✅ Testing notes added\n`);
      updated = true;
    } else {
      console.log(`[4/4] No testing notes provided\n`);
    }

    // Update description if it changed
    if (updated && newDescription !== (issue.description || '')) {
      await updateIssueDescription(issue.id, newDescription);
      console.log(`       ✅ Description updated\n`);
    }

    // Add comment if provided
    if (options.comment) {
      console.log(`[5/5] Adding comment...`);
      await addComment(issue.id, options.comment);
      console.log(`       ✅ Comment added\n`);
    }

    // Update description directly if provided
    if (options.description) {
      console.log(`[6/6] Updating description...`);
      await updateIssueDescription(issue.id, options.description);
      console.log(`       ✅ Description updated\n`);
    }

    // Summary
    console.log('='.repeat(60));
    console.log('  Update Complete!');
    console.log('='.repeat(60));
    console.log(`  Issue: ${issue.identifier}`);
    console.log(`  Title: ${issue.title}`);
    console.log(`  URL: ${issue.url}`);
    console.log('');

  } catch (err) {
    console.error(`\nFATAL ERROR: ${err.message}`);
    if (err.message.includes('HTTP 401')) {
      console.error('Your API key is invalid or expired. Get a new one at https://linear.app/settings/api');
    }
    process.exit(1);
  }
}

main();
