import axios, { AxiosInstance } from 'axios';
import { JiraConfig } from './types';
import 'dotenv/config';

/**
 * JIRA Client
 * 
 * Handles low-level HTTP communication with JIRA REST API
 * Responsible for authentication, connection management, and basic HTTP operations
 */

export class JiraClient {
  private axiosInstance: AxiosInstance;
  private config: JiraConfig;

  constructor() {
    this.config = {
      baseUrl: process.env.JIRA_BASE_URL || '',
      username: process.env.JIRA_USERNAME || '',
      apiToken: process.env.JIRA_API_TOKEN || '',
      defaultProjectKey: process.env.JIRA_DEFAULT_PROJECT_KEY || 'PROJ'
    };

    if (!this.isConfigured()) {
      console.warn('⚠️  JIRA configuration incomplete. Some features may not work.');
      console.warn('   Please set JIRA_BASE_URL, JIRA_USERNAME, and JIRA_API_TOKEN in .env');
    }

    this.axiosInstance = axios.create({
      baseURL: `${this.config.baseUrl}/rest/api/3`,
      auth: {
        username: this.config.username,
        password: this.config.apiToken
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }

  /**
   * Check if JIRA is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.baseUrl && this.config.username && this.config.apiToken);
  }

  /**
   * Get configuration (without sensitive data)
   */
  getConfig() {
    return {
      baseUrl: this.config.baseUrl,
      username: this.config.username,
      defaultProjectKey: this.config.defaultProjectKey,
      isConfigured: this.isConfigured()
    };
  }

  /**
   * Test the JIRA connection
   */
  async testConnection(): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('JIRA is not configured');
    }

    try {
      const response = await this.axiosInstance.get('/myself');
      return response.data;
    } catch (error) {
      throw new Error(`JIRA connection failed: ${error}`);
    }
  }

  /**
   * Make a GET request to JIRA API
   */
  async get(endpoint: string, params?: any): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('JIRA is not configured');
    }

    try {
      const response = await this.axiosInstance.get(endpoint, { params });
      return response.data;
    } catch (error) {
      throw new Error(`JIRA GET request failed for ${endpoint}: ${error}`);
    }
  }

  /**
   * Make a POST request to JIRA API (for search operations)
   */
  async post(endpoint: string, data: any): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('JIRA is not configured');
    }

    try {
      const response = await this.axiosInstance.post(endpoint, data);
      return response.data;
    } catch (error) {
      throw new Error(`JIRA POST request failed for ${endpoint}: ${error}`);
    }
  }
}
