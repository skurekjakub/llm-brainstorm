import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { JiraManager } from '../services/jira';
import { JiraComment } from '../services/jira/types';
import { BaseToolConfig, ToolCreator } from './base-tool';

/**
 * JIRA Issue Tool
 * 
 * Fetches JIRA issue data by project key and issue number.
 * Returns comprehensive issue information including description, status, assignee, etc.
 */

export class JiraIssueTool implements ToolCreator {
  private jiraManager: JiraManager;

  constructor() {
    this.jiraManager = JiraManager.getInstance();
  }

  createTool(): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name: "jira_get_issue",
      description: "Fetch detailed information about a JIRA issue by project key and issue number. Returns issue summary, description, status, assignee, priority, and other metadata.",
      schema: z.object({
        projectKey: z.string().describe("The JIRA project key (e.g., 'DOC', 'PROJ')"),
        issueNumber: z.string().describe("The issue number (e.g., '123', '2848')")
      }),
      func: async ({ projectKey, issueNumber }) => {
        try {
          // Validate inputs
          if (!projectKey || !issueNumber) {
            return "Error: Both projectKey and issueNumber are required";
          }

          // Check if JIRA is configured
          if (!this.jiraManager.isConfigured()) {
            return "Error: JIRA is not configured. Please set JIRA_BASE_URL, JIRA_USERNAME, and JIRA_API_TOKEN in environment variables.";
          }

          // Construct issue key
          const issueKey = `${projectKey.toUpperCase()}-${issueNumber}`;

          // Fetch the issue
          const issue = await this.jiraManager.issues.getIssue(issueKey);

          // Fetch comments for the issue
          const comments = await this.jiraManager.issues.getIssueComments(issueKey);

          // Format the response for the AI agent
          const formattedResponse = {
            key: issue.key,
            summary: issue.fields.summary,
            description: issue.fields.descriptionText || 'No description available',
            status: issue.fields.status.name,
            statusCategory: issue.fields.status.statusCategory.name,
            priority: issue.fields.priority.name,
            issueType: issue.fields.issuetype.name,
            project: {
              key: issue.fields.project.key,
              name: issue.fields.project.name
            },
            assignee: issue.fields.assignee ? {
              name: issue.fields.assignee.displayName,
              email: issue.fields.assignee.emailAddress
            } : null,
            reporter: {
              name: issue.fields.reporter.displayName,
              email: issue.fields.reporter.emailAddress
            },
            created: new Date(issue.fields.created).toLocaleDateString(),
            updated: new Date(issue.fields.updated).toLocaleDateString(),
            labels: issue.fields.labels || [],
            components: issue.fields.components?.map(c => c.name) || [],
            url: `${this.jiraManager.getConnectionInfo ? 
              (await this.jiraManager.getConnectionInfo()).baseUrl : 
              process.env.JIRA_BASE_URL}/browse/${issue.key}`
          };

          return `JIRA Issue: ${formattedResponse.key}

📋 **Summary**: ${formattedResponse.summary}

📝 **Description**: ${formattedResponse.description}

📊 **Status**: ${formattedResponse.status} (${formattedResponse.statusCategory})

👤 **Assignee**: ${formattedResponse.assignee ? 
  `${formattedResponse.assignee.name} (${formattedResponse.assignee.email})` : 
  'Unassigned'}

💬 **Comments** (${comments.total} total):
${comments.comments.length > 0 ? 
  comments.comments.map((comment: JiraComment, index: number) => 
    `${index + 1}. **${comment.author.displayName}**:
${comment.bodyText || 'No comment text'}
`
  ).join('\n')
  : 'No comments available'}`;

        } catch (error) {
          // Handle specific JIRA errors
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          if (errorMessage.includes('404') || errorMessage.includes('not found')) {
            return `Error: Issue ${projectKey.toUpperCase()}-${issueNumber} not found. Please check the project key and issue number.`;
          } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
            return `Error: Access denied to issue ${projectKey.toUpperCase()}-${issueNumber}. Check your JIRA permissions.`;
          } else if (errorMessage.includes('connection')) {
            return `Error: Unable to connect to JIRA. Please check your JIRA configuration and network connection.`;
          }
          
          return `Error fetching JIRA issue: ${errorMessage}`;
        }
      }
    });
  }

  getConfig(): BaseToolConfig {
    return {
      name: "jira_get_issue",
      description: "Fetch JIRA issue information by project key and issue number",
      enabled: this.jiraManager.isConfigured(),
      dependencies: ["JIRA_BASE_URL", "JIRA_USERNAME", "JIRA_API_TOKEN"]
    };
  }

  isEnabled(): boolean {
    return this.jiraManager.isConfigured();
  }

  /**
   * Get tool usage examples for documentation
   */
  getUsageExamples(): string[] {
    return [
      "Get issue DOC-2848: jira_get_issue({projectKey: 'DOC', issueNumber: '2848'})",
      "Get issue PROJ-123: jira_get_issue({projectKey: 'PROJ', issueNumber: '123'})",
      "Get issue ABC-456: jira_get_issue({projectKey: 'abc', issueNumber: '456'})"
    ];
  }
}
