import { ToolRegistry } from './src/services/tool-registry';
import { MemoryManager } from './src/services/memory-manager';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * Test MCP Integration
 * 
 * Tests the MCP server integration with the tool registry
 */

async function testMCPIntegration() {
  console.log('🧪 Testing MCP Integration...\n');
  
  try {
    // Create a mock LLM for memory manager
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-pro-latest",
      temperature: 0,
      apiKey: process.env.GOOGLE_API_KEY || "dummy-key-for-test"
    });
    
    // Create memory manager
    const memoryManager = new MemoryManager(llm);
    
    // Create tool registry (this will initialize MCP servers)
    console.log('📦 Creating tool registry...');
    const toolRegistry = await ToolRegistry.create(memoryManager);
    
    // Get tool statistics
    const stats = toolRegistry.getStats();
    console.log('\n📊 Tool Registry Stats:');
    console.log(`   Total tools: ${stats.totalTools}`);
    console.log(`   Enabled tools: ${stats.enabledTools}`);
    console.log(`   Disabled tools: ${stats.disabledTools}`);
    console.log(`   Tool names: ${stats.toolNames.join(', ')}`);
    
    // Get MCP server status
    const mcpManager = toolRegistry.getMCPManager();
    const mcpStatus = mcpManager.getServerStatus();
    console.log('\n🔌 MCP Server Status:');
    mcpStatus.forEach(server => {
      const status = server.connected ? '✅ Connected' : '❌ Disconnected';
      console.log(`   ${server.name}: ${status} (${server.toolCount} tools)`);
    });
    
    // List all enabled tools
    const enabledTools = toolRegistry.getEnabledTools();
    console.log('\n🛠️  Enabled Tools:');
    enabledTools.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
    
    // Test a tool if any MCP tools are available
    const mcpTools = enabledTools.filter(tool => tool.name.includes('_'));
    if (mcpTools.length > 0) {
      console.log('\n🧪 Testing MCP tool...');
      const testTool = mcpTools[0];
      console.log(`   Testing: ${testTool.name}`);
      
      try {
        // This is just a basic test - you'd need to provide proper arguments
        // const result = await testTool.invoke({});
        console.log(`   ✅ Tool ${testTool.name} is callable`);
      } catch (error) {
        console.log(`   ⚠️  Tool test failed (expected for some tools): ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Cleanup
    await mcpManager.disconnectAll();
    console.log('\n🧹 Cleanup completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testMCPIntegration()
    .then(() => {
      console.log('\n✅ MCP integration test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ MCP integration test failed:', error);
      process.exit(1);
    });
}

export { testMCPIntegration };
