import { DynamicStructuredTool } from "@langchain/core/tools";
import { TavilySearch } from "@langchain/tavily";
import { z } from "zod";
import { BaseToolConfig, ToolCreator } from './base-tool';

/**
 * Internet Search Tool
 * 
 * Provides internet search capabilities using Tavily Search API.
 */

export class InternetSearchTool implements ToolCreator {
  private searchTool: TavilySearch | null;
  private config: BaseToolConfig;

  constructor() {
    // Initialize search tool internally if API key is available
    this.searchTool = null;
    
    try {
      if (process.env.TAVILY_API_KEY) {
        this.searchTool = new TavilySearch({ 
          maxResults: 3
        });
      }
    } catch (error) {
      console.log("⚠️  Failed to initialize Tavily search tool:", error);
    }

    this.config = {
      name: "internet_search",
      description: "Search the internet for current information, news, facts, or recent developments",
      enabled: !!this.searchTool,
      dependencies: ["TAVILY_API_KEY"]
    };
  }

  createTool(): DynamicStructuredTool {
    if (!this.searchTool) {
      throw new Error("Search tool not available - TAVILY_API_KEY not provided");
    }

    return new DynamicStructuredTool({
      name: this.config.name,
      description: `${this.config.description}. Use this when you need up-to-date information that might not be in your training data. Be specific with your search queries for better results.`,
      schema: z.object({
        query: z.string().describe("The search query to find relevant information - be specific and focused")
      }),
      func: async ({ query }) => {
        try {
          console.log(`   🔍 Executing internet search: "${query}"`);
          const startTime = Date.now();
          
          const results = await this.searchTool!.invoke({ query });
          
          const endTime = Date.now();
          const duration = endTime - startTime;
          console.log(`   ✅ Search completed successfully (${duration}ms)`);
          
          return `Search results for "${query}":\n${results}`;
        } catch (error) {
          console.log(`   ❌ Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try a different search query or approach.`;
        }
      }
    });
  }

  getConfig(): BaseToolConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    // Check dependencies
    if (this.config.dependencies) {
      for (const dep of this.config.dependencies) {
        if (!process.env[dep]) {
          return false;
        }
      }
    }
    
    return this.config.enabled && !!this.searchTool;
  }

  /**
   * Update search tool instance
   */
  updateSearchTool(searchTool: TavilySearch): void {
    this.searchTool = searchTool;
    this.config.enabled = true;
  }

  /**
   * Get search statistics
   */
  getStats(): { available: boolean; dependencies: string[] } {
    return {
      available: this.isEnabled(),
      dependencies: this.config.dependencies || []
    };
  }
}
