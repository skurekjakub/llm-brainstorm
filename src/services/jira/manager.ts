import { JiraClient } from './client';
import { JiraIssueService } from './issue-service';
import { JiraProjectService } from './project-service';
import { JiraConnectionInfo } from './types';

/**
 * JIRA Manager
 * 
 * Main orchestrator for JIRA operations.
 * Provides a unified interface to all JIRA services.
 * Follows singleton pattern for consistent state management.
 */

export class JiraManager {
  private static instance: JiraManager;
  private client: JiraClient;
  private issueService: JiraIssueService;
  private projectService: JiraProjectService;

  private constructor() {
    this.client = new JiraClient();
    this.issueService = new JiraIssueService(this.client);
    this.projectService = new JiraProjectService(this.client);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): JiraManager {
    if (!JiraManager.instance) {
      JiraManager.instance = new JiraManager();
    }
    return JiraManager.instance;
  }

  /**
   * Check if JIRA is properly configured
   */
  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  /**
   * Get connection information and test connectivity
   */
  async getConnectionInfo(): Promise<JiraConnectionInfo> {
    const config = this.client.getConfig();
    
    if (!this.isConfigured()) {
      return {
        ...config,
        userInfo: undefined
      };
    }

    try {
      const userInfo = await this.client.testConnection();
      console.log(`✅ JIRA connection successful. Logged in as: ${userInfo.displayName}`);
      
      return {
        ...config,
        userInfo: {
          displayName: userInfo.displayName,
          emailAddress: userInfo.emailAddress,
          accountId: userInfo.accountId
        }
      };
    } catch (error) {
      console.error('❌ JIRA connection failed:', error);
      return {
        ...config,
        userInfo: undefined
      };
    }
  }

  /**
   * Get issue service for issue-related operations
   */
  get issues() {
    return this.issueService;
  }

  /**
   * Get project service for project-related operations
   */
  get projects() {
    return this.projectService;
  }

  /**
   * Quick health check
   */
  async healthCheck(): Promise<{
    configured: boolean;
    connected: boolean;
    userInfo?: any;
  }> {
    const configured = this.isConfigured();
    
    if (!configured) {
      return { configured: false, connected: false };
    }

    try {
      const userInfo = await this.client.testConnection();
      return { 
        configured: true, 
        connected: true, 
        userInfo 
      };
    } catch (error) {
      return { 
        configured: true, 
        connected: false 
      };
    }
  }
}
