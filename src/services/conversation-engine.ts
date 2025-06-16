import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TavilySearch } from "@langchain/tavily";
import { FiendsDBManager } from '../managers/fiends-db-manager';
import { MemoryManager } from './memory-manager';
import { ReactAgentManager } from './react-agent-manager';

/**
 * Conversation Engine
 * 
 * Responsible for conducting individual conversations with fiends and the sage.
 * Handles prompt generation, API calls, response processing, and search capabilities.
 */

export interface FiendResponse {
  name: string;
  perspective: string;
  searchUsed?: boolean;
  searchQueries?: string[];
}

export interface SearchResult {
  query: string;
  results: string;
}

export class ConversationEngine {
  private llm: ChatGoogleGenerativeAI;
  private dbManager: FiendsDBManager;
  private memoryManager: MemoryManager;
  private searchTool: TavilySearch | null;
  private searchEnabled: boolean;
  private agentManager: ReactAgentManager;

  constructor(llm: ChatGoogleGenerativeAI, memoryManager: MemoryManager) {
    this.llm = llm;
    this.memoryManager = memoryManager;
    this.dbManager = FiendsDBManager.getInstance();
    this.searchTool = null;
    
    // Initialize search tool if API key is available
    try {
      if (process.env.TAVILY_API_KEY) {
        this.searchTool = new TavilySearch({
          maxResults: 3
        });
        this.searchEnabled = true;
        console.log("🔍 Internet search capabilities enabled for fiends");
      } else {
        this.searchEnabled = false;
        console.log("⚠️  Internet search disabled - TAVILY_API_KEY not found");
      }
    } catch (error) {
      console.log("⚠️  Internet search disabled - Tavily not available");
      this.searchEnabled = false;
    }

    // Initialize ReAct agent manager
    this.agentManager = new ReactAgentManager(this.llm, this.memoryManager, this.searchTool || undefined);
  }

  /**
   * Generate a prompt for a fiend with memory context
   */
  private generateFiendPromptWithMemory(fiendName: string, userQuery: string, conversationContext: string = ""): string {
    try {
      const basePrompt = this.dbManager.generateCharacterPrompt(fiendName, userQuery);
      
      if (conversationContext) {
        return `${basePrompt}

Previous conversation context:
${conversationContext}

Current user message: ${userQuery}

Respond as ${fiendName}, taking into account our conversation history:`;
      }
      
      return basePrompt;
    } catch (error) {
      // Fallback if character not found
      return `You are ${fiendName}, an unconventional thinker augmented with modern knowledge. 

${conversationContext ? `Previous conversation context:\n${conversationContext}\n\n` : ''}User Query: ${userQuery}

Provide your unique perspective in 2-3 concise sentences:`;
    }
  }

  /**
   * Consult a single fiend using ReAct agent
   */
  async consultFiend(fiendName: string, userQuery: string): Promise<FiendResponse> {
    console.log(`🎭 Consulting ${fiendName}...`);
    const startTime = Date.now();
    
    try {
      // Get conversation context from memory
      const conversationContext = await this.memoryManager.getFiendMemoryContext(fiendName);
      
      if (this.agentManager.isToolsEnabled()) {
        // Use ReAct agent if tools are available
        console.log(`   🤖 Using ReAct agent for ${fiendName} (with ${this.agentManager.getToolCount()} tools)`);
        
        // Combine user query with conversation context
        const fullQuery = conversationContext 
          ? `Context from previous conversations: ${conversationContext}\n\nCurrent question: ${userQuery}`
          : userQuery;
        
        const { output, toolResult } = await this.agentManager.executeAgent(fiendName, fullQuery);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Save the interaction to memory
        await this.memoryManager.saveFiendInteraction(fiendName, userQuery, output);
        
        console.log(`   ✅ ${fiendName} responded via ReAct (${duration}ms)`);
        if (toolResult.toolUsed) {
          console.log(`   🔧 Tools used: ${toolResult.searchQueries.length > 0 ? toolResult.searchQueries.join(', ') : 'various tools'}`);
        }
        console.log(`   💬 Preview: "${output.slice(0, 80)}${output.length > 80 ? '...' : ''}"`);
        console.log(`   🧠 Memory updated`);
        
        return {
          name: fiendName,
          perspective: output,
          searchUsed: toolResult.toolUsed,
          searchQueries: toolResult.searchQueries
        };
        
      } else {
        // Fallback to legacy mode without tools
        console.log(`   📤 Sending query to ${fiendName} (legacy mode)`);
        
        const prompt = this.generateFiendPromptWithMemory(fiendName, userQuery, conversationContext);
        const response = await this.llm.invoke(prompt);
        const finalContent = typeof response.content === 'string' ? response.content : 'No response';
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Save the interaction to memory
        await this.memoryManager.saveFiendInteraction(fiendName, userQuery, finalContent);
        
        console.log(`   ✅ ${fiendName} responded (${duration}ms)`);
        console.log(`   💬 Preview: "${finalContent.slice(0, 80)}${finalContent.length > 80 ? '...' : ''}"`);
        console.log(`   🧠 Memory updated`);
        
        return {
          name: fiendName,
          perspective: finalContent,
          searchUsed: false,
          searchQueries: []
        };
      }
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`   ❌ ${fiendName} failed to respond (${duration}ms)`);
      console.log(`   🚨 Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        name: fiendName,
        perspective: `Error getting perspective: ${error instanceof Error ? error.message : 'Unknown error'}`,
        searchUsed: false,
        searchQueries: []
      };
    }
  }

  /**
   * Consult all fiends in parallel
   */
  async consultAllFiends(fiendNames: string[], userQuery: string): Promise<FiendResponse[]> {
    console.log("📝 Gathering perspectives with memory...");
    const gatherStartTime = Date.now();
    
    // Queue all fiend consultations
    const fiendPromises = fiendNames.map((fiend, index) => {
      console.log(`🔄 Querying ${fiend} (${index + 1}/${fiendNames.length})`);
      return this.consultFiend(fiend, userQuery);
    });
    
    console.log(`⏳ Waiting for ${fiendNames.length} responses...`);
    const fiendResponses = await Promise.all(fiendPromises);
    
    const gatherEndTime = Date.now();
    const totalGatherTime = gatherEndTime - gatherStartTime;
    
    // Calculate statistics
    const successfulResponses = fiendResponses.filter(r => !r.perspective.startsWith('Error'));
    const failedResponses = fiendResponses.filter(r => r.perspective.startsWith('Error'));
    
    console.log(`\n📊 Perspective Gathering Complete:`);
    console.log(`   ✅ Successful: ${successfulResponses.length}/${fiendNames.length}`);
    if (failedResponses.length > 0) {
      console.log(`   ❌ Failed: ${failedResponses.length} (${failedResponses.map(f => f.name).join(', ')})`);
    }
    console.log(`   ⏱️  Total time: ${totalGatherTime}ms`);
    console.log(`   📈 Average per perspective: ${Math.round(totalGatherTime / fiendNames.length)}ms\n`);
    
    return fiendResponses;
  }

  /**
   * Get sage analysis with memory
   */
  async consultSage(userQuery: string, fiendResponses: FiendResponse[]): Promise<string> {
    console.log(`🧙‍♂️ Sage analyzing ${fiendResponses.length} perspectives...`);
    const startTime = Date.now();
    
    try {
      // Get sage's conversation context
      const conversationContext = await this.memoryManager.getSageMemoryContext();
      
      const fiendInputs = fiendResponses.map(f => 
        `**${f.name}**: ${f.perspective}`
      ).join('\n\n');

      const sagePrompt = `${conversationContext ? `Previous conversation context:\n${conversationContext}\n\n` : ''}Current Discussion:

Original Query: ${userQuery}

Perspectives from the Council:
${fiendInputs}

Now synthesize these diverse viewpoints into balanced, constructive guidance, considering our ongoing conversation:`;

      console.log(`   📤 Sending synthesis request to sage (with memory)`);
      const response = await this.llm.invoke(sagePrompt);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const content = typeof response.content === 'string' ? response.content : 'Unable to generate synthesis.';
      
      // Save the interaction to sage memory
      await this.memoryManager.saveSageInteraction(userQuery, fiendResponses, content);
      
      console.log(`   ✅ Sage synthesis complete (${duration}ms)`);
      console.log(`   📏 Synthesis length: ${content.length} characters`);
      console.log(`   🧠 Sage memory updated`);
      
      return content;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`   ❌ Sage synthesis failed (${duration}ms)`);
      console.log(`   🚨 Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return `Error in sage analysis: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Perform internet search for a fiend
   */
  private async searchForFiend(searchQuery: string, fiendName: string): Promise<SearchResult | null> {
    if (!this.searchEnabled || !this.searchTool) {
      return null;
    }

    try {
      console.log(`   🔍 ${fiendName} searching: "${searchQuery}"`);
      const searchStartTime = Date.now();
      
      const searchResults = await this.searchTool.invoke({ query: searchQuery });
      const searchEndTime = Date.now();
      const searchDuration = searchEndTime - searchStartTime;
      
      console.log(`   ✅ Search completed (${searchDuration}ms)`);
      
      return {
        query: searchQuery,
        results: searchResults
      };
    } catch (error) {
      console.log(`   ❌ Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Generate enhanced prompt with search capability
   */
  private generateSearchEnabledPrompt(fiendName: string, userQuery: string, conversationContext: string = ""): string {
    const basePrompt = this.generateFiendPromptWithMemory(fiendName, userQuery, conversationContext);
    
    if (this.searchEnabled) {
      return `${basePrompt}

SPECIAL ABILITY: You can search the internet for current information if needed. 
To search, include in your response a line that starts with "SEARCH:" followed by your search query.
Example: "SEARCH: latest developments in artificial intelligence 2025"

You may use up to 2 searches. Only search if the user's question requires current information that you might not have.
After searching, incorporate the search results into your response naturally.

Your response should be in character as ${fiendName}.`;
    }
    
    return basePrompt;
  }

  /**
   * Process search requests from fiend responses
   */
  private async processSearchRequests(response: string, fiendName: string): Promise<{ response: string, searchUsed: boolean, searchQueries: string[] }> {
    if (!this.searchEnabled) {
      return { response, searchUsed: false, searchQueries: [] };
    }

    const searchPattern = /SEARCH:\s*(.+?)(?:\n|$)/g;
    const searchQueries: string[] = [];
    const searchResults: SearchResult[] = [];
    let match;

    // Extract search queries
    while ((match = searchPattern.exec(response)) !== null && searchQueries.length < 2) {
      const query = match[1].trim();
      if (query) {
        searchQueries.push(query);
      }
    }

    // Perform searches
    for (const query of searchQueries) {
      const searchResult = await this.searchForFiend(query, fiendName);
      if (searchResult) {
        searchResults.push(searchResult);
      }
    }

    // If searches were performed, enhance the response
    if (searchResults.length > 0) {
      const searchContext = searchResults.map(sr => 
        `Search: "${sr.query}"\nResults: ${sr.results}`
      ).join('\n\n');

      const enhancedPrompt = `${response}

Based on the following search results, provide an enhanced response as ${fiendName}:

${searchContext}

Enhanced response:`;

      try {
        const enhancedResponse = await this.llm.invoke(enhancedPrompt);
        const finalResponse = typeof enhancedResponse.content === 'string' ? enhancedResponse.content : response;
        
        // Remove SEARCH: lines from final response
        const cleanedResponse = finalResponse.replace(/SEARCH:\s*(.+?)(?:\n|$)/g, '').trim();
        
        return { 
          response: cleanedResponse, 
          searchUsed: true, 
          searchQueries 
        };
      } catch (error) {
        console.log(`   ⚠️ Failed to enhance response with search results`);
        return { response, searchUsed: false, searchQueries: [] };
      }
    }

    // Remove SEARCH: lines even if searches failed
    const cleanedResponse = response.replace(/SEARCH:\s*(.+?)(?:\n|$)/g, '').trim();
    return { response: cleanedResponse, searchUsed: false, searchQueries: [] };
  }
}
