import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Constants } from 'twisted';
import type { SlashCommand } from '../commandService';
import {
    getSummonerByAccountName,
    searchSummonerGameNames,
    searchSummonerTags,
} from '../../api/summoners/summonerService';
import { db } from '../../api/utils/db';
import {
    getQueueNameById,
    fetchChampionData,
} from '../../api/utils/dataDragonService';
import { calculateWinRatePercentage } from '../../api/utils/rankService';

interface RiotParticipant {
    puuid: string;
    championName?: string;
    kills?: number;
    deaths?: number;
    assists?: number;
    win?: boolean;
    totalDamageDealtToChampions?: number;
    totalMinionsKilled?: number;
    neutralMinionsKilled?: number;
    goldEarned?: number;
    riotIdGameName?: string;
    riotIdTagline?: string;
}

interface RawMatchRow {
    matchId: string;
    queueId: number | null;
    gameDuration: number | null;
    gameCreation: number | string | null;
    participants: unknown;
}

interface ParsedMatch {
    id: string;
    queueId: number;
    duration: number;
    createdAt: number;
    participant: RiotParticipant;
}

interface ChampionSummary {
    games: number;
    wins: number;
    losses: number;
    remakes: number;
    killsAvg: number;
    deathsAvg: number;
    assistsAvg: number;
    kdaRatio: number;
    csPerMin: number;
    damageAvg: number;
    goldAvg: number;
    bestDamage?: { amount: number; queueId: number; kda: string };
}

const CHAMPION_ICON_VERSION = '15.2.1';

function normalizeChampionString(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function resolveChampionMeta(championInput: string) {
    const champions = await fetchChampionData();
    const normalizedInput = normalizeChampionString(championInput);

    const entries = Object.values(champions) as Array<{
        id: string;
        name: string;
    }>;

    // Exact or contains match on id or display name
    const direct = entries.find((champ) => {
        const idNorm = normalizeChampionString(champ.id);
        const nameNorm = normalizeChampionString(champ.name);
        return (
            normalizedInput === idNorm ||
            normalizedInput === nameNorm ||
            normalizedInput.includes(idNorm) ||
            idNorm.includes(normalizedInput)
        );
    });

    if (direct) return direct;

    // Fallback: partial match on display name
    const partial = entries.find((champ) =>
        normalizeChampionString(champ.name).includes(normalizedInput)
    );

    return partial ?? null;
}

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

function getResult(participant: RiotParticipant, duration: number) {
    if (duration > 0 && duration < 300) return 'REMAKE';
    return participant.win ? 'WIN' : 'LOSS';
}

function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

function buildChampionIconUrl(championId: string) {
    const sanitized = championId.replace(/\s+/g, '');
    return `https://ddragon.leagueoflegends.com/cdn/${CHAMPION_ICON_VERSION}/img/champion/${encodeURIComponent(
        sanitized
    )}.png`;
}

async function fetchChampionMatches(
    puuid: string,
    championName: string
): Promise<ParsedMatch[]> {
    const query = `
        SELECT "matchId", "queueId", "gameDuration", "participants", "gameCreation"
        FROM match_details
        WHERE "entryPlayerPuuid" = $1
          AND EXISTS (
              SELECT 1
              FROM jsonb_array_elements("participants") AS p(elem)
              WHERE (p.elem->>'puuid') = $1
                AND LOWER(p.elem->>'championName') = LOWER($2)
          )
        ORDER BY "gameCreation" DESC
    `;
    const params = [puuid, championName];
    const result = await db.query(query, params);

    return result.rows
        .map((row) => {
            const parsedParticipants = parseParticipants(
                (row as RawMatchRow).participants
            );
            const participant = parsedParticipants.find(
                (p) =>
                    p.puuid === puuid &&
                    (p.championName ?? '').toLowerCase() ===
                        championName.toLowerCase()
            );
            if (!participant) return null;
            return {
                id: (row as RawMatchRow).matchId,
                queueId: toNumber((row as RawMatchRow).queueId),
                duration: toNumber((row as RawMatchRow).gameDuration),
                createdAt: toNumber((row as RawMatchRow).gameCreation),
                participant,
            } satisfies ParsedMatch;
        })
        .filter((match): match is ParsedMatch => Boolean(match));
}

function summarizeMatches(matches: ParsedMatch[]): ChampionSummary {
    const totals = matches.reduce<ChampionSummary>(
        (acc, match) => {
            const p = match.participant;
            const kills = toNumber(p.kills);
            const deaths = toNumber(p.deaths);
            const assists = toNumber(p.assists);
            const damage = toNumber(p.totalDamageDealtToChampions);
            const cs =
                toNumber(p.totalMinionsKilled) +
                toNumber(p.neutralMinionsKilled);
            const gold = toNumber(p.goldEarned);
            const result = getResult(p, match.duration);

            acc.games += 1;
            if (result === 'WIN') acc.wins += 1;
            else if (result === 'LOSS') acc.losses += 1;
            else acc.remakes += 1;

            acc.killsAvg += kills;
            acc.deathsAvg += deaths;
            acc.assistsAvg += assists;
            acc.damageAvg += damage;
            acc.goldAvg += gold;
            acc.csPerMin += match.duration > 0 ? cs / (match.duration / 60) : 0;

            const formattedKda = `${kills}/${deaths}/${assists}`;

            if (!acc.bestDamage || damage > acc.bestDamage.amount) {
                acc.bestDamage = {
                    amount: damage,
                    queueId: match.queueId,
                    kda: formattedKda,
                };
            }

            return acc;
        },
        {
            games: 0,
            wins: 0,
            losses: 0,
            remakes: 0,
            killsAvg: 0,
            deathsAvg: 0,
            assistsAvg: 0,
            kdaRatio: 0,
            csPerMin: 0,
            damageAvg: 0,
            goldAvg: 0,
            bestDamage: undefined,
        }
    );

    if (totals.games > 0) {
        totals.killsAvg /= totals.games;
        totals.deathsAvg /= totals.games;
        totals.assistsAvg /= totals.games;
        totals.damageAvg /= totals.games;
        totals.goldAvg /= totals.games;
        totals.csPerMin /= totals.games;
        totals.kdaRatio =
            totals.deathsAvg === 0
                ? totals.killsAvg + totals.assistsAvg
                : (totals.killsAvg + totals.assistsAvg) / totals.deathsAvg;
    }

    return totals;
}

function formatRecentMatches(matches: ParsedMatch[]) {
    const recent = matches.slice(0, 3);
    if (recent.length === 0) return 'No recorded games on this champion yet.';

    return recent
        .map((match) => {
            const { participant } = match;
            const result = getResult(participant, match.duration);
            const queueName = getQueueNameById(match.queueId);
            const kda = `${toNumber(participant.kills)}/${toNumber(participant.deaths)}/${toNumber(
                participant.assists
            )}`;
            return `- ${formatDate(match.createdAt)} | ${queueName} | ${result} | ${kda}`;
        })
        .join('\n');
}

function formatNumber(value: number, fractionDigits = 0) {
    if (!Number.isFinite(value)) return '0';
    const formatter = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: fractionDigits,
        minimumFractionDigits: fractionDigits,
    });
    return formatter.format(value);
}

export const championStatsCommand: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName('champion')
        .setDescription(
            "View a tracked summoner's performance on a specific champion."
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
        .addStringOption((option) =>
            option
                .setName('champion')
                .setDescription('Champion name (e.g. Ahri).')
                .setRequired(true)
                .setAutocomplete(true)
        ),
    execute: async (interaction) => {
        const name = interaction.options.getString('name', true);
        const tag = interaction.options.getString('tag', true);
        const championInput = interaction.options.getString('champion', true);

        await interaction.deferReply();

        try {
            const summonerRecord = await getSummonerByAccountName(
                name,
                tag,
                Constants.Regions.EU_WEST
            );

            if (!summonerRecord || (summonerRecord as any).msg) {
                await interaction.editReply(
                    `Could not find **${name}#${tag}** in the tracked summoners list.`
                );
                return;
            }

            const { puuid, gameName, tagLine, deepLolLink } =
                summonerRecord as any;

            const resolvedChampion = await resolveChampionMeta(championInput);
            const searchChampion = resolvedChampion?.id ?? championInput;
            const displayChampion = resolvedChampion?.name ?? championInput;

            const championMatches = await fetchChampionMatches(
                puuid,
                searchChampion
            );

            if (championMatches.length === 0) {
                await interaction.editReply(
                    `No recorded matches found for **${gameName}#${tagLine}** on **${displayChampion}**.`
                );
                return;
            }

            const summary = summarizeMatches(championMatches);
            const winRate = calculateWinRatePercentage(
                summary.wins,
                summary.losses
            );
            const recentGames = formatRecentMatches(championMatches);

            const embed = new EmbedBuilder()
                .setTitle(
                    `Champion Stats - ${gameName}#${tagLine} on ${displayChampion}`
                )
                .setDescription(
                    deepLolLink
                        ? `[View on DeepLOL](${deepLolLink})`
                        : 'Performance from stored matches.'
                )
                .setColor(0x9b59b6)
                .addFields(
                    {
                        name: 'Overview',
                        value: `Games: ${summary.games} (W:${summary.wins} / L:${summary.losses}${
                            summary.remakes ? ` / R:${summary.remakes}` : ''
                        })\nWin rate: ${
                            winRate === null ? 'N/A' : `${winRate.toFixed(1)}%`
                        }`,
                        inline: false,
                    },
                    {
                        name: 'Performance',
                        value: `Avg K/D/A: ${formatNumber(
                            summary.killsAvg,
                            1
                        )}/${formatNumber(summary.deathsAvg, 1)}/${formatNumber(
                            summary.assistsAvg,
                            1
                        )}\nKDA Ratio: ${formatNumber(
                            summary.kdaRatio,
                            2
                        )}\nCS per minute: ${formatNumber(
                            summary.csPerMin,
                            2
                        )}`,
                        inline: false,
                    },
                    {
                        name: 'Damage & Economy',
                        value: `Avg damage: ${formatNumber(
                            summary.damageAvg
                        )}\nAvg gold: ${formatNumber(
                            summary.goldAvg
                        )}\nBest damage: ${
                            summary.bestDamage
                                ? `${formatNumber(
                                      summary.bestDamage.amount
                                  )} in ${getQueueNameById(
                                      summary.bestDamage.queueId
                                  )} (${summary.bestDamage.kda})`
                                : 'N/A'
                        }`,
                        inline: false,
                    },
                    {
                        name: 'Recent Games',
                        value: recentGames,
                        inline: false,
                    }
                )
                .setThumbnail(
                    buildChampionIconUrl(
                        resolvedChampion?.id ?? displayChampion
                    )
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to build champion stats response:', error);
            await interaction.editReply(
                'Something went wrong while fetching champion stats. Please try again later.'
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

            if (focused.name === 'champion') {
                const champions = await fetchChampionData();
                const search = focusedValue.trim().toLowerCase();
                const matches = Object.values(champions)
                    .map((champ: any) => champ.name as string)
                    .filter((name) => name.toLowerCase().includes(search || ''))
                    .slice(0, 25);

                await interaction.respond(
                    matches.map((champion) => ({
                        name: champion,
                        value: champion,
                    }))
                );
                return;
            }

            await interaction.respond([]);
        } catch (error) {
            console.error(
                'Failed to provide autocomplete suggestions for champion command:',
                error
            );
            try {
                if (!interaction.responded) {
                    await interaction.respond([]);
                }
            } catch (respondError) {
                console.error(
                    'Failed to send fallback autocomplete response for champion command:',
                    respondError
                );
            }
        }
    },
};
