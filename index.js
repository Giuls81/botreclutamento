/**
 * Ragnarok Recruitment Bot
 * Official tool for Ragnarok Esport - 'The Valhalla of Sim Racing'
 * 
 * This bot handles driver recruitment applications via a professional interface.
 * Features: Multi-language support (IT, EN, ES, FR, DE)
 */

require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    Events, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    EmbedBuilder, 
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    REST, 
    Routes,
    MessageFlags 
} = require('discord.js');
const http = require('http');

const locales = require('./locales');

// Initialize the Client
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds] 
});

const RAGNAROK_GOLD = '#D4AF37';

// Command Definitions
const commands = [
    {
        name: 'apply',
        description: 'Forge your path to Valhalla - Apply as a Driver.',
    },
];

// Register Slash Commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands() {
    try {
        console.log('--- Resurrecting Commands in Midgard ---');
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );
        console.log('--- Commands successfully forged! ---');
    } catch (error) {
        console.error('Failed to forge commands:', error);
    }
}

// Event: Bot Ready
client.once(Events.ClientReady, c => {
    console.log(`--- Ragnarok Bot Awakened: ${c.user.tag} ---`);
    registerCommands();
});

// Event: Interaction Create
client.on(Events.InteractionCreate, async interaction => {
    console.log(`--- Interaction Received: ${interaction.type} from ${interaction.user.tag} ---`);
    
    // Handle Slash Commands
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'apply') {
            // Defer reply to give the bot time to "wake up" on Render Free Tier
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            // Language Selection Menu
            const select = new StringSelectMenuBuilder()
                .setCustomId('language_selector')
                .setPlaceholder('Choose your language / Scegli la tua lingua')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('Italiano').setValue('it').setEmoji('🇮🇹'),
                    new StringSelectMenuOptionBuilder().setLabel('English').setValue('en').setEmoji('🇬🇧'),
                    new StringSelectMenuOptionBuilder().setLabel('Español').setValue('es').setEmoji('🇪🇸'),
                    new StringSelectMenuOptionBuilder().setLabel('Français').setValue('fr').setEmoji('🇫🇷'),
                    new StringSelectMenuOptionBuilder().setLabel('Deutsch').setValue('de').setEmoji('🇩🇪')
                );

            const row = new ActionRowBuilder().addComponents(select);

            await interaction.editReply({
                content: '⚔️ **Benvenuto a Ragnarok Esport / Welcome to Ragnarok Esport** ⚔️\nSeleziona la tua lingua per procedere con la candidatura / Select your language to proceed with the application.',
                components: [row]
            });
        }
    }

    // Handle Select Menu (Language Choice)
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'language_selector') {
            const langCode = interaction.values[0];
            const t = locales[langCode];

            const modal = new ModalBuilder()
                .setCustomId(`recruitment_modal_${langCode}`)
                .setTitle(t.modal_title);

            // Fields
            const teamInput = new TextInputBuilder()
                .setCustomId('team_input')
                .setLabel(t.field_team_label)
                .setPlaceholder(t.field_team_placeholder)
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const motivationInput = new TextInputBuilder()
                .setCustomId('motivation_input')
                .setLabel(t.field_motivation_label)
                .setPlaceholder(t.field_motivation_placeholder)
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const backgroundInput = new TextInputBuilder()
                .setCustomId('background_input')
                .setLabel(t.field_background_label)
                .setPlaceholder(t.field_background_placeholder)
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const psnInput = new TextInputBuilder()
                .setCustomId('psn_input')
                .setLabel(t.field_psn_label)
                .setPlaceholder(t.field_psn_placeholder)
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            // Add to action rows
            const rows = [teamInput, motivationInput, backgroundInput, psnInput].map(input => 
                new ActionRowBuilder().addComponents(input)
            );

            modal.addComponents(...rows);

            await interaction.showModal(modal);
        }
    }

    // Handle Modal Submissions
    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('recruitment_modal_')) {
            const langCode = interaction.customId.split('_')[2];
            const t = locales[langCode];

            const team = interaction.fields.getTextInputValue('team_input');
            const motivation = interaction.fields.getTextInputValue('motivation_input');
            const background = interaction.fields.getTextInputValue('background_input');
            const psn = interaction.fields.getTextInputValue('psn_input');

            // Find the staff channel
            let staffChannel;
            if (process.env.STAFF_CHANNEL_ID) {
                staffChannel = await interaction.guild.channels.fetch(process.env.STAFF_CHANNEL_ID).catch(() => null);
            }

            // Fallback: search by name
            if (!staffChannel) {
                staffChannel = interaction.guild.channels.cache.find(c => 
                    c.type === ChannelType.GuildText && 
                    (c.name.includes('staff') || c.name.includes('reclutamento') || c.name.includes('recruitment'))
                );
            }

            if (!staffChannel) {
                return interaction.reply({ 
                    content: t.error_channel, 
                    ephemeral: true 
                });
            }

            // Create the Embed
            const applicationEmbed = new EmbedBuilder()
                .setColor(RAGNAROK_GOLD)
                .setTitle(t.embed_title)
                .setAuthor({ 
                    name: interaction.user.tag, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .setDescription(`${t.embed_desc}\n🌐 **Language:** ${t.language_name}`)
                .addFields(
                    { name: t.embed_pilot, value: `<@${interaction.user.id}>`, inline: true },
                    { name: t.embed_psn, value: psn, inline: true },
                    { name: t.embed_prev_team, value: team, inline: false },
                    { name: t.embed_motivation, value: motivation },
                    { name: t.embed_background, value: background }
                )
                .setFooter({ 
                    text: 'Ragnarok Esport Recruitment System', 
                    iconURL: interaction.guild.iconURL() 
                })
                .setTimestamp();

            await staffChannel.send({ embeds: [applicationEmbed] });

            await interaction.reply({ 
                content: t.success_msg, 
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
});

// Simple HTTP server for Render Health Check
const port = process.env.PORT || 10000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Ragnarok Bot is running!\n');
}).listen(port, () => {
    console.log(`--- Health Check Server listening on port ${port} ---`);
});

// Login
client.login(process.env.DISCORD_TOKEN);
