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

      if (!MessageStore || !Dispatcher) {
        console.error('[DeletedMessageLogger] Failed to find required modules');
        return;
      }

      Patcher.before(Dispatcher, '_dispatch', (self, args) => {
        try {
          const [event] = args;
          if (!event) return;

          // Handle message deletion
          if (event.type === 'MESSAGE_DELETE') {
            const { id, channelId } = event;
            if (!id || !channelId) return;

            const message = MessageStore.getMessage(channelId, id);

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

              sendReply(channelId, `🗑️ **Message Deleted**\n**Author:** ${message.author?.username || 'Unknown'}\n**Content:** ${message.content || '*[No text content]*'}`);
            }
          }

          // Handle message edits
          if (event.type === 'MESSAGE_UPDATE') {
            const { id, channelId, message: newMessage } = event;
            if (!id || !channelId || !newMessage) return;

            const oldMessage = MessageStore.getMessage(channelId, id);

            if (oldMessage && oldMessage.content && newMessage.content && oldMessage.content !== newMessage.content) {
              sendReply(channelId, `✏️ **Message Edited**\n**Author:** ${oldMessage.author?.username || 'Unknown'}\n**Before:** ${oldMessage.content}\n**After:** ${newMessage.content}`);
            }
          }
        } catch (err) {
          console.error('[DeletedMessageLogger] Error in dispatch handler:', err);
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
