import { StructuredTool } from "@langchain/core/tools";
import { MemoryContextBuilder } from './memory/memory-context-builder';
import { MCPManager } from './mcp/mcp-manager';
import { 
  ToolCreator, 
  BaseToolConfig,
  InternetSearchTool, 
  CharacterInsightTool,
  JiraIssueTool,
  MCPToolWrapper
} from '../tools';

/**
 * Decoupled Tool Registry
 * 
 * No longer depends on MemoryManager directly.
 * Memory-dependent tools receive memory through dependency injection.
 */

export class DecoupledToolRegistry {
  private tools: StructuredTool[];
  private toolCreators: Map<string, ToolCreator>;
  private mcpManager: MCPManager;
  private memoryContextBuilder?: MemoryContextBuilder;

  constructor(memoryContextBuilder?: MemoryContextBuilder) {
    this.tools = [];
    this.toolCreators = new Map();
    this.mcpManager = MCPManager.getInstance();
    this.memoryContextBuilder = memoryContextBuilder;
    
    this.initializeToolCreators();
  }

  /**
   * Create and initialize a new DecoupledToolRegistry instance
   */
  static async create(memoryContextBuilder?: MemoryContextBuilder): Promise<DecoupledToolRegistry> {
    const registry = new DecoupledToolRegistry(memoryContextBuilder);
    await registry.initializeAllTools();
    return registry;
  }

  /**
   * Initialize tool creators
   */
  private initializeToolCreators(): void {
    // Initialize tools that don't need memory
    const internetSearchTool = new InternetSearchTool();
    const characterInsightTool = new CharacterInsightTool();
    const jiraIssueTool = new JiraIssueTool();

    // Register non-memory tools
    this.toolCreators.set('internet_search', internetSearchTool);
    this.toolCreators.set('character_insight', characterInsightTool);
    this.toolCreators.set('jira_get_issue', jiraIssueTool);

    // Memory-dependent tools will be added separately if memory is available
    if (this.memoryContextBuilder) {
      this.initializeMemoryDependentTools();
    }
  }

  /**
   * Initialize tools that depend on memory
   */
  private initializeMemoryDependentTools(): void {
    if (!this.memoryContextBuilder) return;

    // We'll implement memory-dependent tools here when we have proper abstractions
    // For now, we'll skip memory recall and conversation analysis tools
    console.log('⚠️  Memory-dependent tools not yet implemented in decoupled registry');
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
    
    console.log(`🔧 Decoupled Tool Registry initialized with ${this.tools.length}/${this.toolCreators.size} tools enabled`);
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
    return this.tools;
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
    console.log("🔄 Refreshing decoupled tool registry...");
    await this.initializeAllTools();
  }

  /**
   * Get the MCP manager instance for direct MCP operations
   */
  getMCPManager(): MCPManager {
    return this.mcpManager;
  }
}
