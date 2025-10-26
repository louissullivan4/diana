import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Constants } from 'twisted';
import type { SlashCommand } from '../commandService';
import {
    getSummonerByAccountName,
    searchSummonerGameNames,
    searchSummonerTags,
    getMostRecentRankByParticipantIdAndQueueType,
} from '../../api/summoners/summonerService';
import { db } from '../../api/utils/db';
import { calculateWinRatePercentage } from '../../api/utils/rankService';
import { createLolService } from '../../api/utils/lolService/lolServiceFactory';
import { getQueueNameById } from '../../api/utils/dataDragonService';
import { rankColors, getRankedEmblem } from '../discordService';

const lolService = createLolService();

type QueueResult = 'WIN' | 'LOSS' | 'REMAKE';

interface RawMatchRow {
    matchId: string;
    gameCreation: number | string | null;
    queueId: number | null;
    gameDuration: number | null;
    participants: unknown;
}

interface RiotParticipant {
    puuid: string;
    riotIdGameName?: string;
    riotIdTagline?: string;
    summonerName?: string;
    summonerLevel?: number;
    championName?: string;
    kills?: number;
    deaths?: number;
    assists?: number;
    win?: boolean;
    totalDamageDealtToChampions?: number;
    teamPosition?: string;
    individualPosition?: string;
    queueId?: number | string;
}

interface ParsedMatch {
    id: string;
    createdAt: number;
    queueId: number;
    duration: number;
    participant: RiotParticipant;
}

interface YearlyStats {
    wins: number;
    losses: number;
    remakes: number;
}

const regionChoices = Object.entries(Constants.Regions)
    .map(([label, value]) => ({ label, value }))
    .filter(
        (choice, index, self) =>
            self.findIndex((entry) => entry.value === choice.value) === index
    )
    .slice(0, 25);

function parseParticipants(
    raw: RawMatchRow['participants']
): RiotParticipant[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as RiotParticipant[];
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? (parsed as RiotParticipant[]) : [];
        } catch {
            return [];
        }
    }
    return raw as RiotParticipant[];
}

function toNumber(value: number | string | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function getResult(
    participant: RiotParticipant,
    duration: number
): QueueResult {
    if (duration > 0 && duration < 300) return 'REMAKE';
    return participant.win ? 'WIN' : 'LOSS';
}

function getResultIcon(result: QueueResult) {
    switch (result) {
        case 'WIN':
            return '🟢 Win';
        case 'LOSS':
            return '🔴 Loss';
        default:
            return '🟠 Remake';
    }
}

function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

async function fetchRecentMatches(puuid: string): Promise<ParsedMatch[]> {
    const since = Date.now() - ONE_WEEK_IN_MS;

    const query = `
        SELECT "matchId", "gameCreation", "gameDuration", "queueId", "participants"
        FROM match_details
        WHERE "entryPlayerPuuid" = $1
          AND "gameCreation" >= $2
        ORDER BY "gameCreation" DESC
    `;
    const params = [puuid, since];
    const result = await db.query(query, params);

    return result.rows
        .map((row) => {
            const parsed = parseParticipants((row as RawMatchRow).participants);
            const participant = parsed.find((p) => p.puuid === puuid);
            if (!participant) return null;
            return {
                id: (row as RawMatchRow).matchId,
                createdAt: toNumber((row as RawMatchRow).gameCreation),
                queueId: toNumber((row as RawMatchRow).queueId),
                duration: toNumber((row as RawMatchRow).gameDuration),
                participant,
            } satisfies ParsedMatch;
        })
        .filter((match): match is ParsedMatch => Boolean(match));
}

function summarizePeriod(matches: ParsedMatch[]): YearlyStats {
    return matches.reduce<YearlyStats>(
        (acc, match) => {
            const result = getResult(match.participant, match.duration);
            if (result === 'WIN') acc.wins += 1;
            else if (result === 'LOSS') acc.losses += 1;
            else acc.remakes += 1;
            return acc;
        },
        { wins: 0, losses: 0, remakes: 0 }
    );
}

function buildRecentMatches(matches: ParsedMatch[]) {
    const recent = matches.slice(0, 3);
    if (recent.length === 0) {
        return 'No recorded matches in the last 7 days.';
    }

    return recent
        .map((match) => {
            const { participant } = match;
            const result = getResult(participant, match.duration);
            const queueName = getQueueNameById(match.queueId);
            const kda = `${participant.kills ?? 0}/${participant.deaths ?? 0}/${participant.assists ?? 0}`;
            const champion = participant.championName ?? 'Unknown';
            return `• ${formatDate(match.createdAt)} · ${queueName} · ${getResultIcon(result)} · ${champion} ${kda}`;
        })
        .join('\n');
}

function formatWinRate(stats: YearlyStats) {
    const winRate = calculateWinRatePercentage(stats.wins, stats.losses);
    return winRate !== null ? winRate.toFixed(1) : 'N/A';
}

export const summonerInfoCommand: SlashCommand = {
    data: (() => {
        const builder = new SlashCommandBuilder()
            .setName('summoner')
            .setDescription(
                'Displays a detailed profile for a tracked summoner.'
            )
            .addStringOption((option) =>
                option
                    .setName('name')
                    .setDescription('Summoner game name (no tag).')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addStringOption((option) =>
                option
                    .setName('tag')
                    .setDescription('Summoner tagline (e.g. EUW).')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addStringOption((option) => {
                option
                    .setName('region')
                    .setDescription('Riot platform region.')
                    .setRequired(false);
                for (const choice of regionChoices) {
                    option.addChoices({
                        name: choice.label,
                        value: choice.value,
                    });
                }
                return option;
            });

        return builder;
    })(),
    execute: async (interaction) => {
        const name = interaction.options.getString('name', true);
        const tag = interaction.options.getString('tag', true);
        const region =
            interaction.options.getString('region') ||
            Constants.Regions.EU_WEST;

        await interaction.deferReply();

        try {
            const summonerRecord = await getSummonerByAccountName(
                name,
                tag,
                region
            );

            if (!summonerRecord || (summonerRecord as any).msg) {
                await interaction.editReply(
                    `Could not find **${name}#${tag}** in region ${region}.`
                );
                return;
            }

            const { puuid, gameName, tagLine, tier, rank, lp, deepLolLink } =
                summonerRecord as any;

            const [matches, rankEntries] = await Promise.all([
                fetchRecentMatches(puuid),
                lolService.getRankEntriesByPUUID(puuid),
            ]);

            const soloRank = await getMostRecentRankByParticipantIdAndQueueType(
                puuid,
                'RANKED_SOLO_5x5'
            );

            const {
                tier: soloTier,
                rank: soloDivision,
                lp: soloLp,
                ...soloRankRest
            } = soloRank ?? {};

            const displaySoloRank = {
                ...soloRankRest,
                tier: soloTier ?? 'UNRANKED',
                rank: soloDivision ?? 'N/A',
                lp: soloLp ?? 0,
            };

            const flexRank = await getMostRecentRankByParticipantIdAndQueueType(
                puuid,
                'RANKED_FLEX_SR'
            );

            const {
                tier: flexTier,
                rank: flexDivision,
                lp: flexLp,
                ...flexRankRest
            } = flexRank ?? {};

            const displayFlexRank = {
                ...flexRankRest,
                tier: flexTier ?? 'UNRANKED',
                rank: flexDivision ?? 'N/A',
                lp: flexLp ?? 0,
            };

            let embedTier = displaySoloRank.tier;
            if (displaySoloRank.tier === 'UNRANKED') {
                embedTier = displayFlexRank.tier;
            }

            const stats = summarizePeriod(matches);
            const weeklyWinRate = formatWinRate(stats);
            const recentMatches = buildRecentMatches(matches);

            const levelSource = matches[0]?.participant.summonerLevel;

            const embedColor = rankColors.get(embedTier) || 0x3498db;
            const emblem = getRankedEmblem(embedTier);

            const embed = new EmbedBuilder()
                .setTitle(`Summoner Info — ${gameName}#${tagLine}`)
                .setDescription(
                    deepLolLink
                        ? `[View on DeepLOL](${deepLolLink})`
                        : 'Tracked summoner overview.'
                )
                .setColor(embedColor)
                .addFields(
                    {
                        name: 'Profile',
                        value: `• Region: **${region}**\n• Account Level: **${levelSource ?? '0'}**`,
                        inline: false,
                    },
                    {
                        name: 'Ranked Solo/Duo',
                        value: `• ${displaySoloRank.tier} ${displaySoloRank.rank} (${displaySoloRank.lp} LP)`,
                        inline: false,
                    },
                    {
                        name: 'Ranked Flex',
                        value: `• ${displayFlexRank.tier} ${displayFlexRank.rank} (${displayFlexRank.lp} LP)`,
                        inline: false,
                    },
                    {
                        name: 'Performance (Last 7 Days)',
                        value: `• Record: ${stats.wins}W - ${stats.losses}L${stats.remakes ? ` (${stats.remakes} remakes)` : ''}\n• Win Rate: ${
                            weeklyWinRate === 'N/A'
                                ? 'N/A'
                                : `${weeklyWinRate}%`
                        }`,
                        inline: false,
                    },
                    {
                        name: 'Recent Matches',
                        value: recentMatches,
                        inline: false,
                    }
                )
                .setTimestamp();

            if (emblem) {
                embed.setThumbnail(emblem);
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to build summoner info response:', error);
            await interaction.editReply(
                'Something went wrong while fetching this summoner. Please try again later.'
            );
        }
    },
    autocomplete: async (interaction) => {
        try {
            const focused = interaction.options.getFocused(true);
            const focusedValue =
                typeof focused.value === 'string' ? focused.value : '';

            if (focused.name === 'name') {
                const names = await searchSummonerGameNames(focusedValue, 25);
                await interaction.respond(
                    names.map((gameName) => ({
                        name: gameName,
                        value: gameName,
                    }))
                );
                return;
            }

            if (focused.name === 'tag') {
                const selectedName = interaction.options.getString('name');
                const tags = await searchSummonerTags(
                    selectedName,
                    focusedValue,
                    25
                );
                await interaction.respond(
                    tags.map(({ tagLine, matchRegionPrefix }) => ({
                        name: matchRegionPrefix
                            ? `${tagLine} (${matchRegionPrefix})`
                            : tagLine,
                        value: tagLine,
                    }))
                );
                return;
            }

            await interaction.respond([]);
        } catch (error) {
            console.error(
                'Failed to provide autocomplete suggestions for summoner command:',
                error
            );
            try {
                if (!interaction.responded) {
                    await interaction.respond([]);
                }
            } catch (respondError) {
                console.error(
                    'Failed to send fallback autocomplete response for summoner command:',
                    respondError
                );
            }
        }
    },
};
