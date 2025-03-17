# Obsidian Telegram Sync Plugin

This plugin allows you to sync Telegram messages with your Obsidian vault, creating notes from messages you receive.

## Features

- **Automatic Message Syncing**: Automatically creates notes from incoming Telegram messages
- **Multiple Message Types**: Supports text, photos, documents, audio, voice messages, videos, stickers, and location messages
- **Customizable Storage**: Configure where and how messages are stored in your vault
- **Bot Commands**: Supports commands like `/help`, `/status`, and `/notes` to interact with the plugin
- **Obsidian Commands**: Includes commands to start and stop the bot from within Obsidian

## Installation

1. Download the latest release from the GitHub repository
2. Extract the zip file into your Obsidian vault's `.obsidian/plugins/` directory
3. Enable the plugin in Obsidian's settings

## Setup

1. Create a Telegram bot using [@BotFather](https://t.me/BotFather) and get your bot token
2. Open the plugin settings in Obsidian
3. Enter your bot token in the settings
4. Configure other settings as needed
5. Start the bot using the "Start Bot" button in settings or the command palette

## Settings

- **Telegram Bot Token**: Your bot token from @BotFather
- **Notes Folder**: The folder where message notes will be saved (default: "Telegram")
- **Include Metadata**: Whether to include sender, date, and chat information in notes
- **Support Bot Commands**: Enable or disable bot commands
- **Template Settings**: Customize how messages are formatted using templates for different message types. Use `{{variables}}` for dynamic content.

## Bot Commands

- `/help`: Show available commands
- `/status`: Check if the bot is running
- `/notes`: List the 5 most recent notes created from messages

## Obsidian Commands

- **Start Telegram Bot**: Start the bot and begin syncing messages
- **Stop Telegram Bot**: Stop the bot and pause message syncing

## Message Format

Messages are saved as Markdown files with the following format:

```markdown
# Telegram Message

- **From**: User Name (@username)
- **Date**: 3/17/2025, 6:00:00 PM
- **Chat**: Chat Name

## Message

Message text content here
```

Different message types (photos, documents, etc.) are formatted appropriately with available metadata.

## Security Note

Your bot token gives access to your Telegram bot, so keep it secure. The plugin stores it in your Obsidian configuration.

## Troubleshooting

- If messages aren't being received, check that your bot token is correct
- Ensure the "Telegram" folder (or your custom folder) exists in your vault
- Check the console for any error messages
- Error handling is implemented for message processing and bot operations. If you encounter issues, refer to the console logs for detailed error messages.

## License

MIT
