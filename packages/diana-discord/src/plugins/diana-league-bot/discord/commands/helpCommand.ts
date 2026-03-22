import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import type { SlashCommand } from '../../../../discord/commandTypes';

export const helpCommand: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available Diana commands.'),

    execute: async (interaction) => {
        const embed = new EmbedBuilder()
            .setTitle('Diana - Command Reference')
            .setDescription('Here are all available commands:')
            .setColor(0x5865f2)
            .addFields(
                {
                    name: '⚙️ Setup',
                    value: [
                        '`/setchannel #channel` - Set the channel where match notifications are posted. Requires **Manage Channels**.',
                        '`/config live-posting true/false` - Enable or disable live match notifications. Requires **Manage Server**.',
                        '`/config view` - View the current bot settings for this server.',
                    ].join('\n'),
                    inline: false,
                },
                {
                    name: '👤 Summoner Tracking',
                    value: [
                        '`/add <name> <tag> [region]` - Start tracking a summoner in this server.',
                        '`/remove <name> [tag]` - Stop tracking a summoner in this server.',
                    ].join('\n'),
                    inline: false,
                },
                {
                    name: '📊 Stats',
                    value: [
                        "`/summoner <name> [tag] [region]` - View a tracked summoner's profile and recent stats.",
                        '`/champion-stats` - View champion statistics.',
                        '`/inter-of-the-week` - View the Inter of the Week rankings.',
                    ].join('\n'),
                    inline: false,
                },
                {
                    name: '🔧 Other',
                    value: '`/help` - Show this help message.',
                    inline: false,
                }
            )
            .setFooter({ text: 'Diana - League of Legends match tracking bot' })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
        });
    },
};
