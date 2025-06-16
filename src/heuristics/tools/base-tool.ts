import { DynamicStructuredTool } from "@langchain/core/tools";

/**
 * Base Tool Interface
 * 
 * Common interface for all tools in the system.
 */

export interface BaseToolConfig {
  name: string;
  description: string;
  enabled: boolean;
  dependencies?: string[];
}

export interface ToolCreator {
  createTool(): DynamicStructuredTool;
  getConfig(): BaseToolConfig;
  isEnabled(): boolean;
}
