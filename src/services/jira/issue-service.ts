import { JiraClient } from './client';
import { JiraIssue, JiraSearchResult, JiraComment, JiraCommentsResponse } from './types';

/**
 * JIRA Issue Service
 * 
 * Handles all issue-related operations including:
 * - Fetching individual issues
 * - Searching issues with JQL
 * - Getting issue metadata
 */

export class JiraIssueService {
  private client: JiraClient;

  constructor(client: JiraClient) {
    this.client = client;
  }

  /**
   * Get a specific issue by key
   */
  async getIssue(issueKey: string): Promise<JiraIssue> {
    try {
      // Use expand parameter to get rendered fields (HTML format)
      const issue = await this.client.get(`/issue/${issueKey}`, {
        expand: 'renderedFields'
      });
      return issue;
    } catch (error) {
      throw new Error(`Failed to fetch issue ${issueKey}: ${error}`);
    }
  }

  /**
   * Get a specific issue by key with plain text description
   */
  async getIssueWithTextDescription(issueKey: string): Promise<JiraIssue> {
    try {
      // Get the issue with both regular and rendered fields
      const issue = await this.client.get(`/issue/${issueKey}`, {
        expand: 'renderedFields',
        fields: '*all'
      });
      
      // If renderedFields has description, use that (it's HTML)
      if (issue.renderedFields?.description) {
        // Strip HTML tags for plain text
        const plainText = issue.renderedFields.description
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
          .replace(/&amp;/g, '&')  // Decode HTML entities
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();
        
        // Add plain text description to the issue
        issue.fields.descriptionText = plainText;
      }
      
      return issue;
    } catch (error) {
      throw new Error(`Failed to fetch issue ${issueKey}: ${error}`);
    }
  }

  /**
   * Search for issues using JQL
   */
  async searchIssues(jql: string, maxResults: number = 50, startAt: number = 0): Promise<JiraSearchResult> {
    try {
      const searchData = {
        jql,
        maxResults,
        startAt,
        expand: ['renderedFields'],
        fields: [
          'summary',
          'description',
          'status',
          'priority',
          'issuetype',
          'project',
          'assignee',
          'reporter',
          'created',
          'updated',
          'labels',
          'components'
        ]
      };

      const result = await this.client.post('/search', searchData);
      
      // Post-process to add plain text descriptions
      if (result.issues) {
        result.issues.forEach((issue: any) => {
          if (issue.renderedFields?.description) {
            // Strip HTML tags for plain text
            const plainText = issue.renderedFields.description
              .replace(/<[^>]*>/g, '') // Remove HTML tags
              .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
              .replace(/&amp;/g, '&')  // Decode HTML entities
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .trim();
            
            issue.fields.descriptionText = plainText;
          }
        });
      }
      
      return result;
    } catch (error) {
      throw new Error(`Failed to search issues with JQL "${jql}": ${error}`);
    }
  }

  /**
   * Get issues for a specific project
   */
  async getProjectIssues(projectKey: string, maxResults: number = 50): Promise<JiraSearchResult> {
    const jql = `project = "${projectKey}" ORDER BY updated DESC`;
    return this.searchIssues(jql, maxResults);
  }

  /**
   * Get issues assigned to a specific user
   */
  async getAssignedIssues(username: string, maxResults: number = 50): Promise<JiraSearchResult> {
    const jql = `assignee = "${username}" ORDER BY updated DESC`;
    return this.searchIssues(jql, maxResults);
  }

  /**
   * Get recently updated issues
   */
  async getRecentlyUpdatedIssues(days: number = 7, maxResults: number = 50): Promise<JiraSearchResult> {
    const jql = `updated >= -${days}d ORDER BY updated DESC`;
    return this.searchIssues(jql, maxResults);
  }

  /**
   * Get issues by status
   */
  async getIssuesByStatus(status: string, projectKey?: string, maxResults: number = 50): Promise<JiraSearchResult> {
    let jql = `status = "${status}"`;
    if (projectKey) {
      jql += ` AND project = "${projectKey}"`;
    }
    jql += ' ORDER BY updated DESC';
    return this.searchIssues(jql, maxResults);
  }

  /**
   * Search issues by text (in summary and description)
   */
  async searchIssuesByText(searchText: string, projectKey?: string, maxResults: number = 50): Promise<JiraSearchResult> {
    let jql = `text ~ "${searchText}"`;
    if (projectKey) {
      jql += ` AND project = "${projectKey}"`;
    }
    jql += ' ORDER BY updated DESC';
    return this.searchIssues(jql, maxResults);
  }

  /**
   * Get issue count for a JQL query
   */
  async getIssueCount(jql: string): Promise<number> {
    try {
      const result = await this.searchIssues(jql, 1);
      return result.total;
    } catch (error) {
      throw new Error(`Failed to get issue count for JQL "${jql}": ${error}`);
    }
  }

  /**
   * Get comments for a specific issue
   */
  async getIssueComments(issueKey: string, maxResults: number = 50, startAt: number = 0): Promise<JiraCommentsResponse> {
    try {
      const params = {
        maxResults,
        startAt,
        expand: 'renderedBody'
      };

      const response = await this.client.get(`/issue/${issueKey}/comment`, params);
      
      // Post-process to add plain text versions of comments
      if (response.comments) {
        response.comments.forEach((comment: any) => {
          if (comment.renderedBody) {
            // Strip HTML tags for plain text
            const plainText = comment.renderedBody
              .replace(/<[^>]*>/g, '') // Remove HTML tags
              .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
              .replace(/&amp;/g, '&')  // Decode HTML entities
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .trim();
            
            comment.bodyText = plainText;
          }
        });
      }
      
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch comments for issue ${issueKey}: ${error}`);
    }
  }

  /**
   * Get a specific comment by ID
   */
  async getComment(issueKey: string, commentId: string): Promise<JiraComment> {
    try {
      const response = await this.client.get(`/issue/${issueKey}/comment/${commentId}`, {
        expand: 'renderedBody'
      });
      
      // Add plain text version if rendered body is available
      if (response.renderedBody) {
        const plainText = response.renderedBody
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();
        
        response.bodyText = plainText;
      }
      
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch comment ${commentId} for issue ${issueKey}: ${error}`);
    }
  }

  /**
   * Get recent comments across all accessible issues
   */
  async getRecentComments(days: number = 7, maxResults: number = 50): Promise<JiraComment[]> {
    try {
      // Search for recently updated issues and get their comments
      const jql = `updated >= -${days}d ORDER BY updated DESC`;
      const issues = await this.searchIssues(jql, 10); // Get recent issues first
      
      const allComments: JiraComment[] = [];
      
      for (const issue of issues.issues) {
        try {
          const commentsResponse = await this.getIssueComments(issue.key, 5);
          
          // Filter comments to only include recent ones
          const recentComments = commentsResponse.comments.filter(comment => {
            const commentDate = new Date(comment.updated);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            return commentDate > cutoffDate;
          });
          
          allComments.push(...recentComments);
          
          if (allComments.length >= maxResults) {
            break;
          }
        } catch (error) {
          // Skip issues we can't access comments for
          continue;
        }
      }
      
      // Sort by updated date and limit results
      return allComments
        .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
        .slice(0, maxResults);
        
    } catch (error) {
      throw new Error(`Failed to fetch recent comments: ${error}`);
    }
  }
}
