import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    MessageFlags,
} from 'discord.js';
import type { SlashCommand } from '../../../../discord/commandTypes';
import { getGuildConfig, setGuildLivePosting } from 'diana-core';

export const configCommand: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('View or update Diana bot settings for this server.')
        .addSubcommand((sub) =>
            sub
                .setName('live-posting')
                .setDescription('Enable or disable live match notifications.')
                .addBooleanOption((option) =>
                    option
                        .setName('enabled')
                        .setDescription(
                            'True to enable live posting, false to disable.'
                        )
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('view')
                .setDescription(
                    'View the current bot configuration for this server.'
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    execute: async (interaction) => {
        const guildId = interaction.guildId;
        if (!guildId) {
            await interaction.reply({
                content: 'This command can only be used in a server.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (subcommand === 'live-posting') {
            const enabled = interaction.options.getBoolean('enabled', true);
            await setGuildLivePosting(guildId, enabled);
            await interaction.editReply({
                content: `Live match posting is now **${enabled ? 'enabled' : 'disabled'}** for this server.`,
            });
            return;
        }

        if (subcommand === 'view') {
            const config = await getGuildConfig(guildId);
            const channel = config?.channel_id
                ? `<#${config.channel_id}>`
                : 'Not set — use `/setchannel` to configure.';
            const livePosting = config
                ? config.live_posting
                    ? 'Enabled'
                    : 'Disabled'
                : 'Enabled (default)';

            const embed = new EmbedBuilder()
                .setTitle('Diana — Server Configuration')
                .addFields(
                    {
                        name: 'Notification Channel',
                        value: channel,
                        inline: false,
                    },
                    {
                        name: 'Live Match Posting',
                        value: livePosting,
                        inline: false,
                    }
                )
                .setColor(0x5865f2)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    },
};
