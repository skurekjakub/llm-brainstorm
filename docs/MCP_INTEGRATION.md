# MCP (Model Context Protocol) Integration

This project supports external MCP servers via stdio communication. MCP servers provide tools that can be dynamically loaded and used by the AI agents.

## Configuration

MCP servers are configured in `config/config.json` under the `mcp` section:

```json
{
  "mcp": {
    "servers": [
      {
        "name": "filesystem",
        "command": "node",
        "args": ["C:\\path\\to\\mcp-server-filesystem\\dist\\index.js"],
        "enabled": false,
        "description": "File system operations via MCP",
        "cwd": "C:\\",
        "env": {}
      },
      {
        "name": "brave-search",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-brave-search"],
        "enabled": false,
        "description": "Brave search integration via MCP",
        "cwd": ".",
        "env": {
          "BRAVE_API_KEY": ""
        }
      }
    ]
  }
}
```

## Server Configuration Properties

- `name`: Unique identifier for the server
- `command`: The command to execute (node, npx, python, etc.)
- `args`: Array of arguments to pass to the command
- `enabled`: Whether to load this server on startup
- `description`: Human-readable description
- `cwd`: Working directory for the server process
- `env`: Environment variables to set for the server

## Available MCP Servers

### Official MCP Servers

Install via npm:

```bash
# File system operations
npm install -g @modelcontextprotocol/server-filesystem

# Brave search
npm install -g @modelcontextprotocol/server-brave-search

# SQLite database
npm install -g @modelcontextprotocol/server-sqlite

# Git operations  
npm install -g @modelcontextprotocol/server-git

# Google Drive
npm install -g @modelcontextprotocol/server-gdrive
```

### Usage Examples

#### File System Server

```json
{
  "name": "filesystem",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/directory"],
  "enabled": true,
  "description": "File system operations",
  "cwd": ".",
  "env": {}
}
```

Tools provided:
- `filesystem_read_file` - Read file contents
- `filesystem_write_file` - Write to file
- `filesystem_list_directory` - List directory contents
- `filesystem_create_directory` - Create directories
- `filesystem_move_file` - Move/rename files
- `filesystem_search_files` - Search for files

#### Brave Search Server

```json
{
  "name": "brave-search",
  "command": "npx", 
  "args": ["-y", "@modelcontextprotocol/server-brave-search"],
  "enabled": true,
  "description": "Web search via Brave",
  "cwd": ".",
  "env": {
    "BRAVE_API_KEY": "your-brave-api-key"
  }
}
```

Tools provided:
- `brave-search_web_search` - Search the web

#### SQLite Server

```json
{
  "name": "sqlite",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-sqlite", "--db-path", "./data/database.db"],
  "enabled": true,
  "description": "SQLite database operations",
  "cwd": ".",
  "env": {}
}
```

Tools provided:
- `sqlite_execute_query` - Execute SQL queries
- `sqlite_list_tables` - List database tables
- `sqlite_describe_table` - Get table schema

## Integration Architecture

1. **MCPClient** (`src/services/mcp-client.ts`): Handles stdio communication with individual MCP servers
2. **MCPManager** (`src/services/mcp-manager.ts`): Manages multiple MCP server connections
3. **MCPToolWrapper** (`src/tools/mcp-tool-wrapper.ts`): Wraps MCP tools for LangChain compatibility
4. **ToolRegistry** (`src/services/tool-registry.ts`): Automatically loads and registers MCP tools

## Testing

Test the MCP integration:

```bash
npm run test-mcp
```

This will:
- Initialize all configured MCP servers
- List available tools
- Show server connection status
- Test tool availability

## Tool Naming Convention

MCP tools are automatically prefixed with their server name to avoid conflicts:
- Original tool: `read_file`
- Registered as: `filesystem_read_file`

## Error Handling

- Failed server connections are logged but don't prevent startup
- Individual tool failures are caught and logged
- Servers can be reconnected dynamically
- Tools are only available when their server is connected

## Development

To add a new MCP server:

1. Add server configuration to `config/config.json`
2. Set `enabled: true`
3. Restart the application or call `toolRegistry.refreshTools()`

To create a custom MCP server, implement the MCP protocol specification at: https://modelcontextprotocol.io/

## Security Considerations

- MCP servers run as separate processes with their own permissions
- File system servers should be configured with appropriate directory restrictions
- Environment variables (like API keys) are isolated to each server process
- Disable servers you don't need by setting `enabled: false`
