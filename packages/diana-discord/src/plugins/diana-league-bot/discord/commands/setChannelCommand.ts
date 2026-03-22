import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags,
} from 'discord.js';
import type { SlashCommand } from '../../../../discord/commandTypes';
import { setGuildChannel } from 'diana-core';

export const setChannelCommand: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName('setchannel')
        .setDescription(
            'Set the channel where match notifications will be posted.'
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('The channel to post match notifications in.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),
    execute: async (interaction) => {
        const guildId = interaction.guildId;
        if (!guildId) {
            await interaction.reply({
                content: 'This command can only be used in a server.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const channel = interaction.options.getChannel('channel', true);

        await setGuildChannel(guildId, channel.id);

        await interaction.editReply({
            content: `Match notifications will now be posted in <#${channel.id}>.`,
        });
    },
};
