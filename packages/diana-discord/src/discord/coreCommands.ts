import { SlashCommandBuilder, type SlashCommandStringOption } from 'discord.js';
import type { SlashCommand } from './commandTypes';

export const pingCommand: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with "Diana said pong."')
        .addStringOption((option: SlashCommandStringOption) =>
            option
                .setName('target')
                .setDescription('Optional name or message to include.')
                .setRequired(false)
        ),
    execute: async (interaction) => {
        const target = interaction.options.getString('target');
        if (target) {
            await interaction.reply(`Diana pinged ${target}!`);
            return;
        }
        await interaction.reply('Diana said pong.');
    },
};
