import { AgentExecutor } from "langchain/agents";

/**
 * Agent Cache Service
 * 
 * Single responsibility: Manage agent lifecycle and caching.
 * Extracted from ReactAgentManager to separate caching concerns from agent creation.
 */

export interface AgentCacheStats {
  cachedAgents: number;
  totalCreated: number;
  cacheHits: number;
  cacheMisses: number;
}

export class AgentCacheService {
  private agentCache: Map<string, AgentExecutor>;
  private creationCount: number;
  private cacheHits: number;
  private cacheMisses: number;

  constructor() {
    this.agentCache = new Map();
    this.creationCount = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get agent from cache if exists
   */
  getAgent(fiendName: string): AgentExecutor | null {
    const agent = this.agentCache.get(fiendName);
    if (agent) {
      this.cacheHits++;
      return agent;
    }
    this.cacheMisses++;
    return null;
  }

  /**
   * Cache an agent for a fiend
   */
  cacheAgent(fiendName: string, agent: AgentExecutor): void {
    this.agentCache.set(fiendName, agent);
    this.creationCount++;
  }

  /**
   * Remove agent from cache
   */
  removeAgent(fiendName: string): boolean {
    return this.agentCache.delete(fiendName);
  }

  /**
   * Check if agent is cached
   */
  hasAgent(fiendName: string): boolean {
    return this.agentCache.has(fiendName);
  }

  /**
   * Get all cached fiend names
   */
  getCachedFiendNames(): string[] {
    return Array.from(this.agentCache.keys());
  }

  /**
   * Clear all cached agents
   */
  clearCache(): void {
    this.agentCache.clear();
    console.log("🧹 Cleared all agent cache");
  }

  /**
   * Clear cache for specific fiends
   */
  clearCacheForFiends(fiendNames: string[]): void {
    fiendNames.forEach(name => this.removeAgent(name));
    console.log(`🧹 Cleared agent cache for: ${fiendNames.join(', ')}`);
  }

  /**
   * Get cache statistics
   */
  getStats(): AgentCacheStats {
    return {
      cachedAgents: this.agentCache.size,
      totalCreated: this.creationCount,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses
    };
  }

  /**
   * Get cache hit ratio
   */
  getCacheHitRatio(): number {
    const totalRequests = this.cacheHits + this.cacheMisses;
    return totalRequests > 0 ? this.cacheHits / totalRequests : 0;
  }
}
