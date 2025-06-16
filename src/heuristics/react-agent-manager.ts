import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TavilySearch } from "@langchain/tavily";
import { AgentExecutor, createReactAgent } from "langchain/agents";
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

  constructor(llm: ChatGoogleGenerativeAI, memoryManager: MemoryManager, searchTool?: TavilySearch) {
    this.llm = llm;
    this.memoryManager = memoryManager;
    this.dbManager = FiendsDBManager.getInstance();
    this.reactAgents = new Map();
    
    // Initialize tool registry
    this.toolRegistry = new ToolRegistry(memoryManager, searchTool);
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
      const toolDescriptions = enabledToolNames.map(name => {
        const config = this.toolRegistry.getToolConfig(name);
        return `- ${name}: ${config?.description || 'No description available'}`;
      }).join('\n');

      // Create a custom prompt template for this fiend
      const customPrompt = ChatPromptTemplate.fromTemplate(`
You are ${fiend.name}, ${fiend.description}

Your core traits: ${fiend.traits.join(', ')}

You have access to tools that can help you provide better responses. Think step by step about whether you need to use any tools to answer the human's question effectively.

When using tools, reason about why you're using them and how they help you stay true to your character while providing valuable insights.

Available tools:
${toolDescriptions}

TOOLS:
{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do, considering your character and whether tools would help
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer and can respond as ${fiend.name}
Final Answer: your final response as ${fiend.name}, incorporating any tool results naturally into your character's perspective

Begin!

Question: {input}
{agent_scratchpad}`);

      // Create the ReAct agent
      const tools = this.toolRegistry.getEnabledTools();
      const agent = await createReactAgent({
        llm: this.llm,
        tools: tools as any[],
        prompt: customPrompt
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
