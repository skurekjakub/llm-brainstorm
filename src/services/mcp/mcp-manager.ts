import { MCPClient, MCPServerConfig, MCPTool } from './mcp-client';
import { ConfigManager } from '../../managers/config-manager';

/**
 * MCP Manager
 * 
 * Manages multiple MCP server connections and provides unified access to their tools
 */

export interface MCPToolWithServer extends MCPTool {
  serverName: string;
}

export class MCPManager {
  private static instance: MCPManager;
  private clients = new Map<string, MCPClient>();
  private configManager: ConfigManager;

  private constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  public static getInstance(): MCPManager {
    if (!MCPManager.instance) {
      MCPManager.instance = new MCPManager();
    }
    return MCPManager.instance;
  }

  /**
   * Initialize all configured MCP servers
   */
  async initializeServers(): Promise<void> {
    const mcpConfig = this.configManager.getMCPConfig();
    
    if (!mcpConfig || !mcpConfig.servers) {
      console.log('ℹ️  No MCP servers configured');
      return;
    }

    const connectionPromises = mcpConfig.servers
      .filter(server => server.enabled)
      .map(async (serverConfig) => {
        try {
          console.log(`🔌 Connecting to MCP server: ${serverConfig.name}`);
          
          const client = new MCPClient(serverConfig);
          
          // Set up event handlers
          client.on('connect', () => {
            console.log(`✅ Connected to MCP server: ${serverConfig.name}`);
          });
          
          client.on('disconnect', ({ code, signal }) => {
            console.log(`❌ Disconnected from MCP server: ${serverConfig.name} (code: ${code}, signal: ${signal})`);
            this.clients.delete(serverConfig.name);
          });
          
          client.on('error', (error) => {
            console.error(`❌ MCP server error (${serverConfig.name}):`, error.message);
          });

          await client.connect();
          this.clients.set(serverConfig.name, client);
          
        } catch (error) {
          console.error(`❌ Failed to connect to MCP server ${serverConfig.name}:`, error);
        }
      });

    await Promise.allSettled(connectionPromises);
    
    const connectedCount = this.clients.size;
    const totalCount = mcpConfig.servers.filter(s => s.enabled).length;
    
    console.log(`🎯 MCP initialization complete: ${connectedCount}/${totalCount} servers connected`);
  }

  /**
   * Get all available tools from all connected servers
   */
  getAllTools(): MCPToolWithServer[] {
    const allTools: MCPToolWithServer[] = [];
    
    for (const [serverName, client] of this.clients) {
      if (client.isServerConnected()) {
        const serverTools = client.getTools().map(tool => ({
          ...tool,
          serverName,
          name: `${serverName}_${tool.name}` // Prefix with server name to avoid conflicts
        }));
        allTools.push(...serverTools);
      }
    }
    
    return allTools;
  }

  /**
   * Call a tool on the appropriate MCP server
   */
  async callTool(toolName: string, arguments_: any): Promise<any> {
    // Extract server name and original tool name
    const parts = toolName.split('_');
    if (parts.length < 2) {
      throw new Error(`Invalid MCP tool name format: ${toolName}. Expected: serverName_toolName`);
    }
    
    const serverName = parts[0];
    const originalToolName = parts.slice(1).join('_'); // Handle tool names with underscores
    
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`MCP server not found: ${serverName}`);
    }
    
    if (!client.isServerConnected()) {
      throw new Error(`MCP server not connected: ${serverName}`);
    }
    
    return await client.callTool(originalToolName, arguments_);
  }

  /**
   * Get a specific MCP client by server name
   */
  getClient(serverName: string): MCPClient | undefined {
    return this.clients.get(serverName);
  }

  /**
   * Get all connected server names
   */
  getConnectedServers(): string[] {
    return Array.from(this.clients.keys()).filter(name => 
      this.clients.get(name)?.isServerConnected()
    );
  }

  /**
   * Get connection status for all servers
   */
  getServerStatus(): Array<{
    name: string;
    connected: boolean;
    toolCount: number;
    config: MCPServerConfig;
  }> {
    const mcpConfig = this.configManager.getMCPConfig();
    const configuredServers = mcpConfig?.servers || [];
    
    return configuredServers.map(serverConfig => {
      const client = this.clients.get(serverConfig.name);
      const connected = client?.isServerConnected() || false;
      const toolCount = client?.getTools().length || 0;
      
      return {
        name: serverConfig.name,
        connected,
        toolCount,
        config: serverConfig
      };
    });
  }

  /**
   * Disconnect from all MCP servers
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.values()).map(client => 
      client.disconnect().catch(error => 
        console.error('Error disconnecting MCP client:', error)
      )
    );
    
    await Promise.allSettled(disconnectPromises);
    this.clients.clear();
    
    console.log('🔌 Disconnected from all MCP servers');
  }

  /**
   * Reconnect to a specific server
   */
  async reconnectServer(serverName: string): Promise<void> {
    const mcpConfig = this.configManager.getMCPConfig();
    const serverConfig = mcpConfig?.servers?.find(s => s.name === serverName);
    
    if (!serverConfig) {
      throw new Error(`Server configuration not found: ${serverName}`);
    }
    
    // Disconnect existing client if any
    const existingClient = this.clients.get(serverName);
    if (existingClient) {
      await existingClient.disconnect();
      this.clients.delete(serverName);
    }
    
    // Create and connect new client
    const client = new MCPClient(serverConfig);
    await client.connect();
    this.clients.set(serverName, client);
    
    console.log(`🔄 Reconnected to MCP server: ${serverName}`);
  }
}
