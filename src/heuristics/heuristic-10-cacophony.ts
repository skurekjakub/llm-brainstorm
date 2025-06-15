import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { FiendsDBManager, Character } from '../managers/fiends-db-manager';
import { ConfigManager } from '../managers/config-manager';
import 'dotenv/config';

/**
 * Heuristic 10: Cacophony of Fiends (Sanitized)
 * 
 * This script creates a council of unethical entities that provide diverse perspectives,
 * then uses a "sage" to synthesize and sanitize their collective wisdom into useful output.
 */

interface FiendResponse {
  name: string;
  perspective: string;
}

interface Council {
  fiends: string[];
  sage: string;
}

// Initialize the managers
const dbManager = FiendsDBManager.getInstance();
const configManager = ConfigManager.getInstance();

class CacophonyOfFiends {
  private llm: ChatGoogleGenerativeAI;

  constructor() {
    const modelConfig = configManager.getModelConfig('cacophony');
    this.llm = new ChatGoogleGenerativeAI({ 
      model: modelConfig.model,
      temperature: modelConfig.temperature
    });
  }

  private selectFiends(count: number = 5): string[] {
    // Use database manager to get random characters
    const randomCharacters = dbManager.getRandomCharacters(count);
    return randomCharacters.map(char => char.name);
  }

  private generateFiendPrompt(fiendName: string, userQuery: string): string {
    // Use database manager to generate character prompt
    try {
      return dbManager.generateCharacterPrompt(fiendName, userQuery);
    } catch (error) {
      // Fallback if character not found (shouldn't happen)
      return `You are ${fiendName}, an unconventional thinker augmented with modern knowledge. 

User Query: ${userQuery}

Provide your unique perspective in 2-3 concise sentences:`;
    }
  }

  private async getFiendPerspective(fiendName: string, userQuery: string): Promise<FiendResponse> {
    console.log(`🎭 Consulting ${fiendName}...`);
    const startTime = Date.now();
    
    const prompt = this.generateFiendPrompt(fiendName, userQuery);
    
    try {
      console.log(`   📤 Sending query to ${fiendName}`);
      const response = await this.llm.invoke(prompt);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const content = typeof response.content === 'string' ? response.content : 'No response';
      
      console.log(`   ✅ ${fiendName} responded (${duration}ms)`);
      console.log(`   💬 Preview: "${content.slice(0, 80)}${content.length > 80 ? '...' : ''}"`);
      
      return {
        name: fiendName,
        perspective: content
      };
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`   ❌ ${fiendName} failed to respond (${duration}ms)`);
      console.log(`   🚨 Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        name: fiendName,
        perspective: `Error getting perspective: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async getSageAnalysis(userQuery: string, fiendResponses: FiendResponse[]): Promise<string> {
    console.log(`🧙‍♂️ Sage analyzing ${fiendResponses.length} perspectives...`);
    const startTime = Date.now();
    
    const fiendInputs = fiendResponses.map(f => 
      `**${f.name}**: ${f.perspective}`
    ).join('\n\n');

    const sage = dbManager.getSage();
    const sagePrompt = `${sage.systemPrompt}

Original Query: ${userQuery}

Perspectives from the Council:
${fiendInputs}

Now synthesize these diverse viewpoints into balanced, constructive guidance:`;

    try {
      console.log(`   📤 Sending synthesis request to sage`);
      const response = await this.llm.invoke(sagePrompt);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const content = typeof response.content === 'string' ? response.content : 'Unable to generate synthesis.';
      
      console.log(`   ✅ Sage synthesis complete (${duration}ms)`);
      console.log(`   📏 Synthesis length: ${content.length} characters`);
      
      return content;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`   ❌ Sage synthesis failed (${duration}ms)`);
      console.log(`   🚨 Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return `Error in sage analysis: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  async processQuery(userQuery: string, fiendCount?: number): Promise<{ fiendResponses: FiendResponse[], sageAnalysis: string }> {
    const settings = configManager.getSettings();
    const councilSize = fiendCount || settings.fiendCount;
    
    console.log(`🔮 Assembling council of ${councilSize} entities...`);
    
    const selectedFiends = this.selectFiends(councilSize);
    console.log(`👹 Council members: ${selectedFiends.join(', ')}\n`);

    console.log("📝 Gathering perspectives...");
    const gatherStartTime = Date.now();
    
    // Get all fiend perspectives with detailed logging
    const fiendPromises = selectedFiends.map((fiend, index) => {
      console.log(`🔄 Queuing ${fiend} (${index + 1}/${councilSize})`);
      return this.getFiendPerspective(fiend, userQuery);
    });
    
    console.log(`⏳ Waiting for ${councilSize} responses...`);
    const fiendResponses = await Promise.all(fiendPromises);
    
    const gatherEndTime = Date.now();
    const totalGatherTime = gatherEndTime - gatherStartTime;
    
    const successfulResponses = fiendResponses.filter(r => !r.perspective.startsWith('Error'));
    const failedResponses = fiendResponses.filter(r => r.perspective.startsWith('Error'));
    
    console.log(`\n📊 Perspective Gathering Complete:`);
    console.log(`   ✅ Successful: ${successfulResponses.length}/${councilSize}`);
    if (failedResponses.length > 0) {
      console.log(`   ❌ Failed: ${failedResponses.length} (${failedResponses.map(f => f.name).join(', ')})`);
    }
    console.log(`   ⏱️  Total time: ${totalGatherTime}ms`);
    console.log(`   📈 Average per perspective: ${Math.round(totalGatherTime / councilSize)}ms\n`);
    
    console.log("🧙‍♂️ Sage synthesizing wisdom...\n");
    
    // Get sage analysis
    const sageAnalysis = await this.getSageAnalysis(userQuery, fiendResponses);
    
    return { fiendResponses, sageAnalysis };
  }
}

async function main() {
  const totalStartTime = Date.now();
  console.log("👹 Heuristic 10: Cacophony of Fiends (Sanitized)");
  console.log("===============================================");
  console.log(`🕐 Started at: ${new Date().toLocaleTimeString()}`);
  console.log("Loading prompt from prompt.txt file...\n");

  try {
    const cacophony = new CacophonyOfFiends();
    
    const userPrompt = dbManager.loadPromptFromFile();
    console.log(`📄 Loaded prompt: "${userPrompt}"`);
    console.log(`📏 Prompt length: ${userPrompt.length} characters\n`);
    
    console.log("=".repeat(80));
    console.log(`🚀 Beginning cacophony analysis...`);
    
    const analysisStartTime = Date.now();
    const result = await cacophony.processQuery(userPrompt, 8);
    const analysisEndTime = Date.now();
    const totalAnalysisTime = analysisEndTime - analysisStartTime;
    
    console.log(`\n✅ Analysis complete! Total processing time: ${totalAnalysisTime}ms\n`);
    
    console.log("📋 COUNCIL PERSPECTIVES:");
    console.log("─".repeat(40));
    
    result.fiendResponses.forEach((response, index) => {
      console.log(`\n**${index + 1}. ${response.name}**:`);
      console.log(response.perspective);
    });
    
    console.log("\n" + "─".repeat(40));
    console.log("🧙‍♂️ SAGE'S SYNTHESIS:");
    console.log("─".repeat(40));
    console.log(result.sageAnalysis);
    
    const totalEndTime = Date.now();
    const totalTime = totalEndTime - totalStartTime;
    
    console.log("\n" + "=".repeat(80));
    console.log(`🏁 Session complete!`);
    console.log(`   ⏱️  Total session time: ${totalTime}ms`);
    console.log(`   📊 Perspectives: ${result.fiendResponses.length}`);
    console.log(`   🕐 Finished at: ${new Date().toLocaleTimeString()}`);
    console.log("=".repeat(80));
    
  } catch (error) {
    const totalEndTime = Date.now();
    const totalTime = totalEndTime - totalStartTime;
    
    console.error("\n❌ Error occurred:");
    console.error(`   🚨 Message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(`   ⏱️  Time before error: ${totalTime}ms`);
    console.log("\nPlease ensure:");
    console.log("   📄 prompt.txt file exists in the data/ folder");
    console.log("   🔑 API keys are set in .env file");
    console.log("   🌐 Internet connection is available");
  }
}

// Export for potential use by other scripts
export { CacophonyOfFiends };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
