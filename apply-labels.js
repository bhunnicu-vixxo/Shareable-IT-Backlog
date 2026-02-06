#!/usr/bin/env node

/**
 * Apply labels and categorization to Linear stories
 * Labels each story based on its epic category
 */

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const LINEAR_API_URL = 'https://api.linear.app/graphql';
const TEAM_ID = 'e88d881b-d99e-4b62-b8f6-db1a3a900a30'; // Vixxo team
const PROJECT_ID = '018f8064-950f-4bc7-864e-0514085bfe2c'; // Shareable IT Backlog

if (!LINEAR_API_KEY) {
  console.error('ERROR: LINEAR_API_KEY required');
  process.exit(1);
}

// ============================================================
// LABEL DEFINITIONS - color codes use Vixxo brand palette
// ============================================================

const LABEL_DEFINITIONS = [
  { name: 'Feature',        color: '#8E992E', description: 'User-facing feature or functionality' },
  { name: 'Infrastructure', color: '#3E4543', description: 'Project setup, tooling, and infrastructure' },
  { name: 'Integration',    color: '#2C7B80', description: 'External API integration (Linear GraphQL, etc.)' },
  { name: 'UI/UX',          color: '#395389', description: 'User interface and design system work' },
  { name: 'Security',       color: '#956125', description: 'Security, auth, audit, and compliance' },
  { name: 'Performance',    color: '#EDA200', description: 'Performance optimization and caching' },
  { name: 'Accessibility',  color: '#6B46C1', description: 'WCAG compliance and accessibility' },
  { name: 'DevOps',         color: '#718096', description: 'Deployment, monitoring, and operations' },
  { name: 'Backend',        color: '#2C7B80', description: 'Server-side / API work' },
  { name: 'Frontend',       color: '#395389', description: 'Client-side / React work' },
];

// ============================================================
// LABEL MAPPING - which labels to apply to stories in each epic
// ============================================================

const EPIC_LABEL_MAP = {
  // Epic 1: Project Foundation & Setup
  'VIX-329': ['Infrastructure'],
  'VIX-330': ['Infrastructure', 'Frontend'],       // Init Frontend
  'VIX-331': ['Infrastructure', 'Backend'],         // Init Backend
  'VIX-332': ['Infrastructure', 'Backend'],         // PostgreSQL
  'VIX-333': ['Infrastructure'],                    // Dev Environment

  // Epic 2: Linear API Integration
  'VIX-334': ['Integration'],
  'VIX-335': ['Integration', 'Backend'],            // GraphQL Client
  'VIX-336': ['Integration', 'Backend'],            // Rate Limit
  'VIX-337': ['Integration', 'Backend'],            // Error Handling
  'VIX-338': ['Integration', 'Backend'],            // Data Models

  // Epic 3: Backlog Display & Visualization
  'VIX-339': ['Feature', 'UI/UX'],
  'VIX-340': ['Feature', 'UI/UX', 'Frontend'],     // List View
  'VIX-341': ['Feature', 'UI/UX', 'Frontend'],     // Priority Viz
  'VIX-342': ['Feature', 'UI/UX', 'Frontend'],     // New Item Flagging
  'VIX-343': ['Feature', 'UI/UX', 'Frontend'],     // Item Detail

  // Epic 4: Filtering & Search
  'VIX-344': ['Feature', 'UI/UX'],
  'VIX-345': ['Feature', 'UI/UX', 'Frontend'],     // Business Unit Filter
  'VIX-346': ['Feature', 'UI/UX', 'Frontend'],     // Keyword Search
  'VIX-347': ['Feature', 'UI/UX', 'Frontend'],     // Sorting
  'VIX-348': ['Feature', 'UI/UX', 'Frontend'],     // Empty State

  // Epic 5: Item Detail Views
  'VIX-349': ['Feature', 'UI/UX'],
  'VIX-350': ['Feature', 'Frontend'],              // Updates/Notes
  'VIX-351': ['Feature', 'Frontend'],              // Comments
  'VIX-352': ['Feature', 'Frontend'],              // Deleted Items

  // Epic 6: Data Synchronization
  'VIX-353': ['Feature', 'Integration'],
  'VIX-354': ['Feature', 'Integration', 'Backend'],// Scheduled Sync
  'VIX-355': ['Feature', 'Integration', 'Backend'],// Manual Sync
  'VIX-356': ['Feature', 'UI/UX', 'Frontend'],     // Sync Status Display
  'VIX-357': ['Feature', 'Backend'],               // Sync Error Handling
  'VIX-358': ['Feature', 'Integration', 'Backend'],// API Unavailability
  'VIX-359': ['Feature', 'Integration', 'Backend'],// Partial Sync

  // Epic 7: User Management & Access Control
  'VIX-360': ['Feature', 'Security'],
  'VIX-361': ['Feature', 'Security', 'Backend'],   // Network Access
  'VIX-362': ['Feature', 'Security', 'Backend'],   // User Approval
  'VIX-363': ['Feature', 'UI/UX', 'Frontend'],     // Admin Dashboard
  'VIX-364': ['Feature', 'UI/UX', 'Frontend'],     // User Management UI
  'VIX-365': ['Feature', 'UI/UX', 'Frontend'],     // Sync Status Admin

  // Epic 8: Design System & UI Components
  'VIX-366': ['UI/UX'],
  'VIX-367': ['UI/UX', 'Frontend'],                // Chakra UI
  'VIX-368': ['UI/UX', 'Frontend'],                // StackRankBadge
  'VIX-369': ['UI/UX', 'Frontend'],                // BacklogItemCard
  'VIX-370': ['UI/UX', 'Frontend'],                // SyncStatusIndicator
  'VIX-371': ['UI/UX', 'Frontend'],                // BusinessUnitFilter
  'VIX-372': ['UI/UX', 'Frontend'],                // EmptyState

  // Epic 9: Performance & Optimization
  'VIX-373': ['Performance'],
  'VIX-374': ['Performance', 'Frontend'],           // Client-Side Cache
  'VIX-375': ['Performance', 'Frontend'],           // Virtual Scrolling
  'VIX-376': ['Performance', 'Backend'],            // API Response
  'VIX-377': ['Performance', 'UI/UX', 'Frontend'],  // Loading States

  // Epic 10: Security & Audit
  'VIX-378': ['Security'],
  'VIX-379': ['Security', 'Backend'],              // HTTPS/Encryption
  'VIX-380': ['Security', 'Backend'],              // User Audit Logging
  'VIX-381': ['Security', 'Backend'],              // Admin Audit Logging
  'VIX-382': ['Security', 'Backend'],              // Credential Storage

  // Epic 11: Accessibility & Testing
  'VIX-383': ['Accessibility'],
  'VIX-384': ['Accessibility', 'Frontend'],         // Keyboard Nav
  'VIX-385': ['Accessibility', 'Frontend'],         // Screen Reader
  'VIX-386': ['Accessibility', 'UI/UX', 'Frontend'],// Color Contrast
  'VIX-387': ['Accessibility', 'Frontend'],         // A11y Testing

  // Epic 12: Deployment & Operations
  'VIX-388': ['DevOps'],
  'VIX-389': ['DevOps', 'Infrastructure'],          // Prod Build
  'VIX-390': ['DevOps', 'Backend'],                // Health Checks
  'VIX-391': ['DevOps'],                           // Documentation
  'VIX-392': ['DevOps', 'Backend'],                // Error Recovery
};

// Priority mapping: 1=Urgent, 2=High, 3=Medium, 4=Low
// Earlier epics are higher priority (foundation first)
const EPIC_PRIORITY_MAP = {
  1: 2,   // Project Foundation → High
  2: 2,   // Linear API Integration → High
  3: 2,   // Backlog Display → High
  4: 3,   // Filtering & Search → Medium
  5: 3,   // Item Detail Views → Medium
  6: 2,   // Data Sync → High
  7: 3,   // User Mgmt → Medium
  8: 3,   // Design System → Medium
  9: 4,   // Performance → Low
  10: 3,  // Security → Medium
  11: 4,  // Accessibility → Low
  12: 4,  // Deployment → Low
};

// ============================================================
// LINEAR API
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
    throw new Error(`GraphQL: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

async function getTeamLabels(teamId) {
  // Get labels that belong to a specific team
  const data = await linearGQL(`
    query($teamId: String!) {
      team(id: $teamId) {
        labels(first: 200) {
          nodes { id name color }
        }
      }
    }
  `, { teamId });
  return data.team.labels.nodes;
}

async function getWorkspaceLabels() {
  // Get all workspace-level labels (no team)
  const data = await linearGQL(`
    query {
      issueLabels(first: 200, filter: { team: { null: true } }) {
        nodes { id name color }
      }
    }
  `);
  return data.issueLabels.nodes;
}

async function createLabel(teamId, name, color, description) {
  const data = await linearGQL(`
    mutation($input: IssueLabelCreateInput!) {
      issueLabelCreate(input: $input) {
        success
        issueLabel { id name color }
      }
    }
  `, {
    input: { teamId, name, color, description }
  });
  return data.issueLabelCreate.issueLabel;
}

async function createWorkspaceLabel(name, color, description) {
  // Create a workspace-level label (no team)
  const data = await linearGQL(`
    mutation($input: IssueLabelCreateInput!) {
      issueLabelCreate(input: $input) {
        success
        issueLabel { id name color }
      }
    }
  `, {
    input: { name, color, description }
  });
  return data.issueLabelCreate.issueLabel;
}

async function getProjectIssues() {
  // Get all issues in the project
  const data = await linearGQL(`
    query($projectId: String!) {
      project(id: $projectId) {
        issues(first: 100) {
          nodes {
            id
            identifier
            title
            labels { nodes { id name } }
          }
        }
      }
    }
  `, { projectId: PROJECT_ID });
  return data.project.issues.nodes;
}

async function updateIssueLabels(issueId, labelIds) {
  const data = await linearGQL(`
    mutation($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue { id identifier }
      }
    }
  `, {
    id: issueId,
    input: { labelIds }
  });
  return data.issueUpdate.success;
}

async function updateIssuePriority(issueId, priority) {
  const data = await linearGQL(`
    mutation($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue { id identifier }
      }
    }
  `, {
    id: issueId,
    input: { priority }
  });
  return data.issueUpdate.success;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('='.repeat(60));
  console.log('  Apply Labels to Linear Stories');
  console.log('='.repeat(60));
  console.log('');

  // Step 1: Get labels for the Vixxo team and workspace-level labels
  console.log('[1/5] Checking labels for Vixxo team...');
  const teamLabels = await getTeamLabels(TEAM_ID);
  let wsLabels = [];
  try {
    wsLabels = await getWorkspaceLabels();
  } catch (e) {
    // workspace label query might not work with filter
  }

  const labelMap = {}; // name -> id (only labels usable by Vixxo team)

  // Team labels are always usable
  for (const label of teamLabels) {
    labelMap[label.name] = label.id;
  }
  // Workspace labels (no team) are usable by all teams
  for (const label of wsLabels) {
    if (!labelMap[label.name]) {
      labelMap[label.name] = label.id;
    }
  }
  console.log(`       Found ${teamLabels.length} team labels, ${wsLabels.length} workspace labels\n`);

  // Step 2: Create missing labels under the Vixxo team
  console.log('[2/5] Creating missing labels for Vixxo team...');
  for (const def of LABEL_DEFINITIONS) {
    if (labelMap[def.name]) {
      console.log(`       "${def.name}" - already exists (${labelMap[def.name].substring(0, 8)}...)`);
    } else {
      try {
        const label = await createLabel(TEAM_ID, def.name, def.color, def.description);
        labelMap[def.name] = label.id;
        console.log(`       "${def.name}" - CREATED for Vixxo team (${def.color})`);
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.log(`       "${def.name}" - error: ${err.message.substring(0, 80)}`);
        // If it exists at workspace level, try to find it
        try {
          const allData = await linearGQL(`query { issueLabels(first: 250) { nodes { id name color parent { id } team { id } } } }`);
          const match = allData.issueLabels.nodes.find(l =>
            l.name === def.name && (!l.team || l.team.id === TEAM_ID)
          );
          if (match) {
            labelMap[def.name] = match.id;
            console.log(`       "${def.name}" - found compatible label (${match.id.substring(0, 8)}...)`);
          }
        } catch (e2) {
          // give up on this label
        }
      }
    }
  }
  console.log('');

  // Step 3: Get all project issues
  console.log('[3/5] Fetching project issues...');
  const issues = await getProjectIssues();
  console.log(`       Found ${issues.length} issues in project\n`);

  // Step 4: Apply labels
  console.log('[4/5] Applying labels to stories...');
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const issue of issues) {
    const identifier = issue.identifier;
    const targetLabelNames = EPIC_LABEL_MAP[identifier];

    if (!targetLabelNames) {
      console.log(`  ${identifier}: No label mapping found - skipping`);
      skipped++;
      continue;
    }

    // Collect all label IDs: existing labels + new labels
    const existingLabelIds = issue.labels.nodes.map(l => l.id);
    const newLabelIds = targetLabelNames
      .map(name => labelMap[name])
      .filter(id => id && !existingLabelIds.includes(id));

    if (newLabelIds.length === 0) {
      console.log(`  ${identifier}: ${issue.title.substring(0, 50)} - already labeled`);
      skipped++;
      continue;
    }

    const allLabelIds = [...existingLabelIds, ...newLabelIds];

    try {
      await updateIssueLabels(issue.id, allLabelIds);
      const labelNames = targetLabelNames.join(', ');
      console.log(`  ${identifier}: + ${labelNames}`);
      updated++;
      await new Promise(r => setTimeout(r, 150));
    } catch (err) {
      console.error(`  ${identifier}: ERROR - ${err.message.substring(0, 80)}`);
      errors++;
    }
  }
  console.log('');

  // Step 5: Apply priorities
  console.log('[5/5] Setting priorities...');
  let priorityUpdated = 0;
  const priorityLabels = { 1: 'Urgent', 2: 'High', 3: 'Medium', 4: 'Low' };

  for (const issue of issues) {
    const identifier = issue.identifier;
    // Extract epic number from identifier (VIX-329 is Epic 1, etc.)
    const epicMapping = {
      329: 1, 330: 1, 331: 1, 332: 1, 333: 1,
      334: 2, 335: 2, 336: 2, 337: 2, 338: 2,
      339: 3, 340: 3, 341: 3, 342: 3, 343: 3,
      344: 4, 345: 4, 346: 4, 347: 4, 348: 4,
      349: 5, 350: 5, 351: 5, 352: 5,
      353: 6, 354: 6, 355: 6, 356: 6, 357: 6, 358: 6, 359: 6,
      360: 7, 361: 7, 362: 7, 363: 7, 364: 7, 365: 7,
      366: 8, 367: 8, 368: 8, 369: 8, 370: 8, 371: 8, 372: 8,
      373: 9, 374: 9, 375: 9, 376: 9, 377: 9,
      378: 10, 379: 10, 380: 10, 381: 10, 382: 10,
      383: 11, 384: 11, 385: 11, 386: 11, 387: 11,
      388: 12, 389: 12, 390: 12, 391: 12, 392: 12,
    };

    const issueNum = parseInt(identifier.replace('VIX-', ''));
    const epicNum = epicMapping[issueNum];

    if (!epicNum) continue;

    const priority = EPIC_PRIORITY_MAP[epicNum];
    if (!priority) continue;

    try {
      await updateIssuePriority(issue.id, priority);
      console.log(`  ${identifier}: Priority → ${priorityLabels[priority]}`);
      priorityUpdated++;
      await new Promise(r => setTimeout(r, 150));
    } catch (err) {
      console.error(`  ${identifier}: Priority ERROR - ${err.message.substring(0, 60)}`);
    }
  }

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('  Labeling Complete!');
  console.log('='.repeat(60));
  console.log(`  Labels applied:     ${updated} issues`);
  console.log(`  Already labeled:    ${skipped} issues`);
  console.log(`  Priorities set:     ${priorityUpdated} issues`);
  console.log(`  Errors:             ${errors}`);
  console.log('');
  console.log('  Labels created:');
  for (const def of LABEL_DEFINITIONS) {
    if (labelMap[def.name]) {
      console.log(`    ${def.color} ${def.name}`);
    }
  }
  console.log('');
  console.log(`  View: https://linear.app/vixxo/project/shareable-it-backlog-51d08bd393fa/issues`);
  console.log('');
}

main().catch(err => {
  console.error(`\nFATAL: ${err.message}`);
  process.exit(1);
});
