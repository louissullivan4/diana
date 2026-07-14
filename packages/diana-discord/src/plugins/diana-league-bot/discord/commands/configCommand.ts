import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    MessageFlags,
} from 'discord.js';
import type { SlashCommand } from '../../../../discord/commandTypes';
import {
    getGuildConfig,
    setGuildLivePosting,
    setGuildNotificationPref,
    getNotificationPref,
    type NotificationPrefKey,
} from 'diana-core';

const NOTIFICATION_TYPES: Array<{ name: string; value: NotificationPrefKey }> =
    [
        { name: 'Match posts', value: 'match_posts' },
        { name: 'Rank change posts', value: 'rank_posts' },
        { name: 'Streak & milestone posts', value: 'streaks' },
        { name: 'Weekly digest', value: 'digest' },
        { name: 'Free champion rotation', value: 'rotation' },
    ];

const NOTIFICATION_TYPE_LABELS = new Map(
    NOTIFICATION_TYPES.map((t) => [t.value, t.name])
);

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
                .setName('notifications')
                .setDescription(
                    'Enable or disable a specific notification type.'
                )
                .addStringOption((option) => {
                    option
                        .setName('type')
                        .setDescription('The notification type to toggle.')
                        .setRequired(true);
                    for (const choice of NOTIFICATION_TYPES) {
                        option.addChoices({
                            name: choice.name,
                            value: choice.value,
                        });
                    }
                    return option;
                })
                .addBooleanOption((option) =>
                    option
                        .setName('enabled')
                        .setDescription(
                            'True to enable this notification type, false to disable.'
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

        if (subcommand === 'notifications') {
            const type = interaction.options.getString(
                'type',
                true
            ) as NotificationPrefKey;
            const enabled = interaction.options.getBoolean('enabled', true);
            await setGuildNotificationPref(guildId, type, enabled);
            const label = NOTIFICATION_TYPE_LABELS.get(type) ?? type;
            await interaction.editReply({
                content: `${label} notifications are now **${enabled ? 'enabled' : 'disabled'}** for this server.`,
            });
            return;
        }

        if (subcommand === 'view') {
            const config = await getGuildConfig(guildId);
            const channel = config?.channel_id
                ? `<#${config.channel_id}>`
                : 'Not set - use `/setchannel` to configure.';
            const livePosting = config
                ? config.live_posting
                    ? 'Enabled'
                    : 'Disabled'
                : 'Enabled (default)';

            const prefLines = NOTIFICATION_TYPES.map(({ name, value }) => {
                const effective = getNotificationPref(config, value);
                const explicit = config?.notification_prefs?.[value];
                const suffix =
                    typeof explicit === 'boolean' ? '' : ' (default)';
                return `${name}: **${effective ? 'Enabled' : 'Disabled'}**${suffix}`;
            });

            const embed = new EmbedBuilder()
                .setTitle('Diana - Server Configuration')
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
                    },
                    {
                        name: 'Notification Types',
                        value: prefLines.join('\n'),
                        inline: false,
                    }
                )
                .setColor(0x5865f2)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    },
};
