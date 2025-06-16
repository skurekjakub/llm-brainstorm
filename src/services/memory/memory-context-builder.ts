import { MemoryProvider } from './memory-provider.interface';

/**
 * Memory Context Builder
 * 
 * Single responsibility: Build context strings from various memory sources.
 * Provides flexible context construction for different agent needs.
 */

export interface ContextOptions {
  includeSystemPrompt?: boolean;
  maxLength?: number;
  includeTimestamps?: boolean;
  format?: 'plain' | 'markdown' | 'json';
}

export class MemoryContextBuilder {
  /**
   * Build context from a single memory provider
   */
  async buildSingleContext(
    provider: MemoryProvider, 
    options: ContextOptions = {}
  ): Promise<string> {
    const context = await provider.getContext();
    return this.formatContext(context, options);
  }

  /**
   * Build combined context from multiple memory providers
   */
  async buildCombinedContext(
    providers: { name: string; provider: MemoryProvider }[],
    options: ContextOptions = {}
  ): Promise<string> {
    const contexts: string[] = [];

    for (const { name, provider } of providers) {
      const context = await provider.getContext();
      if (context.trim()) {
        const formattedContext = options.format === 'markdown' 
          ? `## ${name}\n${context}\n`
          : `=== ${name} ===\n${context}\n`;
        contexts.push(formattedContext);
      }
    }

    const combined = contexts.join('\n');
    return this.formatContext(combined, options);
  }

  /**
   * Build context with memory statistics
   */
  async buildContextWithStats(
    providers: { name: string; provider: MemoryProvider }[],
    options: ContextOptions = {}
  ): Promise<{ context: string; stats: any[] }> {
    const context = await this.buildCombinedContext(providers, options);
    
    const stats = await Promise.all(
      providers.map(async ({ name, provider }) => ({
        name,
        ...(await provider.getStats())
      }))
    );

    return { context, stats };
  }

  /**
   * Format context based on options
   */
  private formatContext(context: string, options: ContextOptions): string {
    let formatted = context;

    // Apply max length if specified
    if (options.maxLength && formatted.length > options.maxLength) {
      formatted = formatted.substring(0, options.maxLength) + '...';
    }

    // Apply timestamps if requested
    if (options.includeTimestamps) {
      const timestamp = new Date().toISOString();
      formatted = `[Generated: ${timestamp}]\n${formatted}`;
    }

    return formatted;
  }

  /**
   * Build context for fiend-specific agent
   */
  async buildFiendAgentContext(
    fiendProvider: MemoryProvider,
    conversationProvider?: MemoryProvider,
    options: ContextOptions = {}
  ): Promise<string> {
    const providers = [
      { name: 'Character Memory', provider: fiendProvider }
    ];

    if (conversationProvider) {
      providers.push({ name: 'Recent Conversation', provider: conversationProvider });
    }

    return this.buildCombinedContext(providers, options);
  }

  /**
   * Build context for sage analysis
   */
  async buildSageAnalysisContext(
    sageProvider: MemoryProvider,
    fiendProviders: { name: string; provider: MemoryProvider }[],
    options: ContextOptions = {}
  ): Promise<string> {
    const allProviders = [
      { name: 'Sage Memory', provider: sageProvider },
      ...fiendProviders
    ];

    return this.buildCombinedContext(allProviders, {
      ...options,
      format: 'markdown'
    });
  }
}
