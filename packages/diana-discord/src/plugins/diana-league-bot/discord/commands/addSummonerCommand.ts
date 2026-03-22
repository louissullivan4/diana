import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { Constants } from 'twisted';
import type { SlashCommand } from '../../../../discord/commandTypes';
import {
    createLolService,
    getSummonerByPuuid,
    createSummoner,
    addSummonerToGuild,
    isSummonerInGuild,
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
    [Constants.Regions.NA_1]: {
        matchRegionPrefix: 'NA1',
        regionGroup: 'AMERICAS',
    },
    [Constants.Regions.LA_1]: {
        matchRegionPrefix: 'LA1',
        regionGroup: 'AMERICAS',
    },
    [Constants.Regions.LA_2]: {
        matchRegionPrefix: 'LA2',
        regionGroup: 'AMERICAS',
    },
    [Constants.Regions.KR]: { matchRegionPrefix: 'KR', regionGroup: 'ASIA' },
    [Constants.Regions.JP_1]: { matchRegionPrefix: 'JP1', regionGroup: 'ASIA' },
    [Constants.Regions.BR_1]: {
        matchRegionPrefix: 'BR1',
        regionGroup: 'AMERICAS',
    },
    [Constants.Regions.TR_1]: {
        matchRegionPrefix: 'TR1',
        regionGroup: 'EUROPE',
    },
    [Constants.Regions.RU]: { matchRegionPrefix: 'RU', regionGroup: 'EUROPE' },
    [Constants.Regions.OC_1]: { matchRegionPrefix: 'OC1', regionGroup: 'SEA' },
    [Constants.Regions.SG_2]: { matchRegionPrefix: 'SG2', regionGroup: 'SEA' },
    [Constants.Regions.TW_2]: { matchRegionPrefix: 'TW2', regionGroup: 'SEA' },
    [Constants.Regions.VN_2]: { matchRegionPrefix: 'VN2', regionGroup: 'SEA' },
    [Constants.Regions.ME_1]: {
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

const buildDeepLolLink = (gameName: string, tagLine: string) =>
    `https://www.deeplol.gg/summoner/euw/${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}`;

export const addSummonerCommand: SlashCommand = {
    data: (() => {
        const builder = new SlashCommandBuilder()
            .setName('add')
            .setDescription('Add a summoner to track in this server.')
            .addStringOption((option) =>
                option
                    .setName('name')
                    .setDescription(
                        'Summoner game name (no tag, e.g. FM Stew).'
                    )
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName('tag')
                    .setDescription('Summoner tagline (e.g. RATS).')
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
            // Resolve account via Riot API
            const account = await lolService.getAccountByRiotId(
                name,
                tag,
                meta.regionGroup as any
            );

            // Check if already tracked in this guild
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

            // Upsert summoner in global summoners table
            const existing = await getSummonerByPuuid(account.puuid);
            const isNew = !existing;
            if (isNew) {
                const deepLolLink = buildDeepLolLink(
                    account.gameName,
                    account.tagLine
                );
                await createSummoner({
                    puuid: account.puuid,
                    gameName: account.gameName,
                    tagLine: account.tagLine,
                    region,
                    matchRegionPrefix: meta.matchRegionPrefix,
                    regionGroup: meta.regionGroup,
                    deepLolLink,
                    tier: 'UNRANKED',
                    rank: 'N/A',
                    lp: 0,
                    discordChannelId: undefined,
                });
            }

            // Link to this guild
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
