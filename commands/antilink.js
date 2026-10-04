async function antilinkCommand(sock, from, msg, isAdmin, botData, saveBotData, args) {
    if (!isAdmin || !from.endsWith('@g.us')) return await sock.sendMessage(from, { text: "❌ Only admin can use this command in groups." }, { quoted: msg });
    
    const action = args[0]?.toLowerCase();
    if (action === 'on' || action === 'del') {
        botData.antilinkGroups[from] = 'del';
        saveBotData();
        await sock.sendMessage(from, { text: "✅ Anti-Link (Delete Only) Enabled!" }, { quoted: msg });
    } else if (action === 'kick') {
        botData.antilinkGroups[from] = 'kick';
        saveBotData();
        await sock.sendMessage(from, { text: "✅ Anti-Link (Kick + Delete) Enabled!" }, { quoted: msg });
    } else if (action === 'off') {
        delete botData.antilinkGroups[from];
        saveBotData();
        await sock.sendMessage(from, { text: "❌ Anti-Link Disabled!" }, { quoted: msg });
    } else {
        await sock.sendMessage(from, { text: "❌ Usage: .antilink [on/off/kick]\n\n*Note:* This will delete all links from non-admins." }, { quoted: msg });
    }
}

module.exports = antilinkCommand;
