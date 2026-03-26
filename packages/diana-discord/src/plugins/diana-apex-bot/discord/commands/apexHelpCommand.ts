import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { SlashCommand } from '../../../../discord/commandTypes';

export const apexHelpCommand: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName('apex-help')
        .setDescription('Show all Apex Legends bot commands.'),

    execute: async (interaction) => {
        const embed = new EmbedBuilder()
            .setTitle('🔫 Pathfinder - Apex Legends Bot Help')
            .setColor(0xe74c3c)
            .setDescription('Track Apex Legends players and get rank change notifications.')
            .addFields(
                {
                    name: '/apex-player <name> [platform]',
                    value: 'Look up a player\'s stats and rank.',
                },
                {
                    name: '/apex-add <name> [platform]',
                    value: 'Start tracking a player in this server.',
                },
                {
                    name: '/apex-remove <name>',
                    value: 'Stop tracking a player in this server.',
                },
                {
                    name: '/apex-channel <#channel>',
                    value: 'Set the channel for rank change notifications.',
                },
                {
                    name: '/apex-predator',
                    value: 'Show current Predator RP cut-off for each platform.',
                }
            )
            .setFooter({ text: 'Powered by apexlegendsapi.com' });

        await interaction.reply({ embeds: [embed] });
    },
};
