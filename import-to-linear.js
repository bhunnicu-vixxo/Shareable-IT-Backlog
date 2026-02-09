#!/usr/bin/env node

/**
 * Linear Import Script
 * Imports epics (as parent issues) and stories (as sub-issues) into Linear
 * 
 * Usage:
 *   $env:LINEAR_API_KEY="lin_api_xxx"; node import-to-linear.js
 */

const fs = require('fs');
const path = require('path');

// Allow reading key from local env files (never committed).
// Preference order:
// 1) existing process.env.LINEAR_API_KEY (explicit shell env)
// 2) backend/.env
// 3) .env (repo root)
function tryLoadLinearApiKeyFromEnvFiles() {
  if (process.env.LINEAR_API_KEY) return

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
        const normalized = line.replace(/\s*=\s*/, '=')
        if (!/^LINEAR_API_KEY=/.test(normalized)) continue

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

// Configuration
const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const LINEAR_API_URL = 'https://api.linear.app/graphql';
const PROJECT_SLUG_MATCH = 'shareable-it-backlog';

if (!LINEAR_API_KEY) {
  console.error('ERROR: LINEAR_API_KEY environment variable is required');
  console.log('\nUsage (PowerShell):');
  console.log('  $env:LINEAR_API_KEY="lin_api_xxx"; node import-to-linear.js');
  process.exit(1);
}

// Read the epics document
const epicsFile = path.join(__dirname, '_bmad-output', 'planning-artifacts', 'epics-and-stories.md');
const epicsContent = fs.readFileSync(epicsFile, 'utf-8');

// ============================================================
// MARKDOWN PARSER
// ============================================================

function parseEpicsAndStories(content) {
  const epics = [];
  // Normalize line endings (handle \r\n from Windows)
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let currentEpic = null;
  let currentStory = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect Epic header: ## Epic N: Title
    const epicMatch = line.match(/^## Epic (\d+): (.+)$/);
    if (epicMatch) {
      if (currentStory && currentEpic) {
        currentEpic.stories.push(currentStory);
        currentStory = null;
      }
      if (currentEpic) {
        epics.push(currentEpic);
      }
      currentEpic = {
        number: parseInt(epicMatch[1]),
        title: epicMatch[2],
        goal: '',
        frCoverage: '',
        stories: []
      };
      continue;
    }

    // Detect Goal (on same line or next line)
    if (currentEpic && line.startsWith('**Goal:**')) {
      const inlineGoal = line.replace('**Goal:**', '').trim();
      if (inlineGoal) {
        currentEpic.goal = inlineGoal;
      } else {
        // Goal is on next line(s)
        let goalLines = [];
        let j = i + 1;
        while (j < lines.length && lines[j].trim() && !lines[j].startsWith('**') && !lines[j].startsWith('#')) {
          goalLines.push(lines[j].trim());
          j++;
        }
        currentEpic.goal = goalLines.join(' ');
        i = j - 1;
      }
      continue;
    }

    // Detect FR Coverage
    if (currentEpic && line.startsWith('**FR Coverage:**')) {
      currentEpic.frCoverage = line.replace('**FR Coverage:**', '').trim();
      continue;
    }

    // Detect Story header: ### Story N.M: Title
    const storyMatch = line.match(/^### Story (\d+)\.(\d+): (.+)$/);
    if (storyMatch && currentEpic) {
      if (currentStory) {
        currentEpic.stories.push(currentStory);
      }
      currentStory = {
        epicNumber: parseInt(storyMatch[1]),
        storyNumber: parseInt(storyMatch[2]),
        title: storyMatch[3],
        userStory: '',
        acceptanceCriteria: '',
        technicalDetails: ''
      };
      continue;
    }

    // Collect user story
    if (currentStory && line.match(/^As a /)) {
      const userStoryLines = [line];
      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith('**Acceptance') && !lines[j].startsWith('###') && !lines[j].startsWith('## ')) {
        if (lines[j].trim()) userStoryLines.push(lines[j]);
        j++;
      }
      currentStory.userStory = userStoryLines.join('\n').trim();
      i = j - 1;
      continue;
    }

    // Collect acceptance criteria
    if (currentStory && line.startsWith('**Acceptance Criteria:**')) {
      const acLines = [];
      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith('**Technical Details:**') && !lines[j].startsWith('###') && !lines[j].startsWith('## ')) {
        if (lines[j].trim()) acLines.push(lines[j]);
        j++;
      }
      currentStory.acceptanceCriteria = acLines.join('\n').trim();
      i = j - 1;
      continue;
    }

    // Collect technical details
    if (currentStory && line.startsWith('**Technical Details:**')) {
      const tdLines = [];
      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith('###') && !lines[j].startsWith('## ')) {
        if (lines[j].trim()) tdLines.push(lines[j]);
        j++;
      }
      currentStory.technicalDetails = tdLines.join('\n').trim();
      i = j - 1;
      continue;
    }
  }

  // Capture final story/epic
  if (currentStory && currentEpic) {
    currentEpic.stories.push(currentStory);
  }
  if (currentEpic) {
    epics.push(currentEpic);
  }

  return epics;
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

async function verifyAuth() {
  const data = await linearGQL(`query { viewer { id name email } }`);
  return data.viewer;
}

async function getTeams() {
  const data = await linearGQL(`query { teams { nodes { id name key } } }`);
  return data.teams.nodes;
}

async function getProjects() {
  const data = await linearGQL(`
    query {
      projects(first: 50) {
        nodes {
          id
          name
          slugId
          url
          state
        }
      }
    }
  `);
  return data.projects.nodes;
}

async function getTeamLabels(teamId) {
  const data = await linearGQL(`
    query($filter: IssueLabelFilter) {
      issueLabels(filter: $filter) {
        nodes { id name color }
      }
    }
  `, { filter: { team: { id: { eq: teamId } } } });
  return data.issueLabels.nodes;
}

async function createLabel(teamId, name, color) {
  const data = await linearGQL(`
    mutation($input: IssueLabelCreateInput!) {
      issueLabelCreate(input: $input) {
        success
        issueLabel { id name }
      }
    }
  `, { input: { teamId, name, color } });

  if (!data.issueLabelCreate.success) {
    throw new Error(`Failed to create label: ${name}`);
  }
  return data.issueLabelCreate.issueLabel;
}

async function createIssue(teamId, title, description, options = {}) {
  const input = {
    teamId,
    title,
    description,
    ...(options.projectId && { projectId: options.projectId }),
    ...(options.parentId && { parentId: options.parentId }),
    ...(options.labelIds && options.labelIds.length > 0 && { labelIds: options.labelIds })
  };

  const data = await linearGQL(`
    mutation($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          title
          url
        }
      }
    }
  `, { input });

  if (!data.issueCreate.success) {
    throw new Error(`Failed to create issue: ${title}`);
  }
  return data.issueCreate.issue;
}

// ============================================================
// FORMATTERS
// ============================================================

function formatEpicDescription(epic) {
  let desc = '';
  if (epic.goal) desc += `**Goal:** ${epic.goal}\n\n`;
  if (epic.frCoverage) desc += `**FR Coverage:** ${epic.frCoverage}\n\n`;
  desc += `This epic contains **${epic.stories.length}** stories.\n\n`;
  desc += `### Stories\n`;
  for (const story of epic.stories) {
    desc += `- Story ${story.epicNumber}.${story.storyNumber}: ${story.title}\n`;
  }
  return desc;
}

function formatStoryDescription(story) {
  let desc = '';
  if (story.userStory) desc += `### User Story\n\n${story.userStory}\n\n`;
  if (story.acceptanceCriteria) desc += `### Acceptance Criteria\n\n${story.acceptanceCriteria}\n\n`;
  if (story.technicalDetails) desc += `### Technical Details\n\n${story.technicalDetails}`;
  return desc;
}

// ============================================================
// MAIN IMPORT LOGIC
// ============================================================

async function main() {
  console.log('='.repeat(60));
  console.log('  Linear Import - Shareable Linear Backlog');
  console.log('='.repeat(60));
  console.log('');

  // Step 1: Parse epics from markdown
  console.log('[1/6] Parsing epics and stories from markdown...');
  const epics = parseEpicsAndStories(epicsContent);
  const totalStories = epics.reduce((sum, e) => sum + e.stories.length, 0);
  console.log(`       Found ${epics.length} epics with ${totalStories} total stories\n`);

  // Step 2: Verify authentication
  console.log('[2/6] Verifying Linear API authentication...');
  const viewer = await verifyAuth();
  console.log(`       Authenticated as: ${viewer.name} (${viewer.email})\n`);

  // Step 3: Find project and its associated team
  console.log('[3/6] Finding project and team...');
  const projects = await getProjects();
  let project = projects.find(p =>
    p.slugId === 'shareable-it-backlog-51d08bd393fa' ||
    p.url?.includes('shareable-it-backlog') ||
    p.name?.toLowerCase().includes('shareable')
  );

  if (!project) {
    console.log('       Available projects:');
    projects.forEach(p => console.log(`         - ${p.name} (${p.slugId}) [${p.state}]`));
    throw new Error('Could not find "Shareable IT Backlog" project. Please check project name.');
  }
  console.log(`       Using project: ${project.name} (ID: ${project.id})`);

  // Step 4: Get the team associated with this project
  console.log('[4/6] Finding team for project...');
  const projectTeamData = await linearGQL(`
    query($id: String!) {
      project(id: $id) {
        teams { nodes { id name key } }
      }
    }
  `, { id: project.id });

  const projectTeams = projectTeamData.project.teams.nodes;
  if (projectTeams.length === 0) {
    // Fallback: use first available team
    const allTeams = await getTeams();
    if (allTeams.length === 0) throw new Error('No teams found');
    var team = allTeams[0];
  } else {
    var team = projectTeams[0];
  }
  console.log(`       Using team: ${team.name} (${team.key}) - ID: ${team.id}\n`);

  // Step 5: Find Epic label (search team-level and workspace-level)
  console.log('[5/6] Setting up Epic label...');
  let epicLabel = null;

  // First try team-level labels
  try {
    const teamLabels = await getTeamLabels(team.id);
    epicLabel = teamLabels.find(l => l.name === 'Epic');
  } catch (e) {
    // Team label query failed, try workspace-level
  }

  // If not found at team level, search all labels in workspace
  if (!epicLabel) {
    try {
      const allLabelsData = await linearGQL(`query { issueLabels(first: 100) { nodes { id name color } } }`);
      epicLabel = allLabelsData.issueLabels.nodes.find(l => l.name === 'Epic');
    } catch (e) {
      // Fallback
    }
  }

  // Create if still not found
  if (!epicLabel) {
    try {
      epicLabel = await createLabel(team.id, 'Epic', '#8E992E');
      console.log(`       Created "Epic" label\n`);
    } catch (e) {
      // Label exists but couldn't be found - try one more time with broader search
      console.log(`       Note: "Epic" label exists but using workspace search...`);
      const allLabelsData = await linearGQL(`query { issueLabels(first: 200) { nodes { id name color } } }`);
      epicLabel = allLabelsData.issueLabels.nodes.find(l => l.name === 'Epic');
      if (!epicLabel) {
        console.log(`       WARNING: Could not find "Epic" label. Proceeding without epic label.\n`);
      }
    }
  }

  if (epicLabel) {
    console.log(`       Using "Epic" label (ID: ${epicLabel.id})\n`);
  }

  // Step 6: Import epics and stories
  console.log('[6/6] Importing epics and stories into Linear...');
  console.log('');

  const results = { epicsCreated: 0, storiesCreated: 0, errors: [] };

  for (const epic of epics) {
    try {
      // Create epic as a parent issue with "Epic" label
      const epicTitle = `[Epic ${epic.number}] ${epic.title}`;
      const epicDesc = formatEpicDescription(epic);

      console.log(`  Creating Epic ${epic.number}: ${epic.title}...`);
      const epicIssue = await createIssue(team.id, epicTitle, epicDesc, {
        projectId: project.id,
        ...(epicLabel && { labelIds: [epicLabel.id] })
      });
      console.log(`    -> ${epicIssue.identifier}: ${epicIssue.url}`);
      results.epicsCreated++;

      // Create stories as sub-issues
      for (const story of epic.stories) {
        try {
          const storyTitle = `${story.title}`;
          const storyDesc = formatStoryDescription(story);

          console.log(`    Creating Story ${story.epicNumber}.${story.storyNumber}: ${story.title}...`);
          const storyIssue = await createIssue(team.id, storyTitle, storyDesc, {
            projectId: project.id,
            parentId: epicIssue.id
          });
          console.log(`      -> ${storyIssue.identifier}: ${storyIssue.url}`);
          results.storiesCreated++;

          // Rate limit protection (200ms between requests)
          await new Promise(r => setTimeout(r, 200));
        } catch (err) {
          console.error(`      ERROR on Story ${story.epicNumber}.${story.storyNumber}: ${err.message}`);
          results.errors.push(`Story ${story.epicNumber}.${story.storyNumber}: ${err.message}`);
        }
      }

      console.log('');
      // Rate limit protection between epics
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`  ERROR on Epic ${epic.number}: ${err.message}`);
      results.errors.push(`Epic ${epic.number}: ${err.message}`);
      console.log('');
    }
  }

  // Summary
  console.log('='.repeat(60));
  console.log('  Import Complete!');
  console.log('='.repeat(60));
  console.log(`  Epics created:   ${results.epicsCreated}/${epics.length}`);
  console.log(`  Stories created:  ${results.storiesCreated}/${totalStories}`);
  console.log(`  Errors:           ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log('\n  Errors:');
    results.errors.forEach(e => console.log(`    - ${e}`));
  }

  console.log(`\n  View project: ${project.url || 'https://linear.app/vixxo/project/shareable-it-backlog-51d08bd393fa/issues'}`);
  console.log('');
}

main().catch(err => {
  console.error(`\nFATAL ERROR: ${err.message}`);
  if (err.message.includes('HTTP 401')) {
    console.error('Your API key is invalid or expired. Get a new one at https://linear.app/settings/api');
  }
  process.exit(1);
});
