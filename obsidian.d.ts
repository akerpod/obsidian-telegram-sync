declare module 'obsidian' {
  interface App {
    vault: Vault;
  }

  interface HTMLElement {
    createEl<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: { text?: string, cls?: string | string[] }): HTMLElementTagNameMap[K];
    createDiv(cls?: string): HTMLDivElement;
    empty(): void;
    style: CSSStyleDeclaration;
  }

  interface Vault {
    create(path: string, content: string): Promise<TFile>;
    getMarkdownFiles(): TFile[];
    adapter: {
      exists(path: string): Promise<boolean>;
    };
    createFolder(path: string): Promise<void>;
  }

  class TFile {
    path: string;
    basename: string;
  }

  class Notice {
    constructor(message: string, timeout?: number);
  }

  interface Command {
    id: string;
    name: string;
    callback: () => void;
  }

  class Plugin {
    app: App;
    settings: any;
    loadData(): Promise<any>;
    saveData(data: any): Promise<void>;
    addSettingTab(tab: PluginSettingTab): void;
    addCommand(command: Command): void;
  }

  class PluginSettingTab {
    app: App;
    plugin: Plugin;
    containerEl: HTMLElement;
    constructor(app: App, plugin: Plugin);
    display(): void;
  }

  class Setting {
    constructor(containerEl: HTMLElement);
    setName(name: string): this;
    setDesc(desc: string): this;
    addText(cb: (text: TextComponent) => any): this;
    addToggle(cb: (toggle: ToggleComponent) => any): this;
    addTextArea(cb: (text: TextAreaComponent) => any): this;
  }

  interface TextComponent {
    setPlaceholder(text: string): this;
    setValue(value: string): this;
    onChange(cb: (value: string) => void): this;
  }

  interface TextAreaComponent {
    setPlaceholder(text: string): this;
    setValue(value: string): this;
    onChange(cb: (value: string) => void): this;
  }

  interface ToggleComponent {
    setValue(value: boolean): this;
    onChange(cb: (value: boolean) => void): this;
  }
}

declare module 'node-telegram-bot-api' {
  interface User {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
  }

  interface Chat {
    id: number;
    type: string;
    title?: string;
    username?: string;
  }

  interface Message {
    message_id: number;
    from?: User;
    chat: Chat;
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

  class TelegramBot {
    constructor(token: string, options: { polling: boolean });
    on(event: string, listener: (msg: Message) => void): void;
    onText(regexp: RegExp, callback: (msg: Message, match?: RegExpExecArray) => void): void;
    sendMessage(chatId: number, text: string): Promise<Message>;
    stopPolling(): Promise<void>;
  }

  export default TelegramBot;
}
