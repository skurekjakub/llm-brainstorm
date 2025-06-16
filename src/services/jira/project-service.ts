import { JiraClient } from './client';
import { JiraProject } from './types';

/**
 * JIRA Project Service
 * 
 * Handles project-related operations including:
 * - Fetching project information
 * - Getting project metadata
 * - Project validation
 */

export class JiraProjectService {
  private client: JiraClient;

  constructor(client: JiraClient) {
    this.client = client;
  }

  /**
   * Get all accessible projects
   */
  async getAllProjects(): Promise<JiraProject[]> {
    try {
      const projects = await this.client.get('/project');
      return projects;
    } catch (error) {
      throw new Error(`Failed to fetch projects: ${error}`);
    }
  }

  /**
   * Get a specific project by key
   */
  async getProject(projectKey: string): Promise<JiraProject> {
    try {
      const project = await this.client.get(`/project/${projectKey}`);
      return project;
    } catch (error) {
      throw new Error(`Failed to fetch project ${projectKey}: ${error}`);
    }
  }

  /**
   * Check if a project exists and is accessible
   */
  async projectExists(projectKey: string): Promise<boolean> {
    try {
      await this.getProject(projectKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get issue types for a project
   */
  async getProjectIssueTypes(projectKey: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes`);
      return response.projects[0]?.issuetypes || [];
    } catch (error) {
      throw new Error(`Failed to fetch issue types for project ${projectKey}: ${error}`);
    }
  }

  /**
   * Get project statuses
   */
  async getProjectStatuses(projectKey: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/project/${projectKey}/statuses`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch statuses for project ${projectKey}: ${error}`);
    }
  }

  /**
   * Get project components
   */
  async getProjectComponents(projectKey: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/project/${projectKey}/components`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch components for project ${projectKey}: ${error}`);
    }
  }

  /**
   * Search projects by name or key
   */
  async searchProjects(query: string): Promise<JiraProject[]> {
    try {
      const allProjects = await this.getAllProjects();
      const searchTerm = query.toLowerCase();
      
      return allProjects.filter(project => 
        project.name.toLowerCase().includes(searchTerm) ||
        project.key.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      throw new Error(`Failed to search projects with query "${query}": ${error}`);
    }
  }
}
