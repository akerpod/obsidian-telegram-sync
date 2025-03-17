import { App, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import TelegramBot from 'node-telegram-bot-api';

// Define Telegram message interface
interface TelegramMessage {
  message_id: number;
  from?: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
    title?: string;
    username?: string;
  };
  date: number;
  text?: string;
  caption?: string;
  photo?: any[];
  document?: {
    file_name?: string;
  };
  audio?: {
    title?: string;
    duration?: number;
  };
  voice?: {
    duration: number;
  };
  video?: any;
  sticker?: {
    emoji?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface TelegramSyncSettings {
  botToken: string;
  folderPath: string;
  includeMetadata: boolean;
  supportCommands: boolean;
  templates: {
    titleTemplate: string;
    metadataTemplate: string;
    textMessageTemplate: string;
    photoTemplate: string;
    documentTemplate: string;
    audioTemplate: string;
    voiceTemplate: string;
    videoTemplate: string;
    stickerTemplate: string;
    locationTemplate: string;
    unknownTemplate: string;
  };
}

const DEFAULT_SETTINGS: TelegramSyncSettings = {
  botToken: '',
  folderPath: 'Telegram',
  includeMetadata: true,
  supportCommands: true,
  templates: {
    titleTemplate: '# Telegram Message',
    metadataTemplate: '- **From**: {{from}}\n- **Date**: {{date}}\n- **Chat**: {{chat}}',
    textMessageTemplate: '## Message\n\n{{text}}',
    photoTemplate: '## Photo\n\n*[Photo message received]*\n\nCaption: {{caption}}',
    documentTemplate: '## Document\n\n*[Document received]*\n\nFilename: {{filename}}',
    audioTemplate: '## Audio\n\n*[Audio message received]*\n\nTitle: {{title}}',
    voiceTemplate: '## Voice Message\n\n*[Voice message received]*\n\nDuration: {{duration}} seconds',
    videoTemplate: '## Video\n\n*[Video message received]*\n\nCaption: {{caption}}',
    stickerTemplate: '## Sticker\n\n*[Sticker received]*\n\nEmoji: {{emoji}}',
    locationTemplate: '## Location\n\n*[Location shared]*\n\nLatitude: {{latitude}}\nLongitude: {{longitude}}',
    unknownTemplate: '## Unknown Message Type\n\n*[Unsupported message type received]*'
  }
}

export default class TelegramSyncPlugin extends Plugin {
  settings: TelegramSyncSettings = DEFAULT_SETTINGS;
  bot: TelegramBot | null = null;

  async onload() {
    console.log('Loading Telegram Sync plugin');
    await this.loadSettings();
    
    this.addSettingTab(new TelegramSyncSettingTab(this.app, this));

    // Register commands
    this.addCommand({
      id: 'start-telegram-bot',
      name: 'Start Telegram Bot',
      callback: () => this.startBot()
    });

    this.addCommand({
      id: 'stop-telegram-bot',
      name: 'Stop Telegram Bot',
      callback: () => this.stopBot()
    });

    // Start bot if token is available
    if (this.settings.botToken) {
      this.startBot();
    } else {
      new Notice('Please set your Telegram bot token in the settings');
    }
  }

  async startBot() {
    try {
      // Stop existing bot if running
      await this.stopBot();

      if (!this.settings.botToken) {
        new Notice('Telegram bot token is not set. Please configure it in settings.');
        return;
      }

      // Create folder if it doesn't exist
      await this.ensureFolderExists(this.settings.folderPath);

      // Initialize bot
      this.bot = new TelegramBot(this.settings.botToken, { polling: true });
      
      // Handle messages
      this.bot.on('message', async (msg) => {
        try {
          await this.processMessage(msg);
        } catch (error: any) {
          console.error('Error processing message:', error);
          new Notice(`Error processing Telegram message: ${error.message}`);
        }
      });

      // Handle commands if enabled
      if (this.settings.supportCommands) {
        this.setupBotCommands();
      }

      new Notice('Telegram bot started successfully');
    } catch (error: any) {
      console.error('Failed to start Telegram bot:', error);
      new Notice(`Failed to start Telegram bot: ${error.message}`);
      this.bot = null;
    }
  }

  async stopBot() {
    if (this.bot) {
      try {
        await this.bot.stopPolling();
        this.bot = null;
        new Notice('Telegram bot stopped');
      } catch (error: any) {
        console.error('Error stopping bot:', error);
        new Notice(`Error stopping bot: ${error.message}`);
      }
    }
  }

  setupBotCommands() {
    if (!this.bot) return;

    // Help command
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      const helpText = 
        "Available commands:\n" +
        "/help - Show this help message\n" +
        "/status - Check bot status\n" +
        "/notes - List recent notes";
      
      this.bot?.sendMessage(chatId, helpText);
    });

    // Status command
    this.bot.onText(/\/status/, (msg) => {
      const chatId = msg.chat.id;
      this.bot?.sendMessage(chatId, "Bot is running and connected to Obsidian");
    });

    // List notes command
    this.bot.onText(/\/notes/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const files = await this.app.vault.getMarkdownFiles();
        const telegramFiles = files.filter(file => 
          file.path.startsWith(this.settings.folderPath)
        ).slice(0, 5); // Get 5 most recent
        
        if (telegramFiles.length === 0) {
          this.bot?.sendMessage(chatId, "No Telegram notes found");
          return;
        }
        
        const fileList = telegramFiles.map(file => `- ${file.basename}`).join('\n');
        this.bot?.sendMessage(chatId, `Recent notes:\n${fileList}`);
      } catch (error: any) {
        console.error('Error listing notes:', error);
        this.bot?.sendMessage(chatId, `Error listing notes: ${error.message}`);
      }
    });
  }

  processTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] || match);
  }

  async processMessage(msg: TelegramMessage) {
    // Generate filename
    const timestamp = new Date(msg.date * 1000);
    const formattedDate = timestamp.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `${this.settings.folderPath}/${formattedDate}-${msg.message_id}.md`;
    
    // Generate content based on message type
    let noteContent = '';
    
    // Add title and metadata if enabled
    if (this.settings.includeMetadata) {
      const fromName = `${msg.from?.first_name || ''} ${msg.from?.last_name || ''} ${msg.from?.username ? `(@${msg.from.username})` : ''}`;
      const chatName = msg.chat.title || msg.chat.username || 'Private Chat';
      
      noteContent += this.processTemplate(this.settings.templates.titleTemplate, {}) + '\n\n';
      noteContent += this.processTemplate(this.settings.templates.metadataTemplate, {
        from: fromName,
        date: timestamp.toLocaleString(),
        chat: chatName
      }) + '\n\n';
    }
    
    // Process different message types
    if (msg.text) {
      noteContent += this.processTemplate(this.settings.templates.textMessageTemplate, {
        text: msg.text
      });
    } else if (msg.photo) {
      noteContent += this.processTemplate(this.settings.templates.photoTemplate, {
        caption: msg.caption || 'No caption'
      });
    } else if (msg.document) {
      noteContent += this.processTemplate(this.settings.templates.documentTemplate, {
        filename: msg.document.file_name || 'Unknown'
      });
    } else if (msg.audio) {
      noteContent += this.processTemplate(this.settings.templates.audioTemplate, {
        title: msg.audio.title || 'Unknown'
      });
    } else if (msg.voice) {
      noteContent += this.processTemplate(this.settings.templates.voiceTemplate, {
        duration: msg.voice.duration.toString()
      });
    } else if (msg.video) {
      noteContent += this.processTemplate(this.settings.templates.videoTemplate, {
        caption: msg.caption || 'No caption'
      });
    } else if (msg.sticker) {
      noteContent += this.processTemplate(this.settings.templates.stickerTemplate, {
        emoji: msg.sticker.emoji || 'No emoji'
      });
    } else if (msg.location) {
      noteContent += this.processTemplate(this.settings.templates.locationTemplate, {
        latitude: msg.location.latitude.toString(),
        longitude: msg.location.longitude.toString()
      });
    } else {
      noteContent += this.processTemplate(this.settings.templates.unknownTemplate, {});
    }
    
    // Create the note
    await this.app.vault.create(fileName, noteContent);
  }

  async ensureFolderExists(folderPath: string) {
    const folders = folderPath.split('/').filter(p => p.length > 0);
    let currentPath = '';
    
    for (const folder of folders) {
      currentPath += folder;
      
      try {
        const folderExists = await this.app.vault.adapter.exists(currentPath);
        if (!folderExists) {
          await this.app.vault.createFolder(currentPath);
        }
      } catch (error: any) {
        console.error(`Error creating folder ${currentPath}:`, error);
        throw new Error(`Failed to create folder ${currentPath}: ${error.message}`);
      }
      
      currentPath += '/';
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    
    // Restart bot if it's running and settings changed
    if (this.bot) {
      await this.startBot();
    }
  }

  async onunload() {
    await this.stopBot();
  }
}

class TelegramSyncSettingTab extends PluginSettingTab {
  plugin: TelegramSyncPlugin;

  constructor(app: App, plugin: TelegramSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: 'Telegram Sync Settings' });
    
    new Setting(containerEl)
      .setName('Telegram Bot Token')
      .setDesc('Obtain from @BotFather on Telegram')
      .addText(text => text
        .setPlaceholder('Enter your bot token')
        .setValue(this.plugin.settings.botToken)
        .onChange(async (value) => {
          this.plugin.settings.botToken = value;
          await this.plugin.saveSettings();
        }));
    
    new Setting(containerEl)
      .setName('Notes Folder')
      .setDesc('Folder where Telegram messages will be saved')
      .addText(text => text
        .setPlaceholder('Telegram')
        .setValue(this.plugin.settings.folderPath)
        .onChange(async (value) => {
          this.plugin.settings.folderPath = value || 'Telegram';
          await this.plugin.saveSettings();
        }));
    
    new Setting(containerEl)
      .setName('Include Metadata')
      .setDesc('Include sender, date, and chat information in notes')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.includeMetadata)
        .onChange(async (value) => {
          this.plugin.settings.includeMetadata = value;
          await this.plugin.saveSettings();
        }));
    
    new Setting(containerEl)
      .setName('Support Bot Commands')
      .setDesc('Enable /help, /status, and /notes commands')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.supportCommands)
        .onChange(async (value) => {
          this.plugin.settings.supportCommands = value;
          await this.plugin.saveSettings();
        }));

    // Template Settings
    containerEl.createEl('h3', { text: 'Template Settings' });
    containerEl.createEl('p', { 
      text: 'Customize how messages are formatted. Use {{variables}} for dynamic content.',
      cls: 'setting-item-description'
    });

    // Title Template
    new Setting(containerEl)
      .setName('Title Template')
      .setDesc('Template for the note title')
      .addTextArea(text => text
        .setPlaceholder('# Telegram Message')
        .setValue(this.plugin.settings.templates.titleTemplate)
        .onChange(async (value) => {
          this.plugin.settings.templates.titleTemplate = value;
          await this.plugin.saveSettings();
        }));

    // Metadata Template
    new Setting(containerEl)
      .setName('Metadata Template')
      .setDesc('Template for message metadata. Variables: {{from}}, {{date}}, {{chat}}')
      .addTextArea(text => text
        .setPlaceholder('- **From**: {{from}}\n- **Date**: {{date}}\n- **Chat**: {{chat}}')
        .setValue(this.plugin.settings.templates.metadataTemplate)
        .onChange(async (value) => {
          this.plugin.settings.templates.metadataTemplate = value;
          await this.plugin.saveSettings();
        }));

    // Text Message Template
    new Setting(containerEl)
      .setName('Text Message Template')
      .setDesc('Template for text messages. Variables: {{text}}')
      .addTextArea(text => text
        .setPlaceholder('## Message\n\n{{text}}')
        .setValue(this.plugin.settings.templates.textMessageTemplate)
        .onChange(async (value) => {
          this.plugin.settings.templates.textMessageTemplate = value;
          await this.plugin.saveSettings();
        }));

    // Photo Template
    new Setting(containerEl)
      .setName('Photo Template')
      .setDesc('Template for photos. Variables: {{caption}}')
      .addTextArea(text => text
        .setPlaceholder('## Photo\n\n*[Photo message received]*\n\nCaption: {{caption}}')
        .setValue(this.plugin.settings.templates.photoTemplate)
        .onChange(async (value) => {
          this.plugin.settings.templates.photoTemplate = value;
          await this.plugin.saveSettings();
        }));

    // Document Template
    new Setting(containerEl)
      .setName('Document Template')
      .setDesc('Template for documents. Variables: {{filename}}')
      .addTextArea(text => text
        .setPlaceholder('## Document\n\n*[Document received]*\n\nFilename: {{filename}}')
        .setValue(this.plugin.settings.templates.documentTemplate)
        .onChange(async (value) => {
          this.plugin.settings.templates.documentTemplate = value;
          await this.plugin.saveSettings();
        }));

    // Audio Template
    new Setting(containerEl)
      .setName('Audio Template')
      .setDesc('Template for audio files. Variables: {{title}}')
      .addTextArea(text => text
        .setPlaceholder('## Audio\n\n*[Audio message received]*\n\nTitle: {{title}}')
        .setValue(this.plugin.settings.templates.audioTemplate)
        .onChange(async (value) => {
          this.plugin.settings.templates.audioTemplate = value;
          await this.plugin.saveSettings();
        }));

    // Voice Template
    new Setting(containerEl)
      .setName('Voice Template')
      .setDesc('Template for voice messages. Variables: {{duration}}')
      .addTextArea(text => text
        .setPlaceholder('## Voice Message\n\n*[Voice message received]*\n\nDuration: {{duration}} seconds')
        .setValue(this.plugin.settings.templates.voiceTemplate)
        .onChange(async (value) => {
          this.plugin.settings.templates.voiceTemplate = value;
          await this.plugin.saveSettings();
        }));

    // Video Template
    new Setting(containerEl)
      .setName('Video Template')
      .setDesc('Template for videos. Variables: {{caption}}')
      .addTextArea(text => text
        .setPlaceholder('## Video\n\n*[Video message received]*\n\nCaption: {{caption}}')
        .setValue(this.plugin.settings.templates.videoTemplate)
        .onChange(async (value) => {
          this.plugin.settings.templates.videoTemplate = value;
          await this.plugin.saveSettings();
        }));

    // Sticker Template
    new Setting(containerEl)
      .setName('Sticker Template')
      .setDesc('Template for stickers. Variables: {{emoji}}')
      .addTextArea(text => text
        .setPlaceholder('## Sticker\n\n*[Sticker received]*\n\nEmoji: {{emoji}}')
        .setValue(this.plugin.settings.templates.stickerTemplate)
        .onChange(async (value) => {
          this.plugin.settings.templates.stickerTemplate = value;
          await this.plugin.saveSettings();
        }));

    // Location Template
    new Setting(containerEl)
      .setName('Location Template')
      .setDesc('Template for locations. Variables: {{latitude}}, {{longitude}}')
      .addTextArea(text => text
        .setPlaceholder('## Location\n\n*[Location shared]*\n\nLatitude: {{latitude}}\nLongitude: {{longitude}}')
        .setValue(this.plugin.settings.templates.locationTemplate)
        .onChange(async (value) => {
          this.plugin.settings.templates.locationTemplate = value;
          await this.plugin.saveSettings();
        }));

    // Unknown Template
    new Setting(containerEl)
      .setName('Unknown Type Template')
      .setDesc('Template for unsupported message types')
      .addTextArea(text => text
        .setPlaceholder('## Unknown Message Type\n\n*[Unsupported message type received]*')
        .setValue(this.plugin.settings.templates.unknownTemplate)
        .onChange(async (value) => {
          this.plugin.settings.templates.unknownTemplate = value;
          await this.plugin.saveSettings();
        }));

    // Add control buttons
    containerEl.createEl('h3', { text: 'Bot Controls' });
    
    const controlDiv = containerEl.createDiv('bot-controls');
    controlDiv.style.display = 'flex';
    controlDiv.style.justifyContent = 'space-around';
    controlDiv.style.marginTop = '20px';
    
    const startButton = controlDiv.createEl('button', { text: 'Start Bot' });
    startButton.onclick = () => this.plugin.startBot();
    
    const stopButton = controlDiv.createEl('button', { text: 'Stop Bot' });
    stopButton.onclick = () => this.plugin.stopBot();
  }
}
