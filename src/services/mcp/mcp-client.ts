import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

/**
 * MCP (Model Context Protocol) Client
 * 
 * Connects to external MCP servers via stdio and provides tool access
 */

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  enabled: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPRequest {
  jsonrpc: string;
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: string;
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class MCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private config: MCPServerConfig;
  private requestId = 0;
  private pendingRequests = new Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();
  private isConnected = false;
  private tools: MCPTool[] = [];

  constructor(config: MCPServerConfig) {
    super();
    this.config = config;
  }

  /**
   * Start the MCP server process and initialize connection
   */
  async connect(): Promise<void> {
    if (this.process) {
      throw new Error('MCP server is already running');
    }

    try {
      console.log(`🔌 Starting MCP server: ${this.config.name}`);
      console.log(`   Command: ${this.config.command} ${(this.config.args || []).join(' ')}`);
      console.log(`   CWD: ${this.config.cwd || process.cwd()}`);
      
      // Spawn the MCP server process
      this.process = spawn(this.config.command, this.config.args || [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...this.config.env },
        cwd: this.config.cwd || process.cwd()
      });

      // Handle process events
      this.process.on('error', (error) => {
        console.error(`❌ MCP server process error (${this.config.name}):`, error.message);
        this.emit('error', new Error(`MCP server process error: ${error.message}`));
      });

      this.process.on('exit', (code, signal) => {
        console.log(`🔌 MCP server process exited (${this.config.name}): code=${code}, signal=${signal}`);
        this.isConnected = false;
        this.emit('disconnect', { code, signal });
      });

      // Handle stdout (responses from server)
      let buffer = '';
      this.process.stdout?.on('data', (chunk) => {
        buffer += chunk.toString();
        
        // Split by newlines to handle multiple messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response: MCPResponse = JSON.parse(line);
              this.handleResponse(response);
            } catch (error) {
              console.error('Failed to parse MCP response:', line, error);
            }
          }
        }
      });

      // Handle stderr (server logs)
      this.process.stderr?.on('data', (chunk) => {
        const message = chunk.toString().trim();
        if (message) {
          console.error(`MCP server stderr (${this.config.name}): ${message}`);
        }
      });

      // Initialize the connection
      await this.initialize();
      
      // Load available tools
      await this.loadTools();
      
      this.isConnected = true;
      this.emit('connect');

    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  /**
   * Send MCP initialize request
   */
  private async initialize(): Promise<void> {
    const response = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: 'llm-brainstorm',
        version: '1.0.0'
      }
    });

    if (response.error) {
      throw new Error(`MCP initialization failed: ${response.error.message}`);
    }

    // Send initialized notification
    await this.sendNotification('initialized', {});
  }

  /**
   * Load available tools from the server
   */
  private async loadTools(): Promise<void> {
    const response = await this.sendRequest('tools/list', {});
    
    if (response.error) {
      throw new Error(`Failed to load tools: ${response.error.message}`);
    }

    this.tools = response.result?.tools || [];
  }

  /**
   * Send a request to the MCP server
   */
  private async sendRequest(method: string, params?: any): Promise<MCPResponse> {
    if (!this.process?.stdin) {
      throw new Error('MCP server is not connected');
    }

    const id = ++this.requestId;
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      // Set timeout for requests
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('MCP request timeout'));
        }
      }, 30000); // 30 second timeout

      // Send the request
      this.process!.stdin!.write(JSON.stringify(request) + '\n');
    });
  }

  /**
   * Send a notification to the MCP server (no response expected)
   */
  private async sendNotification(method: string, params?: any): Promise<void> {
    if (!this.process?.stdin) {
      throw new Error('MCP server is not connected');
    }

    const notification = {
      jsonrpc: '2.0',
      method,
      params
    };

    this.process.stdin.write(JSON.stringify(notification) + '\n');
  }

  /**
   * Handle responses from the MCP server
   */
  private handleResponse(response: MCPResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      this.pendingRequests.delete(response.id);
      if (response.error) {
        pending.reject(new Error(`MCP error: ${response.error.message}`));
      } else {
        pending.resolve(response);
      }
    }
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(name: string, arguments_: any): Promise<any> {
    const response = await this.sendRequest('tools/call', {
      name,
      arguments: arguments_
    });

    if (response.error) {
      throw new Error(`Tool call failed: ${response.error.message}`);
    }

    return response.result;
  }

  /**
   * Get available tools
   */
  getTools(): MCPTool[] {
    return [...this.tools];
  }

  /**
   * Check if connected
   */
  isServerConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get server configuration
   */
  getConfig(): MCPServerConfig {
    return { ...this.config };
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      
      // Wait for process to exit or force kill after timeout
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }
    
    this.cleanup();
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.isConnected = false;
    this.process = null;
    this.tools = [];
    
    // Reject all pending requests
    for (const [id, { reject }] of this.pendingRequests) {
      reject(new Error('MCP server disconnected'));
    }
    this.pendingRequests.clear();
  }
}
