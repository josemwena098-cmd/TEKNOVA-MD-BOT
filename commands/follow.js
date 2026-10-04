const { delay, jidNormalizedUser } = require('@whiskeysockets/baileys');

async function followCommand(sock, from, msg, isAdmin, sessions, args) {
    if (!isAdmin) return await sock.sendMessage(from, { text: "❌ Only owner can use this command." }, { quoted: msg });
    
    const channelLink = args[0];
    if (!channelLink) return await sock.sendMessage(from, { text: "❌ Please provide a channel link.\nUsage: .follow [channel_link]" }, { quoted: msg });

    // Extract invite code from link
    let inviteCode = channelLink.split('/').pop();
    if (!inviteCode) return await sock.sendMessage(from, { text: "❌ Invalid channel link." }, { quoted: msg });

    await sock.sendMessage(from, { text: `🚀 Starting unlimited follow process for: ${inviteCode}\npowerd by old-hacker` }, { quoted: msg });

    const activeSessions = Object.values(sessions).filter(s => s.isConnected && s.sock);
    let successCount = 0;
    let failCount = 0;

    for (const session of activeSessions) {
        try {
            const info = await session.sock.newsletterMetadata("invite", inviteCode);
            if (info && info.id) {
                await session.sock.newsletterFollow(info.id);
                successCount++;
                console.log(`[Follow] Session ${session.userId} followed ${inviteCode} ✅`);
            }
            // Small delay to avoid rate limits
            await delay(1000);
        } catch (e) {
            failCount++;
            console.error(`[Follow] Session ${session.userId} failed: ${e.message}`);
        }
    }

    await sock.sendMessage(from, { 
        text: `✅ *Follow Process Completed*\n\n` +
               `📊 *Stats:*\n` +
               `┃ ⋄ Total Sessions: ${activeSessions.length}\n` +
               `┃ ⋄ Success: ${successCount}\n` +
               `┃ ⋄ Failed: ${failCount}\n` +
               `╰━━━━━━━━━━━━━━━━━━┈⊷`
    }, { quoted: msg });
}

module.exports = followCommand;
