import { SlashCommandBuilder } from 'discord.js';
import type { SlashCommand } from '../commandService';

export const pingCommand: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with "Diana said pong."'),
    execute: async (interaction) => {
        await interaction.reply('Diana said pong.');
    },
};
