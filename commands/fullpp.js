const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');

async function fullppCommand(sock, from, msg, isAdmin) {
    if (!isAdmin) return await sock.sendMessage(from, { text: "❌ Only owner can use this command." }, { quoted: msg });

    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    const type = quoted ? Object.keys(quoted)[0] : Object.keys(msg.message)[0];
    
    let imageMessage;
    if (quoted) {
        imageMessage = quoted.imageMessage || quoted[type]?.message?.imageMessage;
    } else {
        imageMessage = msg.message.imageMessage;
    }

    if (!imageMessage) return await sock.sendMessage(from, { text: "❌ Please reply to an image with .fullpp or .fulldp" }, { quoted: msg });

    try {
        await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });
        
        const stream = await downloadContentFromMessage(imageMessage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        // Processing image for full DP
        // To make it "full" without cropping, we can add padding to make it square
        const image = sharp(buffer);
        const metadata = await image.metadata();
        
        const size = Math.max(metadata.width, metadata.height);
        
        // Create a square image by adding padding (blur or solid color)
        // This allows the full image to be visible in the DP circle
        const processedBuffer = await image
            .extend({
                top: Math.floor((size - metadata.height) / 2),
                bottom: Math.ceil((size - metadata.height) / 2),
                left: Math.floor((size - metadata.width) / 2),
                right: Math.ceil((size - metadata.width) / 2),
                background: { r: 0, g: 0, b: 0, alpha: 1 } // Black background for padding
            })
            .resize(720, 720)
            .toBuffer();

        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        
        // Use the specialized logic for full DP if available in the library or just standard update
        // Most Baileys versions work best with high-res square images for "full" look
        await sock.updateProfilePicture(botNumber, processedBuffer);
        
        await sock.sendMessage(from, { text: "✅ Full profile picture updated successfully!" }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
    } catch (e) {
        console.error('Full DP Error:', e);
        await sock.sendMessage(from, { text: "❌ Failed to update full profile picture: " + e.message }, { quoted: msg });
    }
}

module.exports = fullppCommand;
