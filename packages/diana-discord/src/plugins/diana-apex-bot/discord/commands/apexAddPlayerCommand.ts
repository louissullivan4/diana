import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { SlashCommand } from '../../../../discord/commandTypes';
import {
    createApexService,
    getApexPlayerByUid,
    createApexPlayer,
    addSummonerToGuild,
    isApexPlayerInGuild,
    createApexRankHistory,
    APEX_PLATFORMS,
} from 'diana-core';

const apexService = createApexService();
const platformChoices = APEX_PLATFORMS.map((p) => ({ name: p, value: p }));

export const apexAddPlayerCommand: SlashCommand = {
    data: (() => {
        const builder = new SlashCommandBuilder()
            .setName('apex-add')
            .setDescription(
                'Add an Apex Legends player to track in this server.'
            )
            .addStringOption((opt) =>
                opt
                    .setName('name')
                    .setDescription("Player's in-game name.")
                    .setRequired(true)
            )
            .addStringOption((opt) => {
                opt.setName('platform')
                    .setDescription('Platform (default: PC).')
                    .setRequired(false);
                for (const c of platformChoices) {
                    opt.addChoices({ name: c.name, value: c.value });
                }
                return opt;
            })
            .addStringOption((opt) =>
                opt
                    .setName('uid')
                    .setDescription(
                        'Apex UID (optional). Use if name lookup fails — find yours at mozambiquehe.re.'
                    )
                    .setRequired(false)
            );
        return builder;
    })(),

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
        const platform = (
            interaction.options.getString('platform') ?? 'PC'
        ).toUpperCase();
        const manualUid = interaction.options.getString('uid')?.trim() ?? null;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            let uidStr: string;

            if (manualUid) {
                // UID provided directly — skip name lookup
                uidStr = manualUid;
            } else {
                // Two-step: resolve exact UID first, then fetch full data by UID.
                // getPlayerByName does fuzzy matching and can return the wrong player.
                uidStr = await apexService.getUidByName(name, platform);
            }

            const bridgeData = await apexService.getPlayerByUid(
                uidStr,
                platform
            );
            const { name: resolvedName, rank } = bridgeData.global;

            const alreadyTracked = await isApexPlayerInGuild(guildId, uidStr);
            if (alreadyTracked) {
                await interaction.editReply(
                    `**${resolvedName}** (${platform}) is already being tracked in this server.`
                );
                return;
            }

            const existing = await getApexPlayerByUid(uidStr);
            if (!existing) {
                await createApexPlayer({
                    uid: uidStr,
                    gameName: resolvedName,
                    platform,
                    tier: rank.rankName,
                    rankDiv: rank.rankDiv,
                    rp: rank.rankScore,
                });
                await createApexRankHistory(
                    `INIT_${uidStr}`,
                    uidStr,
                    rank.rankName,
                    rank.rankDiv,
                    rank.rankScore
                ).catch(() => {});
            }

            await addSummonerToGuild(guildId, uidStr, interaction.user.id);
            await interaction.editReply(
                `Now tracking **${resolvedName}** (${platform}) in this server.`
            );
        } catch (err: any) {
            const status = err?.status ?? err?.statusCode;
            if (status === 404) {
                const hint = manualUid
                    ? `Could not find player with UID **${manualUid}** on **${platform}**. Check the UID and platform.`
                    : `Could not find player **${name}** on **${platform}**. Try passing your UID directly with the \`uid\` option.`;
                await interaction.editReply(hint);
            } else {
                console.error('[/apex-add] Error:', err);
                await interaction.editReply(
                    'Something went wrong. Please try again later.'
                );
            }
        }
    },
};
