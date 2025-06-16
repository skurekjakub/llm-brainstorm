#!/usr/bin/env node

/**
 * Simple Cacophony Entry Script
 */

async function main() {
  try {
    // Import the main cacophony orchestrator
    const { CacophonyOrchestrator } = await import('./heuristic-10-cacophony');
    
    // Create and run the orchestrator
    const orchestrator = await CacophonyOrchestrator.create();
    await orchestrator.runConversationalSession();
    
  } catch (error) {
    console.error('❌ Error running cacophony:');
    console.error(error);
    process.exit(1);
  }
}

// Handle interrupts gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Goodbye!');
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  main();
}

export { main as runCacophony };
