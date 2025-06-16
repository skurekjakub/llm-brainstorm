#!/usr/bin/env node

/**
 * Cacophony Entry Point (Refactored)
 * 
 * Uses the new refactored orchestrator with helper classes.
 */

import { CacophonyOrchestrator, SessionConfig } from './cacophony';

async function main() {
  try {
    // Optional: customize session configuration
    const sessionConfig: Partial<SessionConfig> = {
      fiendCount: 5,
      enableSearch: true,
      defaultTimeout: 30000
    };

    // Create and run the orchestrator
    const orchestrator = await CacophonyOrchestrator.create(sessionConfig);
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
export { CacophonyOrchestrator } from './cacophony';
