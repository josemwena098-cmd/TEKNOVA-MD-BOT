async function groupInfoCommand(sock, chatId, msg) {
    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, { text: 'This command can only be used in groups.' });
        return;
    }

    try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;
        const groupAdmins = participants.filter(p => p.admin);
        const listAdmin = groupAdmins.map((v, i) => `${i + 1}. @${v.id.split('@')[0]}`).join('\n');
        
        // Fix owner logic
        const owner = groupMetadata.owner || groupMetadata.subjectOwner || (participants.find(p => p.admin === 'superadmin')?.id) || 'Not found';
        const ownerDisplay = owner !== 'Not found' ? `@${owner.split('@')[0]}` : 'Not found';

        let pp;
        try {
            pp = await sock.profilePictureUrl(chatId, 'image');
        } catch {
            pp = 'https://i.imgur.com/2wzGhpF.jpeg';
        }

        const toBold = (text) => {
            const boldChars = {
                'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
                'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
                '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
            };
            return text.split('').map(c => boldChars[c] || c).join('');
        };

        const text = `╭━━━〔 ${toBold("𝗚𝗥𝗢𝗨𝗣 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗢𝗡")} 〕━━━┈⊷\n` +
                     `┃ ⋄ ${toBold("𝗡𝗔𝗠𝗘:")} ${groupMetadata.subject}\n` +
                     `┃ ⋄ ${toBold("𝗜𝗗:")} ${groupMetadata.id}\n` +
                     `┃ ⋄ ${toBold("𝗢𝗪𝗡𝗘𝗥:")} ${ownerDisplay}\n` +
                     `┃ ⋄ ${toBold("𝗠𝗘𝗠𝗕𝗘𝗥𝗦:")} ${participants.length}\n` +
                     `┃ ⋄ ${toBold("𝗔𝗗𝗠𝗜𝗡𝗦:")} ${groupAdmins.length}\n` +
                     `┃ ⋄ ${toBold("𝗖𝗥𝗘𝗔𝗧𝗘𝗗:")} ${new Date(groupMetadata.creation * 1000).toLocaleDateString()}\n` +
                     `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                     `╭━━━〔 ${toBold("𝗔𝗗𝗠𝗜𝗡 𝗟𝗜𝗦𝗧")} 〕━━━┈⊷\n` +
                     `${listAdmin.split('\n').map(a => `┃ ⋄ ${a}`).join('\n')}\n` +
                     `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                     `╭━━━〔 ${toBold("𝗗𝗘𝗦𝗖𝗥𝗜𝗣𝗧𝗜𝗢𝗡")} 〕━━━┈⊷\n` +
                     `┃ ${groupMetadata.desc?.toString() || 'No description available.'}\n` +
                     `╰━━━━━━━━━━━━━━━━━━┈⊷`;

        const mentions = groupAdmins.map(v => v.id);
        if (owner !== 'Not found') mentions.push(owner);

        await sock.sendMessage(chatId, {
            image: { url: pp },
            caption: text,
            mentions: mentions
        });

    } catch (error) {
        console.error('Error in groupinfo command:', error);
        await sock.sendMessage(chatId, { text: 'Failed to get group info! Make sure I am an admin.' });
    }
}

module.exports = groupInfoCommand;
