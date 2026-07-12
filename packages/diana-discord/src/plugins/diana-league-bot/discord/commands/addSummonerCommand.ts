import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { Constants } from 'twisted';
import type { SlashCommand } from '../../../../discord/commandTypes';
import {
    createLolService,
    getSummonerByPuuid,
    createSummoner,
    addSummonerToGuild,
    isSummonerInGuild,
    createRankHistory,
    setSummonerCurrentMatchIdByPuuid,
    buildDeepLolLink,
} from 'diana-core';

const lolService = createLolService();

// Maps a twisted Regions value to { matchRegionPrefix, regionGroup }
const regionMeta: Record<
    string,
    { matchRegionPrefix: string; regionGroup: string }
> = {
    [Constants.Regions.EU_WEST]: {
        matchRegionPrefix: 'EUW1',
        regionGroup: 'EUROPE',
    },
    [Constants.Regions.EU_EAST]: {
        matchRegionPrefix: 'EUN1',
        regionGroup: 'EUROPE',
    },
    [Constants.Regions.AMERICA_NORTH]: {
        matchRegionPrefix: 'NA1',
        regionGroup: 'AMERICAS',
    },
    [Constants.Regions.LAT_NORTH]: {
        matchRegionPrefix: 'LA1',
        regionGroup: 'AMERICAS',
    },
    [Constants.Regions.LAT_SOUTH]: {
        matchRegionPrefix: 'LA2',
        regionGroup: 'AMERICAS',
    },
    [Constants.Regions.KOREA]: {
        matchRegionPrefix: 'KR',
        regionGroup: 'ASIA',
    },
    [Constants.Regions.JAPAN]: {
        matchRegionPrefix: 'JP1',
        regionGroup: 'ASIA',
    },
    [Constants.Regions.BRAZIL]: {
        matchRegionPrefix: 'BR1',
        regionGroup: 'AMERICAS',
    },
    [Constants.Regions.TURKEY]: {
        matchRegionPrefix: 'TR1',
        regionGroup: 'EUROPE',
    },
    [Constants.Regions.RUSSIA]: {
        matchRegionPrefix: 'RU',
        regionGroup: 'EUROPE',
    },
    [Constants.Regions.OCEANIA]: {
        matchRegionPrefix: 'OC1',
        regionGroup: 'SEA',
    },
    [Constants.Regions.SINGAPORE]: {
        matchRegionPrefix: 'SG2',
        regionGroup: 'SEA',
    },
    [Constants.Regions.TAIWAN]: {
        matchRegionPrefix: 'TW2',
        regionGroup: 'SEA',
    },
    [Constants.Regions.VIETNAM]: {
        matchRegionPrefix: 'VN2',
        regionGroup: 'SEA',
    },
    [Constants.Regions.MIDDLE_EAST]: {
        matchRegionPrefix: 'ME1',
        regionGroup: 'EUROPE',
    },
};

const regionChoices = Object.entries(Constants.Regions)
    .map(([label, value]) => ({ name: label, value: value as string }))
    .filter(
        (choice, index, self) =>
            self.findIndex((e) => e.value === choice.value) === index
    )
    .slice(0, 25);

export const addSummonerCommand: SlashCommand = {
    data: (() => {
        const builder = new SlashCommandBuilder()
            .setName('add')
            .setDescription('Add a summoner to track in this server.')
            .addStringOption((option) =>
                option
                    .setName('name')
                    .setDescription('Summoner game name (no tag, e.g. Stew).')
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName('tag')
                    .setDescription('Summoner tagline (e.g. EUW).')
                    .setRequired(true)
            )
            .addStringOption((option) => {
                option
                    .setName('region')
                    .setDescription('Riot platform region (default: EU_WEST).')
                    .setRequired(false);
                for (const choice of regionChoices) {
                    option.addChoices({
                        name: choice.name,
                        value: choice.value,
                    });
                }
                return option;
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
        const tag = interaction.options.getString('tag', true).trim();
        const region =
            interaction.options.getString('region') ??
            Constants.Regions.EU_WEST;
        const meta = regionMeta[region] ?? {
            matchRegionPrefix: 'EUW1',
            regionGroup: 'EUROPE',
        };

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const account = await lolService.getAccountByRiotId(
                name,
                tag,
                meta.regionGroup as any
            );

            const alreadyTracked = await isSummonerInGuild(
                guildId,
                account.puuid
            );
            if (alreadyTracked) {
                await interaction.editReply(
                    `**${account.gameName}#${account.tagLine}** is already being tracked in this server.`
                );
                return;
            }

            const existing = await getSummonerByPuuid(account.puuid);
            const isNew = !existing;
            if (isNew) {
                const deepLolLink = buildDeepLolLink(
                    account.gameName,
                    account.tagLine,
                    meta.matchRegionPrefix
                );

                let initialTier = 'UNRANKED';
                let initialRank = 'N/A';
                let initialLp = 0;
                const rankEntries = await lolService
                    .getRankEntriesByPUUID(account.puuid, region as any)
                    .catch(() => []);
                const soloEntry = rankEntries.find(
                    (e) => e.queueType === 'RANKED_SOLO_5x5'
                );
                if (soloEntry) {
                    initialTier = soloEntry.tier;
                    initialRank = soloEntry.rank;
                    initialLp = soloEntry.leaguePoints;
                }

                await createSummoner({
                    puuid: account.puuid,
                    gameName: account.gameName,
                    tagLine: account.tagLine,
                    region,
                    matchRegionPrefix: meta.matchRegionPrefix,
                    regionGroup: meta.regionGroup,
                    deepLolLink,
                    tier: initialTier,
                    rank: initialRank,
                    lp: initialLp,
                    discordChannelId: undefined,
                });

                for (const entry of rankEntries) {
                    await createRankHistory(
                        'INIT',
                        account.puuid,
                        entry.tier,
                        entry.rank,
                        entry.leaguePoints,
                        entry.queueType
                    ).catch(() => {});
                }

                const recentMatches = await lolService
                    .getMatchesByPUUID(
                        account.puuid,
                        1,
                        meta.regionGroup as any
                    )
                    .catch(() => []);
                if (recentMatches.length > 0) {
                    await setSummonerCurrentMatchIdByPuuid(
                        account.puuid,
                        recentMatches[0]
                    );
                }
            }

            await addSummonerToGuild(
                guildId,
                account.puuid,
                interaction.user.id
            );

            await interaction.editReply(
                `Now tracking **${account.gameName}#${account.tagLine}** (${region}) in this server.`
            );
        } catch (error: any) {
            const status = error?.status ?? error?.statusCode;
            if (status === 404) {
                await interaction.editReply(
                    `Could not find summoner **${name}#${tag}** in region **${region}**. Check the name and tag and try again.`
                );
            } else {
                console.error('[/add] Error adding summoner:', error);
                await interaction.editReply(
                    'Something went wrong while looking up this summoner. Please try again later.'
                );
            }
        }
    },
};
