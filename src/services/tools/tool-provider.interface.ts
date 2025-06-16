import { StructuredTool } from "@langchain/core/tools";

/**
 * Tool Provider Interface
 * 
 * Abstract interface for providing tools to agents.
 * Allows for different tool management strategies while maintaining consistent interface.
 */

export interface ToolProvider {
  /**
   * Get all available tools
   */
  getTools(): Promise<StructuredTool[]>;
  
  /**
   * Get enabled tools only
   */
  getEnabledTools(): Promise<StructuredTool[]>;
  
  /**
   * Get tool by name
   */
  getTool(name: string): Promise<StructuredTool | null>;
  
  /**
   * Check if tools are available
   */
  hasTools(): Promise<boolean>;
  
  /**
   * Get tool count
   */
  getToolCount(): Promise<number>;
  
  /**
   * Get tool names
   */
  getToolNames(): Promise<string[]>;
  
  /**
   * Refresh tools (if applicable)
   */
  refresh(): Promise<void>;
  
  /**
   * Get tool statistics
   */
  getStats(): Promise<ToolProviderStats>;
}

export interface ToolProviderStats {
  totalTools: number;
  enabledTools: number;
  disabledTools: number;
  toolNames: string[];
  enabledToolNames: string[];
  lastRefresh?: Date;
}

/**
 * Registry-based Tool Provider
 * 
 * Provides tools from a ToolRegistry instance
 */
export class RegistryToolProvider implements ToolProvider {
  private toolRegistry: any; // We'll type this properly when we refactor ToolRegistry
  private lastRefresh: Date;

  constructor(toolRegistry: any) {
    this.toolRegistry = toolRegistry;
    this.lastRefresh = new Date();
  }

  async getTools(): Promise<StructuredTool[]> {
    return this.toolRegistry.getAllTools();
  }

  async getEnabledTools(): Promise<StructuredTool[]> {
    return this.toolRegistry.getEnabledTools();
  }

  async getTool(name: string): Promise<StructuredTool | null> {
    const tools = await this.getEnabledTools();
    return tools.find(tool => tool.name === name) || null;
  }

  async hasTools(): Promise<boolean> {
    return this.toolRegistry.hasEnabledTools();
  }

  async getToolCount(): Promise<number> {
    return this.toolRegistry.getEnabledToolCount();
  }

  async getToolNames(): Promise<string[]> {
    return this.toolRegistry.getEnabledToolNames();
  }

  async refresh(): Promise<void> {
    await this.toolRegistry.refreshTools();
    this.lastRefresh = new Date();
  }

  async getStats(): Promise<ToolProviderStats> {
    const stats = this.toolRegistry.getStats();
    return {
      ...stats,
      lastRefresh: this.lastRefresh
    };
  }
}

/**
 * Static Tool Provider
 * 
 * Provides a static list of tools (useful for testing or simple scenarios)
 */
export class StaticToolProvider implements ToolProvider {
  private tools: StructuredTool[];

  constructor(tools: StructuredTool[]) {
    this.tools = tools;
  }

  async getTools(): Promise<StructuredTool[]> {
    return [...this.tools];
  }

  async getEnabledTools(): Promise<StructuredTool[]> {
    return [...this.tools];
  }

  async getTool(name: string): Promise<StructuredTool | null> {
    return this.tools.find(tool => tool.name === name) || null;
  }

  async hasTools(): Promise<boolean> {
    return this.tools.length > 0;
  }

  async getToolCount(): Promise<number> {
    return this.tools.length;
  }

  async getToolNames(): Promise<string[]> {
    return this.tools.map(tool => tool.name);
  }

  async refresh(): Promise<void> {
    // No-op for static tools
  }

  async getStats(): Promise<ToolProviderStats> {
    return {
      totalTools: this.tools.length,
      enabledTools: this.tools.length,
      disabledTools: 0,
      toolNames: this.tools.map(tool => tool.name),
      enabledToolNames: this.tools.map(tool => tool.name)
    };
  }
}
