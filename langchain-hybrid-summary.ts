import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { pull } from "langchain/hub";
import { BasePromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { StructuredTool, tool } from "langchain/tools";
import { z } from "zod";
import { ConversationSummaryBufferMemory } from "langchain/memory";
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";

/**
 * --- 1. SET UP ENVIRONMENT ---
 */
import 'dotenv/config';

/**
 * --- 2. DEFINE CUSTOM TOOLS ---
 */
const percentageDifferenceSchema = z.object({
  initialValue: z.number().describe("The starting or initial numeric value."),
  finalValue: z.number().describe("The ending or final numeric value for comparison."),
});

const percentageDifferenceCalculator: StructuredTool = tool(
  // ... (tool implementation is unchanged)
  async ({ initialValue, finalValue }) => {
    if (initialValue === 0) {
      return "Error: Initial value cannot be zero for percentage difference calculation.";
    }
    const percentageDiff = ((finalValue - initialValue) / initialValue) * 100;
    if (percentageDiff > 0) {
      return `The final value is ${percentageDiff.toFixed(2)}% larger than the initial value.`;
    } else {
      return `The final value is ${Math.abs(percentageDiff).toFixed(2)}% smaller than the initial value.`;
    }
  },
  {
    name: "percentage_difference_calculator",
    description: "Calculates the percentage difference between two numbers. Use this to find how much one value is larger or smaller than another in percentage terms, for example, to compare the market caps of two companies.",
    schema: percentageDifferenceSchema,
  }
);

/**
 * --- NEW: HYBRID MEMORY CLASS ---
 * This class mixes deterministic logic with LLM summarization.
 */
class HybridMemory extends ConversationSummaryBufferMemory {
  // Override the prune method to inject our custom logic.
  async prune(): Promise<void> {
    const messages = await this.chatHistory.getMessages();
    const currentBufferLength = await this.getBufferLength(messages);

    if (currentBufferLength <= this.maxTokenLimit) {
      return;
    }

    console.log("\n[Hybrid Memory]: Token limit exceeded. Running hybrid summarization...");

    // 1. Deterministic Pre-analysis: Extract key topics.
    // For this example, we'll extract any words in ALL CAPS (like stock tickers).
    // This is a placegolder for more complex NLP analysis that may occurr.
    const conversationString = messages.map(msg => msg.content).join('\n');
    const deterministicKeywords = [...new Set(conversationString.match(/\b[A-Z]{2,}\b/g) || [])];
    
    console.log(`[Hybrid Memory]: Found keywords to preserve: ${deterministicKeywords.join(', ')}`);

    // 2. Dynamic Prompt Injection: Create a new prompt for the summarizer.
    const summarizerPromptTemplate = `Progressively summarize the lines of conversation provided, paying close attention to the following keywords that must be preserved: ${deterministicKeywords.join(', ')}.

Current summary:
{summary}

New lines of conversation:
{new_lines}

New summary:`;

    this.summaryPrompt = PromptTemplate.fromTemplate(summarizerPromptTemplate);
    
    // 3. LLM Summarization Call: Now call the original prune logic, which
    // will use our newly created dynamic prompt.
    console.log("[Hybrid Memory]: Calling LLM with enhanced context...");
    await super.prune();
    console.log("[Hybrid Memory]: Summarization complete.\n");
  }
}


/**
 * --- CONFIGURE LLMS AND MEMORY ---
 */
async function main() {
  const mainLlm = new ChatGoogleGenerativeAI({ model: "gemini-1.5-pro-latest", temperature: 0 });
  const summarizerLlm = new ChatGoogleGenerativeAI({ model: "gemini-1.5-flash-latest", temperature: 0 });

  // Use our new HybridMemory class
  const memory = new HybridMemory({
      llm: summarizerLlm,
      maxTokenLimit: 1000, 
      memoryKey: "chat_history",
      returnMessages: true,
  });

  const searchTool = new TavilySearchResults({ maxResults: 2 });
  const tools = [searchTool, percentageDifferenceCalculator];

  /**
   * --- CREATE THE AGENT ---
   */
  const prompt = await pull<BasePromptTemplate>("hwchase17/react-chat");

  const agent = await createReactAgent({
    llm: mainLlm,
    tools,
    prompt,
  });

  const agentExecutor = new AgentExecutor({
    agent,
    tools,
    memory, // Use the hybrid memory module
    verbose: true,
    handleParsingErrors: true,
  });

  /**
   * --- RUN THE INTERACTIVE CHAT LOOP ---
   */
  const rl = readline.createInterface({ input, output });
  console.log("Welcome to the Conversational Financial Assistant! (Type 'exit' to quit)");

  while (true) {
    const userInput = await rl.question('You: ');

    if (userInput.toLowerCase() === 'exit') {
        console.log("Goodbye!");
        rl.close();
        break;
    }

    if (userInput) {
      const response = await agentExecutor.invoke({
        input: userInput,
      });

      console.log(`Agent: ${response.output}`);
    }
  }
}

main().catch(console.error);
