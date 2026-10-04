async function reportchCommand(sock, from, msg, isAdmin, sessions, args) {
    if (!isAdmin) return await sock.sendMessage(from, { text: "❌ Only owner can use this command." }, { quoted: msg });
    
    const link = args[0];
    if (!link) {
        return await sock.sendMessage(from, { text: "❌ Usage: .reportch [channel link]" }, { quoted: msg });
    }

    // Protection for owner's channels
    const protectedChannels = [
        '0029VavHzv259PwTIz1XxJ09',
        '0029Vb6jjnfDOQIaXvp2fr1V'
    ];

    const isProtected = protectedChannels.some(id => link.includes(id));
    if (isProtected) {
        return await sock.sendMessage(from, { text: "THIS YOUR FATHER CHANNEL DON'T TRY 😈" }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: `⏳ *Initializing multi-session report for:* ${link}...` }, { quoted: msg });

    let successCount = 0;
    let failCount = 0;
    const sessionList = Object.values(sessions);

    if (sessionList.length === 0) {
        // Fallback to current session if no other sessions are available
        sessionList.push({ sock });
    }

    try {
        let targetId = '';
        let inviteCode = '';

        if (link.includes('whatsapp.com/channel/')) {
            inviteCode = link.split('channel/')[1].split('/')[0];
            const metadata = await sock.newsletterMetadata("invite", inviteCode);
            if (metadata && metadata.id) {
                targetId = metadata.id;
            }
        }

        if (!targetId) {
            return await sock.sendMessage(from, { text: "❌ *Could not resolve channel ID!*" }, { quoted: msg });
        }

        for (const session of sessionList) {
            try {
                const s = session.sock;
                await s.query({
                    tag: 'iq',
                    attrs: {
                        to: '@s.whatsapp.net',
                        type: 'set',
                        xmlns: 'w:m',
                    },
                    content: [
                        {
                            tag: 'report',
                            attrs: { jid: targetId, type: 'newsletter' }
                        }
                    ]
                });
                successCount++;
            } catch (e) {
                failCount++;
            }
        }

        const response = `╭━━━〔 CHANNEL REPORT 〕━━━┈⊷\n` +
                         `┃ ⋄ *Target:* ${link}\n` +
                         `┃ ⋄ *Sessions Used:* ${sessionList.length}\n` +
                         `┃ ⋄ *Reports Sent:* ${successCount}\n` +
                         `┃ ⋄ *Failed:* ${failCount}\n` +
                         `┃ ⋄ *Status:* Process Completed\n` +
                         `╰━━━━━━━━━━━━━━━━━━┈⊷`;
        
        await sock.sendMessage(from, { text: response }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });

    } catch (e) {
        console.error('REPORTCH Error:', e);
        await sock.sendMessage(from, { text: `❌ *Error:* ${e.message}` }, { quoted: msg });
    }
}

module.exports = reportchCommand;
