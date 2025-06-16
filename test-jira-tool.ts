#!/usr/bin/env ts-node

/**
 * JIRA Tool Test
 * 
 * Quick test to verify the JIRA tool is working correctly
 */

import { JiraIssueTool } from './src/tools/jira-issue-tool';

async function testJiraTool() {
  console.log('🔧 Testing JIRA Issue Tool...\n');
  
  const jiraTool = new JiraIssueTool();
  
  // Check tool configuration
  const config = jiraTool.getConfig();
  console.log('📋 Tool Configuration:');
  console.log(`   Name: ${config.name}`);
  console.log(`   Description: ${config.description}`);
  console.log(`   Enabled: ${config.enabled}`);
  console.log(`   Dependencies: ${config.dependencies?.join(', ')}`);
  
  if (!jiraTool.isEnabled()) {
    console.log('\n⚠️  JIRA tool is not enabled. Please configure JIRA environment variables.');
    return;
  }
  
  console.log('\n🛠️ Creating tool instance...');
  const tool = jiraTool.createTool();
  
  console.log('✅ Tool created successfully!');
  console.log(`   Tool name: ${tool.name}`);
  console.log(`   Tool description: ${tool.description}`);
  
  // Test the tool with a real issue
  console.log('\n🎫 Testing with issue DOC-2848...');
  try {
    const result = await tool.invoke({
      projectKey: 'DOC',
      issueNumber: '2848'
    });
    
    console.log('✅ Tool execution successful!');
    console.log('\n📋 Result:');
    console.log(result);
    
  } catch (error) {
    console.error('❌ Tool execution failed:', error);
  }
  
  // Show usage examples
  console.log('\n💡 Usage Examples:');
  jiraTool.getUsageExamples().forEach(example => {
    console.log(`   ${example}`);
  });
}

// Run the test
testJiraTool().catch(console.error);
