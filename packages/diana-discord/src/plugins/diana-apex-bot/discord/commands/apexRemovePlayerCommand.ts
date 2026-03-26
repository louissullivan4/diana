import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { SlashCommand } from '../../../../discord/commandTypes';
import {
    searchApexPlayerNames,
    getApexPlayerUidByName,
    removeApexPlayerFromGuild,
    deleteApexPlayer,
    getGuildsTrackingApexPlayer,
} from 'diana-core';

export const apexRemovePlayerCommand: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName('apex-remove')
        .setDescription('Stop tracking an Apex Legends player in this server.')
        .addStringOption((opt) =>
            opt
                .setName('name')
                .setDescription('Player name to remove.')
                .setRequired(true)
                .setAutocomplete(true)
        ) as SlashCommandBuilder,

    autocomplete: async (interaction) => {
        const focused = interaction.options.getFocused(true);
        if (focused.name !== 'name') return;
        try {
            const guildId = interaction.guildId ?? undefined;
            const names = await searchApexPlayerNames(
                focused.value,
                25,
                guildId
            );
            await interaction.respond(
                names.map((n) => ({ name: n, value: n }))
            );
        } catch {
            await interaction.respond([]);
        }
    },

    execute: async (interaction) => {
        const guildId = interaction.guildId;
        if (!guildId) {
            await interaction.reply({
                content: 'This command can only be used in a server.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const name = interaction.options.getString('name', true).trim();
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const uid = await getApexPlayerUidByName(name);
            if (!uid) {
                await interaction.editReply(`Player **${name}** not found.`);
                return;
            }

            const removed = await removeApexPlayerFromGuild(guildId, uid);
            if (!removed) {
                await interaction.editReply(
                    `**${name}** is not tracked in this server.`
                );
                return;
            }

            // Clean up global record if no other guilds track them
            const remainingGuilds = await getGuildsTrackingApexPlayer(uid);
            if (remainingGuilds.length === 0) {
                await deleteApexPlayer(uid);
            }

            await interaction.editReply(`Stopped tracking **${name}**.`);
        } catch (err) {
            console.error('[/apex-remove] Error:', err);
            await interaction.editReply(
                'Something went wrong. Please try again later.'
            );
        }
    },
};
