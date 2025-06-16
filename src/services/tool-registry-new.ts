import { DynamicStructuredTool, StructuredTool } from "@langchain/core/tools";
import { FiendsDBManager } from '../managers/fiends-db-manager';
import { MemoryManager } from './memory-manager';
import { MCPManager } from './mcp-manager';
import { 
  ToolCreator, 
  BaseToolConfig,
  InternetSearchTool, 
  MemoryRecallTool, 
  CharacterInsightTool, 
  ConversationAnalysisTool,
  JiraIssueTool,
  MCPToolWrapper
} from '../tools';

/**
 * Tool Registry
 * 
 * Responsible for initializing and managing all available tools for ReAct agents.
 * Provides a centralized place to register, configure, and retrieve tools.
 */

export class ToolRegistry {
  private tools: StructuredTool[];
  private toolCreators: Map<string, ToolCreator>;
  private dbManager: FiendsDBManager;
  private memoryManager: MemoryManager;
  private mcpManager: MCPManager;

  private constructor(memoryManager: MemoryManager) {
    this.tools = [];
    this.toolCreators = new Map();
    this.dbManager = FiendsDBManager.getInstance();
    this.memoryManager = memoryManager;
    this.mcpManager = MCPManager.getInstance();
    
    this.initializeToolCreators();
  }

  /**
   * Create and initialize a new ToolRegistry instance
   */
  static async create(memoryManager: MemoryManager): Promise<ToolRegistry> {
    const registry = new ToolRegistry(memoryManager);
    await registry.initializeAllTools();
    return registry;
  }

  /**
   * Initialize tool creators
   */
  private initializeToolCreators(): void {
    // Initialize individual tool creators
    const internetSearchTool = new InternetSearchTool();
    const memoryRecallTool = new MemoryRecallTool(this.memoryManager);
    const characterInsightTool = new CharacterInsightTool();
    const conversationAnalysisTool = new ConversationAnalysisTool(this.memoryManager);
    const jiraIssueTool = new JiraIssueTool();

    // Register tool creators
    this.toolCreators.set('internet_search', internetSearchTool);
    this.toolCreators.set('recall_memory', memoryRecallTool);
    this.toolCreators.set('character_insight', characterInsightTool);
    this.toolCreators.set('conversation_analysis', conversationAnalysisTool);
    this.toolCreators.set('jira_get_issue', jiraIssueTool);
  }

  /**
   * Initialize all available tools
   */
  private async initializeAllTools(): Promise<void> {
    this.tools = [];

    // First initialize MCP servers and tools
    await this.initializeMCPTools();

    // Create tools from registered creators
    for (const [name, creator] of this.toolCreators) {
      if (creator.isEnabled()) {
        try {
          const tool = creator.createTool();
          this.tools.push(tool);
          console.log(`   ✅ ${name}: ${creator.getConfig().description}`);
        } catch (error) {
          console.log(`   ❌ Failed to create ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        console.log(`   ⚠️  ${name}: Disabled (${this.getDisabledReason(creator)})`);
      }
    }
    
    console.log(`🔧 Tool Registry initialized with ${this.tools.length}/${this.toolCreators.size} tools enabled`);
  }

  /**
   * Initialize MCP servers and register their tools
   */
  private async initializeMCPTools(): Promise<void> {
    try {
      console.log('🔌 Initializing MCP servers...');
      await this.mcpManager.initializeServers();
      
      // Get all available MCP tools and register them
      const mcpTools = this.mcpManager.getAllTools();
      console.log(`📦 Found ${mcpTools.length} MCP tools from connected servers`);
      
      for (const mcpTool of mcpTools) {
        const toolWrapper = new MCPToolWrapper(mcpTool);
        this.toolCreators.set(mcpTool.name, toolWrapper);
        console.log(`   📋 Registered MCP tool: ${mcpTool.name} (from ${mcpTool.serverName})`);
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize MCP tools:', error);
    }
  }

  /**
   * Get reason why a tool is disabled
   */
  private getDisabledReason(creator: ToolCreator): string {
    const config = creator.getConfig();
    if (config.dependencies) {
      const missingDeps = config.dependencies.filter(dep => !process.env[dep]);
      if (missingDeps.length > 0) {
        return `missing ${missingDeps.join(', ')}`;
      }
    }
    return 'configuration disabled';
  }

  /**
   * Get all enabled tools
   */
  getEnabledTools(): StructuredTool[] {
    return this.tools; // All tools in the array are already enabled
  }

  /**
   * Get all tools (enabled and disabled)
   */
  getAllTools(): StructuredTool[] {
    return [...this.tools];
  }

  /**
   * Get tool configuration
   */
  getToolConfig(toolName: string): BaseToolConfig | undefined {
    const creator = this.toolCreators.get(toolName);
    return creator?.getConfig();
  }

  /**
   * Get tool statistics
   */
  getStats(): {
    totalTools: number;
    enabledTools: number;
    disabledTools: number;
    toolNames: string[];
    enabledToolNames: string[];
  } {
    const totalCreators = this.toolCreators.size;
    const enabledTools = this.tools.length;
    
    return {
      totalTools: totalCreators,
      enabledTools: enabledTools,
      disabledTools: totalCreators - enabledTools,
      toolNames: Array.from(this.toolCreators.keys()),
      enabledToolNames: this.tools.map(t => t.name)
    };
  }

  /**
   * Register a custom tool creator
   */
  registerCustomTool(toolName: string, creator: ToolCreator): void {
    this.toolCreators.set(toolName, creator);
    
    // Try to create the tool if enabled
    if (creator.isEnabled()) {
      try {
        const tool = creator.createTool();
        this.tools.push(tool);
        console.log(`🔧 Registered and enabled custom tool: ${toolName}`);
      } catch (error) {
        console.log(`⚠️  Registered but failed to enable custom tool ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log(`🔧 Registered custom tool: ${toolName} (disabled)`);
    }
  }

  /**
   * Check if tools are available
   */
  hasEnabledTools(): boolean {
    return this.tools.length > 0;
  }

  /**
   * Get tool count
   */
  getEnabledToolCount(): number {
    return this.tools.length;
  }

  /**
   * Get enabled tool names
   */
  getEnabledToolNames(): string[] {
    return this.tools.map(t => t.name);
  }

  /**
   * Get tool creator
   */
  getToolCreator(toolName: string): ToolCreator | undefined {
    return this.toolCreators.get(toolName);
  }

  /**
   * Refresh tools (useful if dependencies change)
   */
  async refreshTools(): Promise<void> {
    console.log("🔄 Refreshing tool registry...");
    await this.initializeAllTools();
  }

  /**
   * Get the MCP manager instance for direct MCP operations
   */
  getMCPManager(): MCPManager {
    return this.mcpManager;
  }
}
