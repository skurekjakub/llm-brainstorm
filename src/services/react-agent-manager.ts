import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { CharacterDataService } from './character-data.service';
import { AgentCacheService } from './agent-cache.service';
import { ToolProvider } from './tools/tool-provider.interface';

/**
 * ReAct Agent Manager (Refactored)
 * 
 * Single responsibility: Create and manage ReAct agents for fiends.
 * Uses dependency injection and focuses only on agent creation, not tool or memory management.
 */

export interface AgentToolResult {
  toolUsed: boolean;
  searchQueries: string[];
  intermediateSteps: any[];
}

export class ReactAgentManager {
  private llm: ChatGoogleGenerativeAI;
  private characterDataService: CharacterDataService;
  private agentCacheService: AgentCacheService;
  private toolProvider: ToolProvider;

  constructor(
    llm: ChatGoogleGenerativeAI,
    characterDataService: CharacterDataService,
    agentCacheService: AgentCacheService,
    toolProvider: ToolProvider
  ) {
    this.llm = llm;
    this.characterDataService = characterDataService;
    this.agentCacheService = agentCacheService;
    this.toolProvider = toolProvider;
  }

  /**
   * Create or get a ReAct agent for a specific fiend
   */
  async createAgent(fiendName: string): Promise<AgentExecutor> {
    // Check cache first
    const cachedAgent = this.agentCacheService.getAgent(fiendName);
    if (cachedAgent) {
      return cachedAgent;
    }

    try {
      // Get the fiend's character data
      const fiend = this.characterDataService.getCharacter(fiendName);
      if (!fiend) {
        throw new Error(`Fiend ${fiendName} not found in database`);
      }

      // Get available tools
      const tools = await this.toolProvider.getEnabledTools();
      const toolCount = await this.toolProvider.getToolCount();
      
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
        ["placeholder", "{agent_scratchpad}"],
      ]);

      // Create the ReAct agent
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

      // Cache the agent
      this.agentCacheService.cacheAgent(fiendName, agentExecutor);
      console.log(`🤖 Created ReAct agent for ${fiendName} with ${toolCount} tools`);
      
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
  async isToolsEnabled(): Promise<boolean> {
    return await this.toolProvider.hasTools();
  }

  /**
   * Get the number of available tools
   */
  async getToolCount(): Promise<number> {
    return await this.toolProvider.getToolCount();
  }

  /**
   * Get tool names
   */
  async getToolNames(): Promise<string[]> {
    return await this.toolProvider.getToolNames();
  }

  /**
   * Clear all cached agents (useful for memory management)
   */
  clearAgents(): void {
    this.agentCacheService.clearCache();
    console.log("🧹 Cleared all ReAct agent cache");
  }

  /**
   * Refresh tools and clear agent cache (useful when tool providers change)
   */
  async refreshTools(): Promise<void> {
    await this.toolProvider.refresh();
    this.clearAgents(); // Clear cached agents so they pick up new tools
    console.log("🔄 Refreshed tools and cleared agent cache");
  }

  /**
   * Get tool provider for direct tool operations
   */
  getToolProvider(): ToolProvider {
    return this.toolProvider;
  }

  /**
   * Get statistics about agent usage and tools
   */
  async getStats(): Promise<{ 
    agentStats: any; 
    toolStats: any;
  }> {
    const agentStats = this.agentCacheService.getStats();
    const toolStats = await this.toolProvider.getStats();
    
    return {
      agentStats,
      toolStats
    };
  }
}
