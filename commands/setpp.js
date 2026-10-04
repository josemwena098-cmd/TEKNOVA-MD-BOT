const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function setppCommand(sock, from, msg, isAdmin) {
    if (!isAdmin) return await sock.sendMessage(from, { text: "❌ Only owner can use this command." }, { quoted: msg });

    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    const type = quoted ? Object.keys(quoted)[0] : Object.keys(msg.message)[0];
    const isImage = type === 'imageMessage' || (type === 'viewOnceMessageV2' && quoted?.[type]?.message?.imageMessage) || (type === 'viewOnceMessage' && quoted?.[type]?.message?.imageMessage);

    if (!isImage) return await sock.sendMessage(from, { text: "❌ Please reply to an image with .setpp" }, { quoted: msg });

    try {
        await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });
        
        const imageMessage = quoted ? (quoted.imageMessage || quoted[type]?.message?.imageMessage) : msg.message.imageMessage;
        const stream = await downloadContentFromMessage(imageMessage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        await sock.updateProfilePicture(botNumber, buffer);
        
        await sock.sendMessage(from, { text: "✅ Profile picture updated successfully!" }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
    } catch (e) {
        console.error(e);
        await sock.sendMessage(from, { text: "❌ Failed to update profile picture: " + e.message }, { quoted: msg });
    }
}

module.exports = setppCommand;
