async function acceptCommand(sock, from, msg, isAdmin) {
    if (!from.endsWith('@g.us')) {
        return sock.sendMessage(from, { text: '❌ This command can only be used in groups.' }, { quoted: msg });
    }

    if (!isAdmin) {
        return sock.sendMessage(from, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
    }

    try {
        // Fetch pending join requests
        const response = await sock.groupRequestParticipantsList(from);
        
        if (!response || response.length === 0) {
            return sock.sendMessage(from, { text: '✅ No pending join requests found in this group.' }, { quoted: msg });
        }

        await sock.sendMessage(from, { text: `⏳ Found ${response.length} pending requests. Starting auto-accept...` }, { quoted: msg });

        let acceptedCount = 0;
        for (const participant of response) {
            try {
                await sock.groupRequestParticipantsUpdate(from, [participant.jid], 'approve');
                acceptedCount++;
                // Small delay to prevent rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (err) {
                console.error(`Failed to accept ${participant.jid}:`, err.message);
            }
        }

        await sock.sendMessage(from, { text: `✅ Successfully accepted ${acceptedCount} pending requests.` }, { quoted: msg });

    } catch (e) {
        console.error('Accept command error:', e);
        await sock.sendMessage(from, { text: '❌ Error: ' + e.message }, { quoted: msg });
    }
}

module.exports = acceptCommand;
