import {
    SlashCommandBuilder,
    MessageFlags,
    PermissionFlagsBits,
} from 'discord.js';
import type { SlashCommand } from '../../../../discord/commandTypes';
import { setGuildChannel } from 'diana-core';

export const apexSetChannelCommand: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName('apex-channel')
        .setDescription(
            'Set the channel for Apex Legends rank change notifications.'
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption((opt) =>
            opt
                .setName('channel')
                .setDescription('The channel to post notifications in.')
                .setRequired(true)
        ) as SlashCommandBuilder,

    execute: async (interaction) => {
        const guildId = interaction.guildId;
        if (!guildId) {
            await interaction.reply({
                content: 'This command can only be used in a server.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const channel = interaction.options.getChannel('channel', true);
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            await setGuildChannel(guildId, channel.id);
            await interaction.editReply(
                `Apex Legends notifications will be posted in <#${channel.id}>.`
            );
        } catch (err) {
            console.error('[/apex-channel] Error:', err);
            await interaction.editReply(
                'Failed to set channel. Please try again.'
            );
        }
    },
};
