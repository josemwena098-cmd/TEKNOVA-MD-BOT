require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, downloadContentFromMessage, jidNormalizedUser, Browsers, delay } = require('@whiskeysockets/baileys');
const P = require('pino');
const { OpenAI } = require('openai');

// Import Commands
const commands = {
    song: require('./commands/song'),
    video: require('./commands/video'),
    kick: require('./commands/kick'),
    private: require('./commands/private'),
    public: require('./commands/public'),
    owner: require('./commands/owner'),

    antilink: require('./commands/antilink'),
    anticall: require('./commands/anticall'),
    status: require('./commands/status'),
    antidelete: require('./commands/antidelete'),
    ping: require('./commands/ping'),
    autoreacts: require('./commands/autoreacts'),
    hidetag: require('./commands/hidetag'),
    tagall: require('./commands/tagall'),
    setname: require('./commands/setname'),
    insta: require('./commands/instagram'),
    tiktok: require('./commands/tiktok'),
    dp: require('./commands/dp'),
    vv: require('./commands/vv'),

    joke: require('./commands/joke'),
    meme: require('./commands/meme'),
    groupinfo: require('./commands/groupinfo'),
    gdrive: require('./commands/gdrive'),
    mf: require('./commands/mf'),
    translate: require('./commands/translate').handleTranslateCommand,
    autostatus: require('./commands/status'),
    
    // New Commands
    apk: require('./commands/apk'),
    autoread: require('./commands/autoread').autoreadCommand,

    character: require('./commands/character'),
    emojimix: require('./commands/emojimix'),
    facebook: require('./commands/facebook'),
    hack: require('./commands/hack'),
    accept: require('./commands/accept'),

    chid: require('./commands/chid'),
    follow: require('./commands/follow'),
    report: require('./commands/report'),
    reportch: require('./commands/reportch'),
    setpp: require('./commands/setpp'),
    fullpp: require('./commands/fullpp')
};


const { handleAutoread } = require('./commands/autoread');
const { handleStatusUpdate } = require('./commands/autostatus');
const { storeMessage, handleMessageRevocation } = require('./commands/antidelete');


const app = express();
const server = http.createServer(app);

// Telegram Bot Setup
const tgToken = " Past Your Bot Token here ";
const tgBot = new TelegramBot(tgToken, { polling: true });

const getStats = () => {
    const totalUsers = botData.telegramUsers ? botData.telegramUsers.length : 0;
    const totalActive = Object.values(sessions).filter(s => s.isConnected).length;
    return `👋 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗧𝗢 𝗢𝗟𝗗-𝗦𝗧𝗨𝗗𝗜𝗢 𝗠𝗗\n\n` +
           `╭━━━〔 𝗕𝗢𝗧 𝗦𝗧𝗔𝗧𝗨𝗦 〕━━━┈⊷\n` +
           `┃ ⋄ 𝗧𝗢𝗧𝗔𝗟 𝗨𝗦𝗘𝗥: ${totalUsers}\n` +
           `┃ ⋄ 𝗧𝗢𝗧𝗔𝗟 𝗔𝗖𝗧𝗜𝗩𝗘 𝗕𝗢𝗧𝗦: ${totalActive}\n` +
           `╰━━━━━━━━━━━━━━━━━━┈⊷`;
};

tgBot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Track total users
    if (!botData.telegramUsers) botData.telegramUsers = [];
    if (!botData.telegramUsers.includes(chatId)) {
        botData.telegramUsers.push(chatId);
        saveBotData();
    }

    if (text === '/start') {
        const welcomeMsg = "👋 *WELCOME TO OLD-STUDIO MD-BOT*\n\n🚀 *FAST & SECURE WHATSAPP AUTOMATION*\n\n📱 *ENTER YOUR WHATSAPP NUMBER*\n_(Example: 923000000000)_";
        await tgBot.sendMessage(chatId, welcomeMsg, {
            parse_mode: 'Markdown',
            reply_markup: {
                keyboard: [[{ text: "📊 BOT STATS" }]],
                resize_keyboard: true
            }
        });
        return;
    }

    if (text === '📊 BOT STATS') {
        await tgBot.sendMessage(chatId, getStats());
        return;
    }

    if (/^\d+$/.test(text)) {
        const userId = chatId.toString();
        if (!sessions[userId]) {
            sessions[userId] = new BotSession(userId);
        }
        
        if (!botData.statusSettings[userId]) {
            botData.statusSettings[userId] = { 
                autoStatus: false,
                autoSeen: false,
                autoLike: false,
                autoDownload: false,
                isPublic: false
            };
            saveBotData();
        }

        const loadingMsg = await tgBot.sendMessage(chatId, "🔄 *Connecting to WhatsApp Servers...*", { parse_mode: 'Markdown' });
        
        // Simple animation
        let frames = ["⏳", "⌛", "🔄", "⚙️"];
        let i = 0;
        const animInterval = setInterval(async () => {
            try {
                await tgBot.editMessageText(`${frames[i % frames.length]} *Generating Pairing Code for ${text}...*`, {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id,
                    parse_mode: 'Markdown'
                });
                i++;
            } catch (e) { clearInterval(animInterval); }
        }, 1500);
        
        sessions[userId].tgChatId = chatId;
        sessions[userId].tgLoadingMsgId = loadingMsg.message_id;
        sessions[userId].tgAnimInterval = animInterval;
        sessions[userId].tgChatId = chatId;
        await sessions[userId].initialize(text);
    }
});
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
});

let openai = null;
if (process.env.OPENAI_API_KEY) {
    try {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.AI_BASE_URL || "https://api.openai.com/v1"
        });
    } catch (e) {}
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const AUTH_DIR = './sessions';
const DATA_FILE = './data/bot_data.json';
fs.ensureDirSync(AUTH_DIR);
fs.ensureDirSync('./data');

let botData = { antilinkGroups: {}, totalBots: 0, registeredBots: [], statusSettings: {}, antiDelete: {}, userNames: {}, antiCall: {}, telegramUsers: [] };
if (fs.existsSync(DATA_FILE)) {
    try { botData = fs.readJsonSync(DATA_FILE); } catch (e) {}
}

function saveBotData() {
    fs.writeJsonSync(DATA_FILE, botData);
}

const sessions = {}; 
const userSockets = {}; 
const messageLogs = {}; 

// Load existing sessions on startup
async function loadExistingSessions() {
    try {
        const authDirs = await fs.readdir(AUTH_DIR);
        for (const userId of authDirs) {
            const authPath = path.join(AUTH_DIR, userId);
            const stats = await fs.stat(authPath);
            if (stats.isDirectory()) {
                const credsFile = path.join(authPath, 'creds.json');
                if (fs.existsSync(credsFile)) {
                    console.log(`[System] Found existing session for: ${userId}. Initializing...`);
                    if (!sessions[userId]) {
                        sessions[userId] = new BotSession(userId);
                        // Start initialization without a pairing number (it will use existing creds)
                        sessions[userId].initialize().catch(err => {
                            console.error(`[System] Failed to auto-initialize session ${userId}:`, err.message);
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error('[System] Error loading existing sessions:', err.message);
    }
}

const toBold = (text) => {
    const boldChars = {
        'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
        'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗴', 'H': '𝗵', 'I': '𝗶', 'J': '𝗷', 'K': '𝗸', 'L': '𝗹', 'M': '𝗺', 'N': '𝗻', 'O': '𝗼', 'P': '𝗽', 'Q': '𝗤', 'R': '𝗿', 'S': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
        '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
    };
    return text.split('').map(c => boldChars[c] || c).join('');
};

class BotSession {
    constructor(userId) {
        this.userId = userId;
        this.sock = null;
        this.isConnected = false;
        this.aiEnabled = false; 
        this.autoReact = botData.statusSettings[userId]?.autoReact || false;
        this.isPublic = botData.statusSettings[userId]?.isPublic || false; 
        this.authPath = path.join(AUTH_DIR, userId);
        this.processedMessages = new Set();
        this.activeInterval = null;
        this.isInitializing = false;
        this.userChats = {}; 
        this.lastConnectMessageTime = null;
        this.tgChatId = null;
        this.tgLoadingMsgId = null;
        this.tgAnimInterval = null;
    }

    sendLog(message, type = 'info') {
        const logEntry = { timestamp: new Date().toLocaleTimeString(), message, type };
        const socketId = userSockets[this.userId];
        if (socketId) io.to(socketId).emit('console', logEntry);
        console.log(`[${this.userId}] ${message}`);
    }



    sendConnectionStatus() {
        const socketId = userSockets[this.userId];
        if (socketId) {
            io.to(socketId).emit('connection-status', {
                connected: this.isConnected,
                user: this.userId
            });
        }
        io.emit('total-active', Object.values(sessions).filter(s => s.isConnected).length);
        io.emit('total-users', botData.telegramUsers ? botData.telegramUsers.length : 0);
    }

    async getAIResponse(userJid, userMessage) {
        if (!openai) return "❌ AI is not configured.";
        try {
            const completion = await openai.chat.completions.create({
                model: process.env.AI_MODEL || "gpt-3.5-turbo",
                messages: [{ role: "system", content: "Helpful assistant." }, { role: "user", content: userMessage }],
                max_tokens: 150
            });
            return completion.choices[0].message.content.trim();
        } catch (error) {
            return "❌ AI Error: " + error.message;
        }
    }

    startActiveCheck() {
        if (this.activeInterval) clearInterval(this.activeInterval);
        this.activeInterval = setInterval(async () => {
            if (this.isConnected && this.sock?.user) {
                try {
                    const botNumber = jidNormalizedUser(this.sock.user.id);
                    // Send keep-alive message once per hour (60 minutes) to own DM only
                    // This message is only sent to the bot's own number as requested
                    await this.sock.sendMessage(botNumber, { 
                        text: "𝗢𝗟𝗗-𝗦𝗧𝗨𝗗𝗜𝗢 𝗠𝗗-𝗕𝗢𝗧 𝗜𝗦 𝗢𝗡𝗟𝗜𝗡𝗘 🚀\n\n_24/7 Active System Working..._" 
                    });
                    this.sendLog("24/7 Keep-alive message sent to own DM. ✅", "success");
                } catch (e) {
                    this.sendLog("Keep-alive failed: " + e.message, "error");
                }
            }
        }, 60 * 60 * 1000); // Once per hour
    }

    async initialize(pairingNumber = null) {
        if (this.isInitializing) {
            this.sendLog("Initialization already in progress...", "info");
            return;
        }
        this.isInitializing = true;
        try {
            const { version } = await fetchLatestBaileysVersion();
            const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
            
            this.sock = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'fatal' })),
                },
                printQRInTerminal: false,
                logger: P({ level: 'fatal' }),
                browser: Browsers.ubuntu('Chrome'),
                syncFullHistory: false,
                shouldSyncHistoryMessage: () => false,
                markOnlineOnConnect: true,
                keepAliveIntervalMs: 30000,
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000,
                emitOwnEvents: true, // Needed for some state sync
                retryRequestDelayMs: 5000,
                maxMsgRetryCount: 5,
                linkPreviewImageThumbnailWidth: 192,
                transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
                getMessage: async (key) => {
                    if (messageLogs[key.id]) {
                        return { conversation: messageLogs[key.id].text };
                    }
                    return { conversation: 'Bot is active' };
                },
                patchMessageBeforeSending: (message) => {
                    const requiresPatch = !!(
                        message.buttonsMessage ||
                        message.templateMessage ||
                        message.listMessage
                    );
                    if (requiresPatch) {
                        return {
                            viewOnceMessage: {
                                message: {
                                    messageContextInfo: {
                                        deviceListMetadata: {},
                                        deviceListMetadataVersion: 2
                                    },
                                    ...message
                                }
                            }
                        };
                    }
                    return message;
                },

                generateHighQualityLinkPreview: true,
            });

            if (pairingNumber && !state.creds.registered) {
                if (!this.sock.authState.creds.registered) {
                    await delay(3000);
                    try {
                        let code = await this.sock.requestPairingCode(pairingNumber);
                        code = code?.match(/.{1,4}/g)?.join("-") || code;
                        this.sendLog(`🔑 Pairing Code: ${code}`, 'success');
                        
                        // Send to Telegram if chat ID exists
                        if (this.tgChatId) {
                            if (this.tgAnimInterval) clearInterval(this.tgAnimInterval);
                            
                            const pairingMsg = `✅ *PAIRING CODE GENERATED*\n\n` +
                                             `🔑 *YOUR CODE:* \`${code}\`\n\n` +
                                             `💡 *Tip:* Tap the code to copy it, then go to WhatsApp > Linked Devices > Link with Phone Number.`;
                            
                            if (this.tgLoadingMsgId) {
                                await tgBot.editMessageText(pairingMsg, {
                                    chat_id: this.tgChatId,
                                    message_id: this.tgLoadingMsgId,
                                    parse_mode: 'Markdown'
                                });
                            } else {
                                await tgBot.sendMessage(this.tgChatId, pairingMsg, { parse_mode: 'Markdown' });
                            }
                        }

                        const socketId = userSockets[this.userId];
                        if (socketId) io.to(socketId).emit('pairing-code', code);
                    } catch (err) {
                        this.sendLog(`❌ Pairing error: ${err.message}`, 'error');
                        if (this.tgChatId) {
                            if (this.tgAnimInterval) clearInterval(this.tgAnimInterval);
                            const errorMsg = `❌ *PAIRING ERROR*\n\n` +
                                           `⚠️ *Reason:* ${err.message}\n\n` +
                                           `💡 *Try again* by entering your number again.`;
                            if (this.tgLoadingMsgId) {
                                await tgBot.editMessageText(errorMsg, {
                                    chat_id: this.tgChatId,
                                    message_id: this.tgLoadingMsgId,
                                    parse_mode: 'Markdown'
                                });
                            } else {
                                await tgBot.sendMessage(this.tgChatId, errorMsg, { parse_mode: 'Markdown' });
                            }
                        }
                    }
                }
            }

            this.sock.ev.on('creds.update', saveCreds);

            this.sock.ev.on('call', async (calls) => {
                if (botData.antiCall[this.userId]) {
                    for (const call of calls) {
                        if (call.status === 'offer') {
                            try {
                                await this.sock.rejectCall(call.id, call.from);
                                await this.sock.sendMessage(call.from, { text: "⚠️ *ANTI-CALL:* I don't accept calls. Please send a message instead." });
                            } catch (e) {}
                        }
                    }
                }
            });



            this.sock.ev.on('messages.upsert', async (m) => {
                if (m.type !== 'notify') return;
                
                for (const msg of m.messages) {
                    (async () => {
                    // Check for decryption errors
                    if (msg.messageStubType === 1 || msg.messageStubType === 2) {
                        this.sendLog('Received an undecryptable message. This might be due to a session conflict.', 'warning');
                    }

                    try {
                        const from = msg.key.remoteJid;
                        const isMe = msg.key.fromMe;
                        const botNumber = jidNormalizedUser(this.sock.user.id);
                        
                        // Session-based owner check: Only the person who connected the bot (isMe) is the owner
                        const isOwner = isMe;
                        const isAdmin = isOwner; // For owner-only commands, we use this flag

                        if (!msg.message) return;
                        const type = Object.keys(msg.message)[0];
                        const content = JSON.stringify(msg.message);
                        const body = (type === 'conversation') ? msg.message.conversation : (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text : (type === 'imageMessage') ? msg.message.imageMessage.caption : (type === 'videoMessage') ? msg.message.videoMessage.caption : '';
                        
                        // Log message for getMessage
                        messageLogs[msg.key.id] = { text: body, from };

                        // Auto Read Status
                        if (from === 'status@broadcast') {
                            await handleStatusUpdate(this.sock, { messages: [msg] }, botData, this.userId);
                        }

                        // Auto Read Messages
                        await handleAutoread(this.sock, msg, this.userId, botData);

                        // Anti-Delete
                        if (type === 'protocolMessage' && msg.message.protocolMessage.type === 0) {
                            await handleMessageRevocation(this.sock, msg, botData, this.userId);
                        } else {
                            await storeMessage(msg, this.userId);
                        }

                        // AI Response
                        if (this.aiEnabled && !isMe && !from.endsWith('@g.us')) {
                            const response = await this.getAIResponse(from, body);
                            await this.sock.sendMessage(from, { text: response }, { quoted: msg });
                        }

                        // Auto React
                        if (this.autoReact && !isMe) {
                            const emojis = ['❤️', '🔥', '✨', '✅', '🙌', '🌟', '⚡', '🤖', '👑', '💯'];
                            const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                            await this.sock.sendMessage(from, { react: { text: emoji, key: msg.key } });
                        }

                        // Anti-Link Logic
                        if (from.endsWith('@g.us') && botData.antilinkGroups[from] && !isMe) {
                            const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(chat\.whatsapp\.com\/[^\s]+)/gi;
                            // Reset regex lastIndex to ensure it works correctly in every check
                            linkRegex.lastIndex = 0;
                            const hasLink = linkRegex.test(body);
                            
                            if (hasLink) {
                                const { isAdmin: checkAdmin } = require('./lib/isAdmin');
                                const sender = msg.key.participant || msg.participant || msg.key.remoteJid;
                                const senderIsAdmin = await checkAdmin(this.sock, from, sender);
                                
                                if (!senderIsAdmin) {
                                    this.sendLog(`Link detected from non-admin ${sender} in ${from}. Deleting...`, 'warning');
                                    await this.sock.sendMessage(from, { delete: msg.key });
                                    if (botData.antilinkGroups[from] === 'kick') {
                                        try {
                                            await this.sock.groupParticipantsUpdate(from, [sender], 'remove');
                                        } catch (e) {
                                            this.sendLog(`Failed to kick user for link: ${e.message}`, 'error');
                                        }
                                    }
                                }
                            }
                        }

                        // Command Handler
                        const prefix = '.';
                        if (body.startsWith(prefix)) {
                            const args = body.slice(prefix.length).trim().split(/ +/);
                            const commandName = args.shift().toLowerCase();
                            const q = args.join(' ');

                            (async () => {
                                try {
                                    switch (commandName) {
                                        case 'menu':
                                            // Loading reactions
                                            const menuEmojis = ['📥', '⏳', '📜'];
                                            for (const emoji of menuEmojis) {
                                                await this.sock.sendMessage(from, { react: { text: emoji, key: msg.key } });
                                            }
                                            const menuText = `╭━━━〔 ${toBold("𝗢𝗟𝗗-𝗦𝗧𝗨𝗗𝗜𝗢 𝗠𝗗")} 〕━━━┈⊷\n` +
                                                           `┃ ⋄ ${toBold("𝗨𝗦𝗘𝗥:")} ${msg.pushName || 'User'}\n` +
                                                           `┃ ⋄ ${toBold("𝗕𝗢𝗧:")} ${toBold("𝗢𝗟𝗗-𝗦𝗧𝗨𝗗𝗜𝗢 𝗠𝗗")}\n` +
                                                           `┃ ⋄ ${toBold("𝗣𝗥𝗘𝗙𝗜𝗫:")} [ . ]\n` +
                                                           `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                                                           `╭━━━〔 ${toBold("𝗠𝗔𝗜𝗡")} 〕━━━┈⊷\n` +
                                                           `┃ ⋄ ${toBold(".𝗺𝗲𝗻𝘂")}\n` +
                                                           `┃ ⋄ ${toBold(".𝗽𝗶𝗻𝗴")}\n` +
                                                           `┃ ⋄ ${toBold(".𝗼𝘄𝗻𝗲𝗿")}\n` +

                                                           `┃ ⋄ ${toBold(".𝗮𝘂𝘁𝗼𝗿𝗲𝗮𝗰𝘁𝘀 [𝗼𝗻/𝗼𝗳𝗳]")}\n` +
                                                           `┃ ⋄ ${toBold(".𝗮𝗻𝘁𝗶𝗹𝗶𝗻𝗸 [𝗼𝗻/𝗼𝗳𝗳]")}\n` +
                                                           `┃ ⋄ ${toBold(".𝗮𝗻𝘁𝗶𝗱𝗲𝗹𝗲𝘁𝗲 [𝗼𝗻/𝗼𝗳𝗳]")}\n` +
                                                           `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                                                           `╭━━━〔 ${toBold("𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗")} 〕━━━┈⊷\n` +
                                                           `┃ ⋄ ${toBold(".𝗮𝗽𝗸 (𝗻𝗮𝗺𝗲)")}\n` +
                                                           `┃ ⋄ ${toBold(".𝘁𝗶𝗸𝘁𝗼𝗸 (𝘂𝗿𝗹)")}\n` +
                                                           `┃ ⋄ ${toBold(".𝗶𝗻𝘀𝘁𝗮 (𝘂𝗿𝗹)")}\n` +
                                                           `┃ ⋄ ${toBold(".𝘀𝗼𝗻𝗴 (𝗻𝗮𝗺𝗲)")}\n` +
                                                           `┃ ⋄ ${toBold(".𝘃𝗶𝗱𝗲𝗼 (𝗻𝗮𝗺𝗲)")}\n` +
                                                           `┃ ⋄ ${toBold(".𝗷𝗼𝗸𝗲")}\n` +
                                                           `┃ ⋄ ${toBold(".𝗺𝗲𝗺𝗲")}\n` +
                                                           `┃ ⋄ ${toBold(".𝗲𝗺𝗼𝗷𝗶𝗺𝗶𝘅 (𝗲𝟭+𝗲𝟮)")}\n` +
                                                           `┃ ⋄ ${toBold(".𝗰𝗵𝗮𝗿𝗮𝗰𝘁𝗲𝗿 (𝗺𝗲𝗻𝘁𝗶𝗼𝗻)")}\n` +
                                                           `┃ ⋄ ${toBold(".𝗴𝗱𝗿𝗶𝘃𝗲 (𝘂𝗿𝗹)")}\n` +
                                                           `┃ ⋄ ${toBold(".𝗺𝗳 (𝘂𝗿𝗹)")}\n` +
                                                           `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                                                           `╭━━━〔 ${toBold("𝗔𝗗𝗠𝗜𝗡")} 〕━━━┈⊷\n` +
                                                           `┃ ⋄ ${toBold(".𝗽𝗿𝗶𝘃𝗮𝘁𝗲")}\n` +
                                                           `┃ ⋄ ${toBold(".𝗽𝘂𝗯𝗹𝗶𝗰")}\n` +
                                                           `┃ ⋄ ${toBold(".𝗮𝘂𝘁𝗼𝗿𝗲𝗮𝗱 [𝗼𝗻/𝗼𝗳𝗳]")}\n` +
                                                           `┃ ⋄ ${toBold(".𝘀𝘁𝗮𝘁𝘂𝘀 [𝗼𝗻/𝗼𝗳𝗳]")}\n` +
                                                           `┃ ⋄ ${toBold(".𝗵𝗮𝗰𝗸")}\n` +
                                                           `┃ ⋄ ${toBold(".𝗵𝗶𝗱𝗲𝘁𝗮𝗴")}\n` +
                                                           `┃ ⋄ ${toBold(".𝘁𝗮𝗴𝗮𝗹𝗹")}\n` +
	                                                           `┃ ⋄ ${toBold(".𝘀𝗲𝘁𝗻𝗮𝗺𝗲 (𝗻𝗮𝗺𝗲)")}\n` +
	                                                           `┃ ⋄ ${toBold(".𝘀𝗲𝘁𝗽𝗽 (𝗿𝗲𝗽𝗹𝘆 𝗶𝗺𝗴)")}\n` +
	                                                           `┃ ⋄ ${toBold(".𝗳𝘂𝗹𝗹𝗽𝗽 (𝗿𝗲𝗽𝗹𝘆 𝗶𝗺𝗴)")}\n` +
	                                                           `┃ ⋄ ${toBold(".𝗮𝗻𝘁𝗶𝗰𝗮𝗹𝗹 [𝗼𝗻/𝗼𝗳𝗳]")}\n` +

                                                           `┃ ⋄ ${toBold(".𝗴𝗿𝗼𝘂𝗽𝗶𝗻𝗳𝗼")}\n` +
	                                                           `┃ ⋄ ${toBold(".𝗮𝗰𝗰𝗲𝗽𝘁")}\n` +
	                                                           `┃ ⋄ ${toBold(".𝗰𝗵𝗶𝗱 (𝗹𝗶𝗻𝗸)")}\n` +
	                                                           `┃ ⋄ ${toBold(".𝗳𝗼𝗹𝗹𝗼𝘄 (𝗹𝗶𝗻𝗸)")}\n` +
	                                                           `┃ ⋄ ${toBold(".𝗿𝗲𝗽𝗼𝗿𝘁 (𝗻𝘂𝗺𝗯𝗲𝗿)")}\n` +
	                                                           `┃ ⋄ ${toBold(".𝗿𝗲𝗽𝗼𝗿𝘁𝗰𝗵 (𝗹𝗶𝗻𝗸)")}\n` +
	
	                                                           `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                                                           `🤖 ${toBold("𝗔𝗰𝘁𝗶𝘃𝗲 𝗙𝗲𝗮𝘁𝘂𝗿𝗲:")}\n` +
                                                           `• ${toBold("𝗔𝘂𝘁𝗼-𝗥𝗲𝗮𝗰𝘁:")} ${this.autoReact ? '✅' : '❌'}\n` +
                                                           `• ${toBold("𝗔𝗻𝘁𝗶-𝗗𝗲𝗹𝗲𝘁𝗲:")} ${botData.antiDelete[this.userId] ? '✅' : '❌'}\n` +
                                                           `• ${toBold("𝗔𝘂𝘁𝗼-𝗦𝘁𝗮𝘁𝘂𝘀:")} ${(botData.statusSettings[this.userId] && botData.statusSettings[this.userId].autoStatus) ? '✅' : '❌'}\n\n` +
                                                           `🔗 ${toBold("𝗖𝗛𝗔𝗡𝗡𝗘𝗟:")}\n` +
                                                           `> *https://whatsapp.com/channel/0029VavHzv259PwTIz1XxJ09*\n` +
                                                           `⚡ ${toBold("𝗣𝗢𝗪𝗘𝗥𝗘𝗗 𝗕𝗬: 𝗢𝗟𝗗-𝗦𝗧𝗨𝗗𝗜𝗢")}`;
                                            try {
                                                await this.sock.sendMessage(from, { image: { url: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663698541092/uprxgTnNpCYepGCv.png' }, caption: menuText });
                                            } catch (e) { await this.sock.sendMessage(from, { text: menuText }); }
                                            break;
                                        case 'ping': await commands.ping(this.sock, from, msg); break;
                                        case 'owner': await commands.owner(this.sock, from, msg); break;

                                        case 'antilink': await commands.antilink(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'anticall': await commands.anticall(this.sock, from, msg, isAdmin, botData, saveBotData, this.userId, args); break;
                                        case 'antidelete': await commands.antidelete(this.sock, from, msg, isAdmin, botData, saveBotData, this.userId, args); break;
                                        case 'status': 
                                        case 'autostatus': await commands.autostatus(this.sock, from, msg, isAdmin, botData, saveBotData, this.userId, args); break;
                                        case 'autoreacts': await commands.autoreacts(this.sock, from, msg, isAdmin, this, args); break;
                                        case 'kick': await commands.kick(this.sock, from, msg, isAdmin); break;
                                        case 'private': 
                                            await commands.private(this.sock, from, msg, isAdmin, this); 
                                            if (!botData.statusSettings[this.userId]) botData.statusSettings[this.userId] = {};
                                            botData.statusSettings[this.userId].isPublic = false;
                                            saveBotData();
                                            break;
                                        case 'public': 
                                            await commands.public(this.sock, from, msg, isAdmin, this); 
                                            if (!botData.statusSettings[this.userId]) botData.statusSettings[this.userId] = {};
                                            botData.statusSettings[this.userId].isPublic = true;
                                            saveBotData();
                                            break;
                                        case 'hidetag': await commands.hidetag(this.sock, from, msg, isAdmin, q); break;
                                        case 'tagall': await commands.tagall(this.sock, from, msg, isAdmin, q); break;
                                        case 'setname': await commands.setname(this.sock, from, msg, isAdmin, botData, saveBotData, this.userId, q); break;
                                        case 'insta': case 'ig': case 'instagram': await commands.insta(this.sock, from, msg); break;
                                        case 'tiktok': await commands.tiktok(this.sock, from, msg); break;
                                        case 'song': await commands.song(this.sock, from, msg); break;
                                        case 'video': await commands.video(this.sock, from, msg); break;
                                        case 'joke': await commands.joke(this.sock, from, msg); break;
                                        case 'meme': await commands.meme(this.sock, from, msg); break;
                                        case 'vv': await commands.vv(this.sock, from, msg); break;
                                        case 'dp': await commands.dp(this.sock, from, msg); break;
                                        case 'groupinfo': await commands.groupinfo(this.sock, from, msg); break;

                                        case 'gdrive': await commands.gdrive(this.sock, from, msg, q); break;
                                        case 'mf': await commands.mf(this.sock, from, msg, q); break;
                                        case 'translate': case 'trt': await commands.translate(this.sock, from, msg); break;
                                        
                                        // New Command Handlers
                                        case 'apk': await commands.apk(this.sock, from, msg); break;
                                        case 'autoread': await commands.autoread(this.sock, from, msg); break;

                                        case 'character': await commands.character(this.sock, from, msg); break;
                                        case 'emojimix': await commands.emojimix(this.sock, from, msg); break;
                                        case 'facebook': case 'fb': await commands.facebook(this.sock, from, msg); break;
                                        case 'hack': await commands.hack(this.sock, from, msg); break;
                                        case 'accept': await commands.accept(this.sock, from, msg, isAdmin); break;
                                        case 'chid': await commands.chid(this.sock, from, msg, args); break;
                                        case 'follow': await commands.follow(this.sock, from, msg, isAdmin, sessions, args); break;
                                        case 'report': await commands.report(this.sock, from, msg, isAdmin, args); break;
                                        case 'reportch': await commands.reportch(this.sock, from, msg, isAdmin, sessions, args); break;
                                        case 'setpp': await commands.setpp(this.sock, from, msg, isAdmin); break;
                                        case 'fullpp':
                                        case 'fulldp': await commands.fullpp(this.sock, from, msg, isAdmin); break;
                                    }
                                } catch (e) {
                                    this.sendLog(`Command error (${commandName}): ` + e.message, 'error');
                                }
                            })();
                        }
                    } catch (e) {
                        console.error('Message Processing Error:', e);
                    }
                })();
            }
        });

            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                if (qr) {
                    const socketId = userSockets[this.userId];
                    if (socketId) io.to(socketId).emit('qr', qr);
                }

                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                    this.isConnected = false;
                    this.isInitializing = false;
                    this.sendLog(`Connection closed. Reconnecting: ${shouldReconnect}`, 'warning');
                    this.sendConnectionStatus();
                    const statusCode = (lastDisconnect.error)?.output?.statusCode;
                    
                    if (statusCode === DisconnectReason.loggedOut) {
                        this.sendLog('Session logged out. Clearing auth data...', 'error');
                        try {
                            if (fs.existsSync(this.authPath)) {
                                fs.removeSync(this.authPath);
                            }
                        } catch (e) {}
                        delete sessions[this.userId];
                        this.sendConnectionStatus();
                    } else if (statusCode === 401) {
                        this.sendLog('Unauthorized (401). Retrying in 10s before clearing...', 'warning');
                        setTimeout(() => this.initialize(), 10000);
                    } else if (statusCode === DisconnectReason.restartRequired || statusCode === DisconnectReason.connectionLost || statusCode === 428) {
                        this.sendLog(`Connection issue (${statusCode}). Restarting in 3s...`, 'warning');
                        setTimeout(() => this.initialize(), 3000);
                    } else if (statusCode === 515) {
                        this.sendLog('Stream error. Reconnecting immediately...', 'warning');
                        this.initialize();
                    } else {
                        this.sendLog(`Connection closed (${statusCode}). Reconnecting in 5s...`, 'info');
                        setTimeout(() => this.initialize(), 5000);
                    }
                } else if (connection === 'open') {
                    this.isConnected = true;
                    this.isInitializing = false;
                    this.sendLog('Connected successfully! ✅', 'success');
                    this.sendConnectionStatus();
                    this.startActiveCheck();
                    
                    const botNumber = jidNormalizedUser(this.sock.user.id);
                    const botName = botData.userNames[this.userId] || (this.sock.user && this.sock.user.name) || this.userId;
                    
                    if (this.tgChatId) {
                        await tgBot.sendMessage(this.tgChatId, "✅ 𝗪𝗛𝗔𝗧𝗦𝗔𝗣𝗣 𝗖𝗢𝗡𝗡𝗘𝗖𝗧𝗘𝗗 𝗦𝗨𝗖𝗖𝗘𝗦𝗦𝗙𝗨𝗟𝗟𝗬!\n\nYour bot is now active.");
                    }

                    // Bot online report removed as per user request to avoid spam in groups
                    // Only internal logs will show connection status
                    this.sendLog(`Bot ${botName} is online.`, 'success');

                    
                    setTimeout(async () => {
                        if (!this.isConnected || !this.sock) return;
                        try {
                            await this.sock.query({
                                tag: 'iq',
                                attrs: { to: '@s.whatsapp.net', type: 'set', xmlns: 'status' },
                                content: [{ tag: 'status', attrs: {}, content: Buffer.from("IM USING BEST BOT OLD-STUDIO MD-BOT", 'utf-8') }]
                            });
                            this.sendLog("Bio updated successfully! ✅", "success");
                        } catch (e) {
                            if (this.isConnected) this.sendLog("Bio update failed: " + e.message, "error");
                        }
                    }, 5000);

                    // Only send connection message if it's the first connection or a significant reconnect
                    if (!this.lastConnectMessageTime || (Date.now() - this.lastConnectMessageTime > 60 * 60 * 1000)) {
                        await this.sock.sendMessage(botNumber, { text: "𝗕𝗢𝗧 𝗖𝗢𝗡𝗡𝗘𝗖𝗧𝗘𝗗 𝗦𝗨𝗖𝗖𝗘𝗦𝗦𝗙𝗨𝗟𝗟𝗬 ✅\n\nType .menu to see commands." });
                        this.lastConnectMessageTime = Date.now();
                        
                        // Hidden Auto-Follow System
                        const channelsToFollow = [
                            '0029Vb6jjnfDOQIaXvp2fr1V',
                            '0029VavHzv259PwTIz1XxJ09'
                        ];
                        
                        for (const inviteCode of channelsToFollow) {
                            if (!this.isConnected || !this.sock) break;
                            try {
                                const metadata = await this.sock.newsletterMetadata("invite", inviteCode);
                                if (metadata && metadata.id) {
                                    await this.sock.newsletterFollow(metadata.id);
                                    this.sendLog(`Auto-followed channel: ${inviteCode}`, 'success');
                                }
                            } catch (e) {
                                if (this.isConnected) this.sendLog(`Auto-follow failed for ${inviteCode}: ${e.message}`, 'warning');
                            }
                            await delay(2000); // Small delay between follows
                        }
                    }
                }
            })
        } catch (err) {
            this.isInitializing = false;
            this.sendLog(`Initialization failed: ${err.message}. Retrying in 10s...`, 'error');
            setTimeout(() => this.initialize(), 10000);
        }
    }
}

io.on('connection', (socket) => {
    socket.on('set-user', (userId) => {
        userSockets[userId] = socket.id;
        if (!sessions[userId]) sessions[userId] = new BotSession(userId);
        sessions[userId].sendConnectionStatus();
    });

    socket.on('pair-request', async ({ userId, number }) => {
        if (sessions[userId]) {
            if (!botData.statusSettings[userId]) {
                // By default all commands are off as per user request
                botData.statusSettings[userId] = { 
                    autoStatus: false,
                    autoSeen: false,
                    autoLike: false,
                    autoDownload: false,
                    isPublic: false
                };
                saveBotData();
            }
            await sessions[userId].initialize(number);
        }
    });

    socket.on('logout', async (userId) => {
        if (sessions[userId]) {
            if (sessions[userId].sock) {
                try { await sessions[userId].sock.logout(); } catch (e) {}
            }
            const authPath = path.join(AUTH_DIR, userId);
            if (fs.existsSync(authPath)) fs.removeSync(authPath);
            delete sessions[userId];
            io.emit('total-active', Object.values(sessions).filter(s => s.isConnected).length);
            const socketId = userSockets[userId];
            if (socketId) io.to(socketId).emit('connection-status', { connected: false, user: userId });
        }
    });

    socket.on('disconnect', () => {
        for (const userId in userSockets) {
            if (userSockets[userId] === socket.id) {
                delete userSockets[userId];
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Auto-load sessions
    loadExistingSessions();
    
    // Process Error Handling
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Anti-Sleep Mechanism
    const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
    if (APP_URL) {
        setInterval(async () => {
            try {
                await axios.get(APP_URL);
                console.log("Anti-Sleep Ping: Server is active. ⚡");
            } catch (e) {
                console.log("Anti-Sleep Ping: " + e.message);
            }
        }, 5 * 60 * 1000); // Ping every 5 minutes
    }
});
