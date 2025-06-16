/**
 * Command Processor
 * 
 * Handles parsing and execution of user commands during conversation sessions.
 */

export type CommandType = 'quit' | 'clear' | 'members' | 'stats' | 'help' | 'empty' | 'continue';

export interface Command {
  type: CommandType;
  args?: string[];
  originalInput: string;
}

export interface CommandResult {
  type: CommandType;
  shouldContinue: boolean;
  message?: string;
  data?: any;
}

export class CommandProcessor {
  private commands: Map<string, CommandType>;

  constructor() {
    this.commands = new Map([
      ['quit', 'quit'],
      ['q', 'quit'],
      ['exit', 'quit'],
      ['clear', 'clear'],
      ['reset', 'clear'],
      ['members', 'members'],
      ['council', 'members'],
      ['stats', 'stats'],
      ['statistics', 'stats'],
      ['help', 'help'],
      ['?', 'help']
    ]);
  }

  /**
   * Parse user input into a command
   */
  parseInput(input: string): Command {
    const trimmedInput = input.trim();
    
    // Check for empty input
    if (!trimmedInput) {
      return {
        type: 'empty',
        originalInput: input
      };
    }

    // Check for commands (starting with / or being a known command)
    const lowerInput = trimmedInput.toLowerCase();
    
    // Handle slash commands
    if (trimmedInput.startsWith('/')) {
      const parts = trimmedInput.slice(1).split(' ');
      const commandName = parts[0].toLowerCase();
      const args = parts.slice(1);
      
      const commandType = this.commands.get(commandName) || 'help';
      
      return {
        type: commandType,
        args,
        originalInput: input
      };
    }
    
    // Handle direct command words
    if (this.commands.has(lowerInput)) {
      return {
        type: this.commands.get(lowerInput)!,
        originalInput: input
      };
    }

    // Default to continue conversation
    return {
      type: 'continue',
      originalInput: input
    };
  }

  /**
   * Execute a command
   */
  async executeCommand(command: Command, context?: any): Promise<CommandResult> {
    switch (command.type) {
      case 'quit':
        return {
          type: 'quit',
          shouldContinue: false,
          message: '👋 Ending session...'
        };

      case 'clear':
        return {
          type: 'clear',
          shouldContinue: true,
          message: '🧹 Memory cleared'
        };

      case 'members':
        return {
          type: 'members',
          shouldContinue: true,
          message: '👥 Council members:',
          data: context?.councilMembers || []
        };

      case 'stats':
        return {
          type: 'stats',
          shouldContinue: true,
          message: '📊 Session statistics:',
          data: context?.stats || {}
        };

      case 'help':
        return {
          type: 'help',
          shouldContinue: true,
          message: this.getHelpText()
        };

      case 'empty':
        return {
          type: 'empty',
          shouldContinue: true,
          message: '⚠️ Please enter a message or command'
        };

      case 'continue':
        return {
          type: 'continue',
          shouldContinue: true
        };

      default:
        return {
          type: 'help',
          shouldContinue: true,
          message: `Unknown command: ${command.originalInput}\n${this.getHelpText()}`
        };
    }
  }

  /**
   * Get help text
   */
  private getHelpText(): string {
    return `
Available commands:
  /quit, /q, /exit     - End the session
  /clear, /reset       - Clear all memory
  /members, /council   - Show council members
  /stats, /statistics  - Show session statistics
  /help, /?            - Show this help

Or just type your message to continue the conversation.
    `.trim();
  }

  /**
   * Check if input is a command
   */
  isCommand(input: string): boolean {
    const command = this.parseInput(input);
    return command.type !== 'continue';
  }

  /**
   * Get all available commands
   */
  getAvailableCommands(): string[] {
    return Array.from(this.commands.keys());
  }
}
