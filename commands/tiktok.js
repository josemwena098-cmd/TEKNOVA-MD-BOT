const axios = require('axios');

async function tiktokCommand(sock, from, msg) {
    try {
        const messageContent = msg.message?.ephemeralMessage?.message || msg.message?.viewOnceMessage?.message || msg.message?.viewOnceMessageV2?.message || msg.message;
        const text = (messageContent.conversation || messageContent.extendedTextMessage?.text || messageContent.imageMessage?.caption || messageContent.videoMessage?.caption || '').trim();
        const q = text.replace(/^\.(tiktok|tt)\s+/i, '').trim();

        if (!q || q.startsWith('.')) return await sock.sendMessage(from, { text: "❌ Please provide a TikTok URL." }, { quoted: msg });
        
        const loadEmojis = ['📥', '⏳', '📱'];
        for (const emoji of loadEmojis) {
            await sock.sendMessage(from, { react: { text: emoji, key: msg.key } });
        }
        const res = await axios.get(`https://tikwm.com/api/?url=${q}`);
        if (res.data && res.data.data && res.data.data.play) {
            const videoUrl = res.data.data.play;
            await sock.sendMessage(from, { video: { url: videoUrl }, caption: "✅ TIKTOK DOWNLOADED BY OLD-STUDIO-MD" }, { quoted: msg });
        } else {
            throw new Error("Invalid response from TikTok API");
        }
    } catch (e) {
        await sock.sendMessage(from, { text: "❌ Error downloading TikTok. Make sure the link is valid." }, { quoted: msg });
    }
}

module.exports = tiktokCommand;
