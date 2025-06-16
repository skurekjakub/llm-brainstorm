import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { MCPManager, MCPToolWithServer } from '../services/mcp-manager';
import { BaseToolConfig, ToolCreator } from './base-tool';

/**
 * MCP Tool Wrapper
 * 
 * Wraps MCP server tools to work with LangChain's tool system
 */

export class MCPToolWrapper implements ToolCreator {
  private mcpTool: MCPToolWithServer;
  private mcpManager: MCPManager;

  constructor(mcpTool: MCPToolWithServer) {
    this.mcpTool = mcpTool;
    this.mcpManager = MCPManager.getInstance();
  }

  createTool(): DynamicStructuredTool {
    // Convert MCP schema to Zod schema
    const zodSchema = this.convertMCPSchemaToZod(this.mcpTool.inputSchema);

    return new DynamicStructuredTool({
      name: this.mcpTool.name,
      description: this.mcpTool.description,
      schema: zodSchema,
      func: async (args) => {
        try {
          const result = await this.mcpManager.callTool(this.mcpTool.name, args);
          
          // Format the result for the AI agent
          if (result && typeof result === 'object') {
            if (result.content) {
              // MCP tools often return {content: [...]} format
              if (Array.isArray(result.content)) {
                return result.content.map((item: any) => 
                  typeof item === 'object' ? (item.text || JSON.stringify(item)) : String(item)
                ).join('\n');
              }
              return String(result.content);
            }
            
            // Handle other response formats
            if (result.text) return result.text;
            if (result.data) return JSON.stringify(result.data, null, 2);
            
            // Fallback to JSON string
            return JSON.stringify(result, null, 2);
          }
          
          return String(result);
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return `Error calling MCP tool ${this.mcpTool.name}: ${errorMessage}`;
        }
      }
    });
  }

  /**
   * Convert MCP JSON Schema to Zod schema
   */
  private convertMCPSchemaToZod(mcpSchema: any): z.ZodType<any> {
    if (mcpSchema.type === 'object') {
      const shape: Record<string, z.ZodType<any>> = {};
      
      if (mcpSchema.properties) {
        for (const [key, prop] of Object.entries(mcpSchema.properties)) {
          const propSchema = prop as any;
          shape[key] = this.convertPropertyToZod(propSchema, mcpSchema.required?.includes(key));
        }
      }
      
      return z.object(shape);
    }
    
    // Fallback for non-object schemas
    return z.any();
  }

  /**
   * Convert individual property schema to Zod
   */
  private convertPropertyToZod(propSchema: any, isRequired: boolean = false): z.ZodType<any> {
    let zodType: z.ZodType<any>;
    
    switch (propSchema.type) {
      case 'string':
        zodType = z.string();
        if (propSchema.description) {
          zodType = zodType.describe(propSchema.description);
        }
        break;
        
      case 'number':
        zodType = z.number();
        if (propSchema.description) {
          zodType = zodType.describe(propSchema.description);
        }
        break;
        
      case 'integer':
        zodType = z.number().int();
        if (propSchema.description) {
          zodType = zodType.describe(propSchema.description);
        }
        break;
        
      case 'boolean':
        zodType = z.boolean();
        if (propSchema.description) {
          zodType = zodType.describe(propSchema.description);
        }
        break;
        
      case 'array':
        const itemType = propSchema.items ? this.convertPropertyToZod(propSchema.items) : z.any();
        zodType = z.array(itemType);
        if (propSchema.description) {
          zodType = zodType.describe(propSchema.description);
        }
        break;
        
      case 'object':
        zodType = z.object({});
        if (propSchema.description) {
          zodType = zodType.describe(propSchema.description);
        }
        break;
        
      default:
        zodType = z.any();
        if (propSchema.description) {
          zodType = zodType.describe(propSchema.description);
        }
    }
    
    // Make optional if not required
    if (!isRequired) {
      zodType = zodType.optional();
    }
    
    return zodType;
  }

  getConfig(): BaseToolConfig {
    return {
      name: this.mcpTool.name,
      description: `MCP tool from ${this.mcpTool.serverName}: ${this.mcpTool.description}`,
      enabled: true,
      dependencies: [`MCP server: ${this.mcpTool.serverName}`]
    };
  }

  isEnabled(): boolean {
    const connectedServers = this.mcpManager.getConnectedServers();
    return connectedServers.includes(this.mcpTool.serverName);
  }

  /**
   * Get the original MCP tool definition
   */
  getMCPTool(): MCPToolWithServer {
    return this.mcpTool;
  }
}
