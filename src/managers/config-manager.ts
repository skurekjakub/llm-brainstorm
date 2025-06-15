import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration Manager
 * 
 * Dedicated class for managing application configuration.
 * Handles loading, validation, and providing access to configuration data.
 * Follows Single Responsibility Principle - only manages configuration.
 */

export interface ModelConfig {
  provider: string;
  model: string;
  temperature: number;
  description: string;
}

export interface AppSettings {
  defaultMaxTokens: number;
  defaultTimeout: number;
  retryAttempts: number;
  fiendCount: number;
  memoryTokenLimit: number;
}

export interface ProviderConfig {
  apiKeyEnvVar: string;
  baseUrl: string;
}

export interface AppConfig {
  models: {
    main: ModelConfig;
    roleplay: ModelConfig;
    cacophony: ModelConfig;
    summarizer: ModelConfig;
  };
  settings: AppSettings;
  providers: {
    [key: string]: ProviderConfig;
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;
  private configPath: string;
  private lastModified: number;

  private constructor() {
    this.configPath = path.join(__dirname, '..', '..', 'config', 'config.json');
    this.lastModified = 0;
    this.config = this.loadConfig();
  }

  /**
   * Singleton pattern - ensures only one instance of the config manager
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load configuration from JSON file
   */
  private loadConfig(): AppConfig {
    try {
      const stats = fs.statSync(this.configPath);
      this.lastModified = stats.mtime.getTime();
      
      const rawData = fs.readFileSync(this.configPath, 'utf8');
      const config = JSON.parse(rawData);
      
      this.validateConfig(config);
      return config;
    } catch (error) {
      throw new Error(`Failed to load configuration from ${this.configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate configuration structure and required fields
   */
  private validateConfig(config: any): void {
    const errors: string[] = [];

    // Validate models section
    if (!config.models || typeof config.models !== 'object') {
      errors.push("Missing or invalid 'models' section");
    } else {
      const requiredModels = ['main', 'roleplay', 'cacophony', 'summarizer'];
      requiredModels.forEach(modelType => {
        if (!config.models[modelType]) {
          errors.push(`Missing model configuration for '${modelType}'`);
        } else {
          const model = config.models[modelType];
          if (!model.provider) errors.push(`Missing provider for model '${modelType}'`);
          if (!model.model) errors.push(`Missing model name for '${modelType}'`);
          if (typeof model.temperature !== 'number') errors.push(`Invalid temperature for model '${modelType}'`);
        }
      });
    }

    // Validate settings section
    if (!config.settings || typeof config.settings !== 'object') {
      errors.push("Missing or invalid 'settings' section");
    } else {
      const requiredSettings = ['defaultMaxTokens', 'defaultTimeout', 'retryAttempts', 'fiendCount', 'memoryTokenLimit'];
      requiredSettings.forEach(setting => {
        if (typeof config.settings[setting] !== 'number') {
          errors.push(`Missing or invalid setting '${setting}'`);
        }
      });
    }

    // Validate providers section
    if (!config.providers || typeof config.providers !== 'object') {
      errors.push("Missing or invalid 'providers' section");
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\\n- ${errors.join('\\n- ')}`);
    }
  }

  /**
   * Check if config file has been modified and reload if necessary
   */
  private checkAndReload(): void {
    try {
      const stats = fs.statSync(this.configPath);
      if (stats.mtime.getTime() > this.lastModified) {
        console.log('📝 Configuration file changed, reloading...');
        this.config = this.loadConfig();
      }
    } catch (error) {
      console.warn('Warning: Could not check config file modification time:', error);
    }
  }

  /**
   * Get model configuration by type
   */
  public getModelConfig(modelType: 'main' | 'roleplay' | 'cacophony' | 'summarizer'): ModelConfig {
    this.checkAndReload();
    return { ...this.config.models[modelType] }; // Return a copy
  }

  /**
   * Get all model configurations
   */
  public getAllModelConfigs(): AppConfig['models'] {
    this.checkAndReload();
    return JSON.parse(JSON.stringify(this.config.models)); // Deep copy
  }

  /**
   * Get application settings
   */
  public getSettings(): AppSettings {
    this.checkAndReload();
    return { ...this.config.settings }; // Return a copy
  }

  /**
   * Get provider configuration
   */
  public getProviderConfig(provider: string): ProviderConfig | undefined {
    this.checkAndReload();
    return this.config.providers[provider] ? { ...this.config.providers[provider] } : undefined;
  }

  /**
   * Get full configuration (for debugging/admin purposes)
   */
  public getFullConfig(): AppConfig {
    this.checkAndReload();
    return JSON.parse(JSON.stringify(this.config)); // Deep copy
  }

  /**
   * Manually reload configuration from file
   */
  public reloadConfig(): void {
    this.config = this.loadConfig();
  }

  /**
   * Save configuration back to file (for runtime modifications)
   */
  public saveConfig(config: AppConfig): void {
    try {
      this.validateConfig(config);
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
      this.config = config;
      this.lastModified = Date.now();
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get configuration statistics
   */
  public getConfigStats(): {
    configPath: string;
    lastModified: Date;
    modelCount: number;
    providerCount: number;
    isValid: boolean;
  } {
    return {
      configPath: this.configPath,
      lastModified: new Date(this.lastModified),
      modelCount: Object.keys(this.config.models).length,
      providerCount: Object.keys(this.config.providers).length,
      isValid: true // If we got here, config is valid
    };
  }

  /**
   * Update a specific model configuration
   */
  public updateModelConfig(modelType: 'main' | 'roleplay' | 'cacophony' | 'summarizer', config: ModelConfig): void {
    const newConfig = { ...this.config };
    newConfig.models[modelType] = config;
    this.saveConfig(newConfig);
  }

  /**
   * Update application settings
   */
  public updateSettings(settings: Partial<AppSettings>): void {
    const newConfig = { ...this.config };
    newConfig.settings = { ...newConfig.settings, ...settings };
    this.saveConfig(newConfig);
  }
}
