import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { SlashCommand } from '../../../../discord/commandTypes';
import {
    createApexService,
    buildApexPlayerEmbed,
    searchApexPlayerNames,
    getApexPlayerUidByName,
    getApexPlayerByUid as getDbPlayer,
    getApexRankEmblem,
    APEX_PLATFORMS,
} from 'diana-core';

const apexService = createApexService();

const platformChoices = APEX_PLATFORMS.map((p) => ({ name: p, value: p }));

export const apexPlayerInfoCommand: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName('apex-player')
        .setDescription("Look up an Apex Legends player's stats and rank.")
        .addStringOption((opt) =>
            opt
                .setName('name')
                .setDescription('Player name (exact in-game name).')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption((opt) => {
            opt.setName('platform')
                .setDescription(
                    'Platform (default: PC). Only needed for untracked players.'
                )
                .setRequired(false);
            for (const c of platformChoices) {
                opt.addChoices({ name: c.name, value: c.value });
            }
            return opt;
        }) as SlashCommandBuilder,

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
        const name = interaction.options.getString('name', true).trim();
        const platformOption =
            interaction.options.getString('platform') ?? 'PC';

        await interaction.deferReply();

        try {
            let resolvedUid: string;
            let resolvedPlatform: string = platformOption;

            const dbUid = await getApexPlayerUidByName(name);
            if (dbUid) {
                const dbPlayer = await getDbPlayer(dbUid);
                resolvedUid = dbUid;
                resolvedPlatform = dbPlayer?.platform ?? platformOption;
            } else {
                resolvedUid = await apexService.getUidByName(
                    name,
                    platformOption
                );
            }

            const data = await apexService.getPlayerByUid(
                resolvedUid,
                resolvedPlatform
            );
            const embed = buildApexPlayerEmbed(data);

            const rankEmblem = getApexRankEmblem(data.global.rank.rankName);

            const discordEmbed = new EmbedBuilder()
                .setTitle(`${embed.playerName}`)
                .setColor(embed.colorHex)
                .setTimestamp()
                .setFooter({ text: 'Apex Legends Stats' });

            if (rankEmblem) {
                discordEmbed.setThumbnail(rankEmblem);
            }

            discordEmbed.addFields(
                {
                    name: '🏆 **Rank**',
                    value: `**${embed.rankDisplay}**`,
                    inline: true,
                },
                {
                    name: '🌟 **Level**',
                    value: `**${embed.level}** (${embed.levelProgress}% to next)`,
                    inline: true,
                },
                {
                    name: '📡 **Status**',
                    value: embed.status,
                    inline: true,
                }
            );

            if (embed.topStats.length > 0) {
                discordEmbed.addFields({
                    name: '📊 **Tracker Stats**',
                    value: '\u200b',
                    inline: false,
                });
                for (const stat of embed.topStats) {
                    discordEmbed.addFields({
                        name: `**${stat.name}**`,
                        value: `**${stat.value}**`,
                        inline: true,
                    });
                }
            }

            await interaction.editReply({ embeds: [discordEmbed] });
        } catch (err: any) {
            const status = err?.status ?? 0;
            if (status === 404) {
                await interaction.editReply(
                    `Could not find player **${name}**. Check the name and platform.`
                );
            } else {
                console.error('[/apex-player] Error:', err);
                await interaction.editReply(
                    'Failed to fetch player data. Please try again later.'
                );
            }
        }
    },
};
