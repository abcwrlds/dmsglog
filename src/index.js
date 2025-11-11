import { registerPlugin } from 'enmity/managers/plugins';
import { create } from 'enmity/patcher';
import { getByProps } from 'enmity/metro';
import { sendReply } from 'enmity/api/clyde';

const Patcher = create('deleted-message-logger');
const deletedMessages = new Map();

const manifest = {
  name: "DeletedMessageLogger",
  version: "1.0.0",
  description: "Logs and displays deleted messages in Discord",
  authors: [
    {
      name: "YourName",
      id: "123456789012345678"
    }
  ],
  color: "#ff4444",
  icon: "https://i.imgur.com/example.png"
};

const DeletedMessageLogger = {
  ...manifest,

  onStart() {
    try {
      const MessageStore = getByProps('getMessage', 'getMessages');
      const Dispatcher = getByProps('_dispatch');

      Patcher.before(Dispatcher, '_dispatch', (self, args) => {
        const [event] = args;

        // Handle message deletion
        if (event.type === 'MESSAGE_DELETE') {
          const { id, channelId } = event;
          const message = MessageStore?.getMessage(channelId, id);

          if (message) {
            deletedMessages.set(id, {
              id: message.id,
              content: message.content,
              author: message.author,
              channelId: message.channel_id,
              timestamp: new Date().toISOString(),
              attachments: message.attachments || [],
              embeds: message.embeds || []
            });

            sendReply(channelId, `🗑️ **Message Deleted**
**Author:** ${message.author.username}
**Content:** ${message.content || '*[No text content]*'}`);
          }
        }

        // Handle message edits
        if (event.type === 'MESSAGE_UPDATE') {
          const { id, channelId } = event;
          const oldMessage = MessageStore?.getMessage(channelId, id);

          if (oldMessage && oldMessage.content !== event.message.content) {
            sendReply(channelId, `✏️ **Message Edited**
**Author:** ${oldMessage.author.username}
**Before:** ${oldMessage.content}
**After:** ${event.message.content}`);
          }
        }
      });
    } catch (error) {
      console.error('[DeletedMessageLogger] Error starting plugin:', error);
    }
  },

  onStop() {
    deletedMessages.clear();
    Patcher.unpatchAll();
  },

  getSettingsPanel() {
    return null;
  }
};

registerPlugin(DeletedMessageLogger);
