async function chidCommand(sock, from, msg, args) {
    try {
        const link = args[0];
        if (!link || (!link.includes('whatsapp.com/channel/') && !link.includes('chat.whatsapp.com/'))) {
            return await sock.sendMessage(from, { text: `❌ *Invalid Link!*\n\nUsage: .chid [channel/group link]` }, { quoted: msg });
        }

        await sock.sendMessage(from, { react: { text: '🔍', key: msg.key } });

        if (link.includes('whatsapp.com/channel/')) {
            const code = link.split('channel/')[1].split('/')[0];
            let name = 'Unknown';
            let id = 'Unknown';

            try {
                const metadata = await sock.newsletterMetadata("invite", code);
                if (metadata) {
                    // Baileys newsletter metadata can have different structures
                    name = metadata.name || metadata.subject || metadata.title || (metadata.preview && metadata.preview.name) || name;
                    id = metadata.id || id;
                }
            } catch (err) {
                console.error('Newsletter metadata fetch error:', err);
            }

            // If name is still unknown, try to guess from the link if it's a vanity link
            if (name === 'Unknown' && !code.match(/^[0-9a-zA-Z]{20,}$/)) {
                name = code.replace(/-/g, ' ');
            }

            const response = `╭━━━〔 CHANNEL ID 〕━━━┈⊷\n` +
                             `┃ ⋄ *Name:* ${name}\n` +
                             `┃ ⋄ *ID:* \`${id}\`\n` +
                             `╰━━━━━━━━━━━━━━━━━━┈⊷`;
            await sock.sendMessage(from, { text: response }, { quoted: msg });

        } else if (link.includes('chat.whatsapp.com/')) {
            const code = link.split('chat.whatsapp.com/')[1].split('/')[0];
            const metadata = await sock.groupGetInviteInfo(code);
            
            if (metadata && metadata.id) {
                const response = `╭━━━〔 GROUP ID 〕━━━┈⊷\n` +
                                 `┃ ⋄ *Subject:* ${metadata.subject}\n` +
                                 `┃ ⋄ *ID:* \`${metadata.id}\`\n` +
                                 `╰━━━━━━━━━━━━━━━━━━┈⊷`;
                await sock.sendMessage(from, { text: response }, { quoted: msg });
            } else {
                await sock.sendMessage(from, { text: "❌ *Could not fetch group metadata!*" }, { quoted: msg });
            }
        }

        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });

    } catch (e) {
        console.error('CHID Error:', e);
        await sock.sendMessage(from, { text: `❌ *Error:* ${e.message}` }, { quoted: msg });
    }
}

module.exports = chidCommand;
