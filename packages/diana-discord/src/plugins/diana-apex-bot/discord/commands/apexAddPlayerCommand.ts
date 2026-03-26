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
            .setDescription('Add an Apex Legends player to track in this server.')
            .addStringOption((opt) =>
                opt
                    .setName('name')
                    .setDescription('Player\'s in-game name.')
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
            });
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
        const platform = (interaction.options.getString('platform') ?? 'PC').toUpperCase();

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const bridgeData = await apexService.getPlayerByName(name, platform);
            const { uid, name: resolvedName, rank } = bridgeData.global;
            const uidStr = String(uid);

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
                await interaction.editReply(
                    `Could not find player **${name}** on **${platform}**. Check the name and platform.`
                );
            } else {
                console.error('[/apex-add] Error:', err);
                await interaction.editReply('Something went wrong. Please try again later.');
            }
        }
    },
};
