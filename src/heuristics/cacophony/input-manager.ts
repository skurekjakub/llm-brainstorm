import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Input Manager
 * 
 * Handles all user input, including prompts, commands, and file reading.
 */

export class InputManager {
  private rl: readline.Interface;
  private promptDataPath: string;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Default path to prompt data
    this.promptDataPath = path.join(process.cwd(), 'data', 'prompt.txt');
  }

  /**
   * Get initial prompt from file or user input
   */
  async getInitialPrompt(): Promise<string> {
    try {
      // Try to read from prompt file first
      if (fs.existsSync(this.promptDataPath)) {
        const promptContent = fs.readFileSync(this.promptDataPath, 'utf-8').trim();
        if (promptContent) {
          console.log(`📄 Using prompt from: ${this.promptDataPath}`);
          return promptContent;
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not read prompt file: ${this.promptDataPath}`);
    }

    // Fall back to user input
    return await this.getUserInput("Enter your initial prompt");
  }

  /**
   * Get user input with a prompt
   */
  async getUserInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(`\n💭 ${prompt}: `, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  /**
   * Get user input for a specific turn
   */
  async getUserInputForTurn(turnNumber: number): Promise<string> {
    return await this.getUserInput(`Turn ${turnNumber} - Your message (or /help for commands)`);
  }

  /**
   * Get confirmation from user
   */
  async getConfirmation(message: string): Promise<boolean> {
    const response = await this.getUserInput(`${message} (y/n)`);
    return response.toLowerCase().startsWith('y');
  }

  /**
   * Set custom prompt data path
   */
  setPromptDataPath(filePath: string): void {
    this.promptDataPath = filePath;
  }

  /**
   * Close the readline interface
   */
  close(): void {
    this.rl.close();
  }

  /**
   * Check if prompt file exists
   */
  hasPromptFile(): boolean {
    return fs.existsSync(this.promptDataPath);
  }

  /**
   * Get prompt file path
   */
  getPromptFilePath(): string {
    return this.promptDataPath;
  }

  /**
   * Read prompt file content
   */
  readPromptFile(): string | null {
    try {
      if (this.hasPromptFile()) {
        return fs.readFileSync(this.promptDataPath, 'utf-8').trim();
      }
    } catch (error) {
      console.error(`Error reading prompt file: ${error}`);
    }
    return null;
  }

  /**
   * Write prompt to file
   */
  writePromptFile(content: string): boolean {
    try {
      const dir = path.dirname(this.promptDataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.promptDataPath, content, 'utf-8');
      return true;
    } catch (error) {
      console.error(`Error writing prompt file: ${error}`);
      return false;
    }
  }
}
