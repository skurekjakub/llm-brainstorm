/**
 * JIRA Types and Interfaces
 * 
 * Centralized type definitions for JIRA API responses and data structures
 */

export interface JiraUser {
  displayName: string;
  emailAddress: string;
  accountId: string;
}

export interface JiraStatus {
  name: string;
  statusCategory: {
    name: string;
    colorName: string;
  };
}

export interface JiraPriority {
  name: string;
  id: string;
}

export interface JiraIssueType {
  name: string;
  id: string;
  iconUrl: string;
}

export interface JiraProject {
  key: string;
  id: string;
  name: string;
  description?: string;
  projectTypeKey: string;
  lead: JiraUser;
}

export interface JiraIssue {
  key: string;
  id: string;
  self: string;
  fields: {
    summary: string;
    description?: {
      version: number;
      type: string;
      content: Array<{
        type: string;
        content?: any[];
        text?: string;
        attrs?: any;
        marks?: any[];
      }>;
    };
    descriptionText?: string; // Plain text version added by our service
    status: JiraStatus;
    priority: JiraPriority;
    issuetype: JiraIssueType;
    project: JiraProject;
    assignee?: JiraUser;
    reporter: JiraUser;
    created: string;
    updated: string;
    labels?: string[];
    components?: Array<{
      name: string;
      id: string;
    }>;
  };
  renderedFields?: {
    description?: string; // HTML version from JIRA
  };
}

export interface JiraSearchResult {
  issues: JiraIssue[];
  total: number;
  maxResults: number;
  startAt: number;
}

export interface JiraConfig {
  baseUrl: string;
  username: string;
  apiToken: string;
  defaultProjectKey: string;
}

export interface JiraConnectionInfo {
  baseUrl: string;
  username: string;
  defaultProjectKey: string;
  isConfigured: boolean;
  userInfo?: {
    displayName: string;
    emailAddress: string;
    accountId: string;
  };
}

export interface JiraComment {
  id: string;
  self: string;
  author: JiraUser;
  body?: {
    version: number;
    type: string;
    content: Array<{
      type: string;
      content?: any[];
      text?: string;
      attrs?: any;
      marks?: any[];
    }>;
  };
  bodyText?: string; // Plain text version added by our service
  updateAuthor: JiraUser;
  created: string;
  updated: string;
  visibility?: {
    type: string;
    value: string;
  };
}

export interface JiraCommentsResponse {
  startAt: number;
  maxResults: number;
  total: number;
  comments: JiraComment[];
}
