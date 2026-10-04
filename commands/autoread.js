/**
 * Arslan Bot - A WhatsApp Bot
 * Autoread Command - Automatically read all messages
 */

const fs = require('fs');
const path = require('path');

// Path to store the configuration
const configPath = path.join(__dirname, '..', 'data', 'autoread.json');

// Initialize configuration file if it doesn't exist
function initConfig() {
    if (!fs.existsSync(configPath)) {
        if (!fs.existsSync(path.dirname(configPath))) {
            fs.mkdirSync(path.dirname(configPath), { recursive: true });
        }
        fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
    }
    return JSON.parse(fs.readFileSync(configPath));
}

// Toggle autoread feature
async function autoreadCommand(sock, chatId, message) {
    try {
        // Only the person who connected the bot (isMe) can use this
        if (!message.key.fromMe) {
            await sock.sendMessage(chatId, {
                text: '❌ This command is only available for the owner!',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363376877392804@newsletter',
                        newsletterName: '𝗧𝗘𝗔𝗠-𝗕𝗟𝗔𝗖𝗞-𝗛𝗔T',
                        serverMessageId: -1
                    }
                }
            });
            return;
        }

        // Get command arguments
        const messageContent = message.message?.ephemeralMessage?.message || message.message?.viewOnceMessage?.message || message.message?.viewOnceMessageV2?.message || message.message;
        const body = (messageContent?.conversation || messageContent?.extendedTextMessage?.text || messageContent?.imageMessage?.caption || messageContent?.videoMessage?.caption || '').trim();
        const args = body.split(' ').slice(1);
        
        // Initialize or read config
        const config = initConfig();
        
        // Toggle based on argument or toggle current state if no argument
        if (args.length > 0) {
            const action = args[0].toLowerCase();
            if (action === 'on' || action === 'enable') {
                config.enabled = true;
            } else if (action === 'off' || action === 'disable') {
                config.enabled = false;
            } else {
                await sock.sendMessage(chatId, {
                    text: '❌ Invalid option! Use: .autoread on/off',
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363376877392804@newsletter',
                            newsletterName: '𝗧𝗘𝗔𝗠-𝗕𝗟𝗔𝗖𝗞-𝗛𝗔T',
                            serverMessageId: -1
                        }
                    }
                });
                return;
            }
        } else {
            // Toggle current state
            config.enabled = !config.enabled;
        }
        
        // Save updated configuration
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        // Send confirmation message
        await sock.sendMessage(chatId, {
            text: `✅ Auto-read has been ${config.enabled ? 'enabled' : 'disabled'}!`,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363376877392804@newsletter',
                    newsletterName: '𝗧𝗘𝗔𝗠-𝗕𝗟𝗔𝗖𝗞-𝗛𝗔T',
                    serverMessageId: -1
                }
            }
        });
        
    } catch (error) {
        console.error('Error in autoread command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Error processing command!',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363376877392804@newsletter',
                    newsletterName: '𝗧𝗘𝗔𝗠-𝗕𝗟𝗔𝗖𝗞-𝗛𝗔T',
                    serverMessageId: -1
                }
            }
        });
    }
}

// Function to check if autoread is enabled
function isAutoreadEnabled() {
    try {
        const config = initConfig();
        return config.enabled;
    } catch (error) {
        console.error('Error checking autoread status:', error);
        return false;
    }
}

// Function to handle autoread functionality
async function handleAutoread(sock, message, userId, botData) {
    try {
        // Global autoread check (only if .autoread on was used)
        const isGlobalEnabled = isAutoreadEnabled();
        
        if (isGlobalEnabled) {
            // Mark as read normally
            await sock.readMessages([message.key]);
            return true;
        }
    } catch (e) {
        console.error('Autoread Error:', e.message);
    }
    return false;
}

module.exports = {
    autoreadCommand,
    isAutoreadEnabled,
    handleAutoread
};
