/**
 * Ragnarok Bot Discovery Tool
 * Run this after putting your DISCORD_TOKEN in the .env file.
 * It will help you find the Guild ID and Channel IDs.
 */

require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

if (!process.env.DISCORD_TOKEN || process.env.DISCORD_TOKEN === 'your_bot_token_here') {
    console.error('❌ ERRORE: Inserisci il DISCORD_TOKEN nel file .env prima di eseguire questo script.');
    process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    console.log(`\n✅ Bot collegato come: ${client.user.tag}`);
    console.log(`🔹 Client ID (Application ID): ${client.user.id}\n`);

    const guilds = await client.guilds.fetch();
    
    if (guilds.size === 0) {
        console.log('⚠️ Il bot non è ancora in nessun server. Invitalo usando il link nel setup_guide.md!');
        process.exit(0);
    }

    console.log('--- SERVER DISPONIBILI ---');
    for (const [id, guildBase] of guilds) {
        const guild = await guildBase.fetch();
        console.log(`🏰 Server: ${guild.name} | GUILD_ID: ${guild.id}`);
        
        console.log('   --- CANALI TESTUALI ---');
        const channels = await guild.channels.fetch();
        channels.filter(c => c.type === ChannelType.GuildText).forEach(channel => {
            console.log(`   # ${channel.name.padEnd(20)} | STAFF_CHANNEL_ID: ${channel.id}`);
        });
        console.log('');
    }

    console.log('📝 Copia gli ID sopra e incollali nel tuo file .env');
    console.log('Spegni questo script con CTRL+C quando hai finito.');
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error('❌ Errore durante il login. Controlla il Token nel file .env.');
    process.exit(1);
});
