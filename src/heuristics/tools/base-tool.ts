import { DynamicStructuredTool, StructuredTool } from "@langchain/core/tools";

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
  createTool(): StructuredTool;
  getConfig(): BaseToolConfig;
  isEnabled(): boolean;
}
