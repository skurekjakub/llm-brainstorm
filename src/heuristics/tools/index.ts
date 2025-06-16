/**
 * Tools Index
 * 
 * Central export point for all available tools.
 */

export { BaseToolConfig, ToolCreator } from './base-tool';
export { InternetSearchTool } from './internet-search-tool';
export { MemoryRecallTool } from './memory-recall-tool';
export { CharacterInsightTool } from './character-insight-tool';
export { ConversationAnalysisTool } from './conversation-analysis-tool';

// Tool type definitions
export type AvailableTools = 
  | 'internet_search'
  | 'recall_memory'
  | 'character_insight'
  | 'conversation_analysis';

// Tool metadata
export const TOOL_METADATA = {
  internet_search: {
    category: 'External Data',
    requiresApi: true,
    dependencies: ['TAVILY_API_KEY']
  },
  recall_memory: {
    category: 'Memory',
    requiresApi: false,
    dependencies: []
  },
  character_insight: {
    category: 'Council',
    requiresApi: false,
    dependencies: []
  },
  conversation_analysis: {
    category: 'Analysis',
    requiresApi: false,
    dependencies: []
  }
} as const;
