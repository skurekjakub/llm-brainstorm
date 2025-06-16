import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AgentExecutor, createReactAgent, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { FiendsDBManager } from '../managers/fiends-db-manager';
import { MemoryManager } from './memory-manager';
import { ToolRegistry } from './tool-registry';

/**
 * ReAct Agent Manager
 * 
 * Responsible for creating and managing ReAct agents for fiends.
 * Handles tool initialization, agent creation, and agent lifecycle.
 */

export interface AgentToolResult {
  toolUsed: boolean;
  searchQueries: string[];
  intermediateSteps: any[];
}

export class ReactAgentManager {
  private llm: ChatGoogleGenerativeAI;
  private dbManager: FiendsDBManager;
  private memoryManager: MemoryManager;
  private toolRegistry: ToolRegistry;
  private reactAgents: Map<string, AgentExecutor>;

  private constructor(llm: ChatGoogleGenerativeAI, memoryManager: MemoryManager, toolRegistry: ToolRegistry) {
    this.llm = llm;
    this.memoryManager = memoryManager;
    this.dbManager = FiendsDBManager.getInstance();
    this.reactAgents = new Map();
    this.toolRegistry = toolRegistry;
  }

  /**
   * Create and initialize a new ReactAgentManager instance
   */
  static async create(llm: ChatGoogleGenerativeAI, memoryManager: MemoryManager): Promise<ReactAgentManager> {
    // Initialize tool registry asynchronously
    const toolRegistry = await ToolRegistry.create(memoryManager);
    return new ReactAgentManager(llm, memoryManager, toolRegistry);
  }

  /**
   * Create or get a ReAct agent for a specific fiend
   */
  async createAgent(fiendName: string): Promise<AgentExecutor> {
    if (this.reactAgents.has(fiendName)) {
      return this.reactAgents.get(fiendName)!;
    }

    try {
      // Get the fiend's character data
      const fiend = this.dbManager.getCharacter(fiendName);
      if (!fiend) {
        throw new Error(`Fiend ${fiendName} not found in database`);
      }

      // Get available tools information
      const enabledToolNames = this.toolRegistry.getEnabledToolNames();
      const toolDescriptions = enabledToolNames.map((name: string) => {
        const config = this.toolRegistry.getToolConfig(name);
        return `- ${name}: ${config?.description || 'No description available'}`;
      }).join('\n');
      
      // Create a custom prompt template for this fiend
      const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are ${fiend.name}, ${fiend.description}.
        Your core traits are: ${fiend.traits.join(', ')}.

        You are a helpful assistant, but you must strictly adhere to your persona.

        You have access to a set of tools to help you answer questions. You are free to use these tools as you see fit to gather information and provide the most accurate and helpful response, all while staying true to your character.

        When you decide to use a tool, you will be providing a response to the user *after* you have used the tool and have its results. Integrate the information from the tool naturally into your final response, from your character's unique perspective and speaking style.

        Your reasoning process for using tools should be your own internal monologue, not explicitly written out in the final answer.`,
        ],
        ["human", "{input}"],
        // This placeholder is essential! LangChain will automatically populate it
        // with the history of tool calls and their results.
        ["placeholder", "{agent_scratchpad}"],
      ]);

      // Create the ReAct agent
      const tools = this.toolRegistry.getEnabledTools();
      const agent = await createToolCallingAgent({
        llm: this.llm,
        tools: tools,
        prompt: prompt
      });

      // Create agent executor
      const agentExecutor = new AgentExecutor({
        agent,
        tools: tools,
        verbose: false,
        maxIterations: 3,
        handleParsingErrors: true
      });

      this.reactAgents.set(fiendName, agentExecutor);
      console.log(`🤖 Created ReAct agent for ${fiendName} with ${this.toolRegistry.getEnabledToolCount()} tools`);
      
      return agentExecutor;

    } catch (error) {
      console.log(`⚠️  Failed to create ReAct agent for ${fiendName}:`, error);
      throw error;
    }
  }

  /**
   * Execute an agent and extract tool usage information
   */
  async executeAgent(fiendName: string, query: string): Promise<{ output: string; toolResult: AgentToolResult }> {
    const agent = await this.createAgent(fiendName);
    
    const result = await agent.invoke({
      input: query
    });

    const toolResult: AgentToolResult = {
      toolUsed: result.intermediateSteps && result.intermediateSteps.length > 0,
      searchQueries: this.extractSearchQueries(result.intermediateSteps || []),
      intermediateSteps: result.intermediateSteps || []
    };

    return {
      output: result.output || 'No response from agent',
      toolResult
    };
  }

  /**
   * Extract search queries from agent intermediate steps
   */
  private extractSearchQueries(intermediateSteps: any[]): string[] {
    const searchQueries: string[] = [];
    
    for (const step of intermediateSteps) {
      if (step.action && step.action.tool === 'internet_search') {
        const query = step.action.toolInput?.query;
        if (query && typeof query === 'string') {
          searchQueries.push(query);
        }
      }
    }
    
    return searchQueries;
  }

  /**
   * Check if tools are enabled
   */
  isToolsEnabled(): boolean {
    return this.toolRegistry.hasEnabledTools();
  }

  /**
   * Get the number of available tools
   */
  getToolCount(): number {
    return this.toolRegistry.getEnabledToolCount();
  }

  /**
   * Get tool names
   */
  getToolNames(): string[] {
    return this.toolRegistry.getEnabledToolNames();
  }

  /**
   * Clear all cached agents (useful for memory management)
   */
  clearAgents(): void {
    this.reactAgents.clear();
    console.log("🧹 Cleared all ReAct agent cache");
  }

  /**
   * Refresh tools and clear agent cache (useful when MCP servers connect/disconnect)
   */
  async refreshTools(): Promise<void> {
    await this.toolRegistry.refreshTools();
    this.clearAgents(); // Clear cached agents so they pick up new tools
    console.log("🔄 Refreshed tools and cleared agent cache");
  }

  /**
   * Get MCP manager for direct MCP operations
   */
  getMCPManager() {
    return this.toolRegistry.getMCPManager();
  }

  /**
   * Get statistics about agent usage
   */
  getStats(): { 
    agentCount: number; 
    toolCount: number; 
    toolNames: string[];
    toolRegistry: any;
  } {
    const toolStats = this.toolRegistry.getStats();
    return {
      agentCount: this.reactAgents.size,
      toolCount: toolStats.enabledTools,
      toolNames: toolStats.enabledToolNames,
      toolRegistry: toolStats
    };
  }
}
