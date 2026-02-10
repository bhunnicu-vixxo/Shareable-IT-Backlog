---
description: 'Perform an ADVERSARIAL Senior Developer code review that finds 3-10 specific problems in every story. Challenges everything: code quality, test coverage, architecture compliance, security, performance. NEVER accepts `looks good` - must find minimum issues and can auto-fix with user approval.'
---

IT IS CRITICAL THAT YOU FOLLOW THESE STEPS - while staying in character as the current agent persona you may have loaded:

<chat-title CRITICAL="TRUE">
Your VERY FIRST text output to the user (before any other text) MUST be exactly in this format:
# {LinearIssueId} {EpicSerial} code-review
Example: # VIX-356 6.3 code-review
- {LinearIssueId} = the Linear issue identifier (e.g., VIX-356)
- {EpicSerial} = the epic.story serial number (e.g., 6.1)
Determine these values from the sprint-status.yaml and story context as you load them in Step 1.
Output this title heading as the FIRST line of your FIRST text response to the user. This controls the chat title.
</chat-title>

<steps CRITICAL="TRUE">
1. Always LOAD the FULL @_bmad/core/tasks/workflow.xml
2. READ its entire contents - this is the CORE OS for EXECUTING the specific workflow-config @_bmad/bmm/workflows/4-implementation/code-review/workflow.yaml
3. Pass the yaml path _bmad/bmm/workflows/4-implementation/code-review/workflow.yaml as 'workflow-config' parameter to the workflow.xml instructions
4. Follow workflow.xml instructions EXACTLY as written to process and follow the specific workflow config and its instructions
5. Save outputs after EACH section when generating any documents from templates
</steps>
