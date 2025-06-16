import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { BaseToolConfig, ToolCreator } from './base-tool';
import { MemoryManager } from '../services/memory/memory-manager';

/**
 * Memory Recall Tool
 * 
 * Provides access to conversation memory and history.
 */

export class MemoryRecallTool implements ToolCreator {
  private memoryManager: MemoryManager;
  private config: BaseToolConfig;

  constructor(memoryManager: MemoryManager) {
    this.memoryManager = memoryManager;
    this.config = {
      name: "recall_memory",
      description: "Recall previous conversations or interactions from memory",
      enabled: true
    };
  }

  createTool(): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name: this.config.name,
      description: `${this.config.description}. Use this to reference past discussions, build upon previous topics, or maintain conversation continuity. Provide specific keywords or topics for better recall.`,
      schema: z.object({
        topic: z.string().describe("The topic, keyword, or context to search for in memory")
      }),
      func: async ({ topic }) => {
        try {
          console.log(`   🧠 Recalling memories about: "${topic}"`);
          const startTime = Date.now();
          
          // Enhanced memory recall using the memory manager
          const memoryContext = await this.memoryManager.getFiendMemoryContext(topic);
          
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          if (memoryContext && memoryContext.trim().length > 0) {
            console.log(`   ✅ Memory recall successful (${duration}ms) - Found ${memoryContext.length} characters of context`);
            return `Memory recall for "${topic}":\n${memoryContext}`;
          } else {
            console.log(`   ⚠️  No specific memories found for "${topic}" (${duration}ms)`);
            return `No specific memories found for "${topic}". The topic may not have been discussed in detail previously, or try using different keywords related to your search.`;
          }
        } catch (error) {
          console.log(`   ❌ Memory recall failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return `Memory recall failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try a different topic or keyword.`;
        }
      }
    });
  }

  getConfig(): BaseToolConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled && !!this.memoryManager;
  }

  /**
   * Get memory statistics
   */
  getStats(): { available: boolean; memoryManager: boolean } {
    return {
      available: this.isEnabled(),
      memoryManager: !!this.memoryManager
    };
  }

  /**
   * Clear memory (if needed for testing or reset)
   */
  async clearMemory(): Promise<void> {
    try {
      await this.memoryManager.clearAllMemories();
      console.log("🧹 Memory recall tool: All memories cleared");
    } catch (error) {
      console.log(`❌ Failed to clear memories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
