import type { MessageAdapter, MessagePayload } from '../../../core/pluginTypes';
import type { SummonerSummary } from '../types';
import {
    getChampionThumbnail,
    getRankedEmblem,
    rankColors,
} from '../presentation/leaguePresentation';
import { getOrdinal } from '../scoring/scoringAlgorithm';

const resultColors = new Map<string, number>([
    ['win', 0x28a745],
    ['lose', 0xe74c3c],
    ['remake', 0xe67e22],
]);

const roleQueues = [
    'Ranked Solo',
    'Normal Blind',
    'Ranked Flex',
    'Swiftplay',
    'Clash',
];

interface MatchEndMessageInput {
    summonerName: string;
    queueName: string;
    result: string;
    gameLengthSeconds: number;
    newRankMsg: string;
    lpChangeMsg: number;
    championDisplay: string;
    role: string;
    kdaStr: string;
    damage: number;
    deepLolLink: string;
    /** 1-based placement in this match (1 = best performer across all 10 players) */
    placement?: number;
    /** Total number of players scored (typically 10) */
    totalPlayers?: number;
    /** Raw AI score from the scoring algorithm */
    aiScore?: number;
}

interface RankChangeMessageInput {
    summonerName: string;
    direction: string;
    newRankMsg: string;
    lpChangeMsg: number;
    deepLolLink: string;
}

function formatGameLength(totalSeconds: number): string {
    const safeSeconds = Math.max(
        0,
        Number.isFinite(totalSeconds) ? totalSeconds : 0
    );
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = Math.floor(safeSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function buildMatchEndMessage({
    summonerName,
    queueName,
    result,
    gameLengthSeconds,
    newRankMsg,
    lpChangeMsg,
    championDisplay,
    role,
    kdaStr,
    damage,
    deepLolLink,
    placement,
    totalPlayers,
    aiScore,
}: MatchEndMessageInput): MessagePayload {
    const colorHex = resultColors.get(result.toLowerCase()) || 0x95a5a6;
    const fields = [
        { name: '🏁 **Result**', value: `**${result}**`, inline: true },
        {
            name: '🛡️ **Champion**',
            value: `**${championDisplay}**`,
            inline: true,
        },
        { name: '🕹️ **Queue**', value: `**${queueName}**`, inline: true },
    ];
    if (
        roleQueues.map((q) => q.toLowerCase()).includes(queueName.toLowerCase())
    ) {
        fields.push({
            name: '🎯 **Role**',
            value: `**${role}**`,
            inline: true,
        });
    }
    fields.push(
        { name: '⚔️ **KDA**', value: `**${kdaStr}**`, inline: true },
        { name: '💥 **Damage Dealt**', value: `**${damage}**`, inline: true }
    );
    if (placement != null && totalPlayers != null) {
        fields.push({
            name: '🏆 **Match Placement**',
            value: `**${getOrdinal(placement)}**`,
            inline: true,
        });
    }
    if (aiScore != null) {
        fields.push({
            name: '🤖 **AI Score**',
            value: `**${aiScore}**`,
            inline: true,
        });
    }
    if (queueName.toLowerCase().includes('ranked')) {
        fields.splice(
            1,
            0,
            {
                name: '📈 **Rank Update**',
                value: `**${newRankMsg}**`,
                inline: true,
            },
            {
                name: '🔄 **LP Change**',
                value: `**${lpChangeMsg} LP**`,
                inline: true,
            }
        );
    }
    return {
        title: '🎮 **Match Summary**',
        description: `${summonerName} has completed a match!`,
        url: deepLolLink,
        colorHex,
        thumbnailUrl: getChampionThumbnail(championDisplay),
        fields,
        footer: `Match Summary • Length ${formatGameLength(gameLengthSeconds)}`,
        timestamp: new Date().toISOString(),
    };
}

export function buildRankChangeMessage({
    summonerName,
    direction,
    newRankMsg,
    lpChangeMsg,
    deepLolLink,
}: RankChangeMessageInput): MessagePayload | null {
    const isPromotion = direction === 'promoted';
    const isDemotion = direction === 'demoted';
    const tier = newRankMsg.match(/(\w+)\s+\w+/)?.[1]?.toUpperCase() ?? '';
    const colorHex = rankColors.get(tier) || 0x3498db;
    const title = isPromotion
        ? '📈 **Rank Promotion!**'
        : isDemotion
          ? '📉 **Rank Demotion...**'
          : null;
    if (!colorHex || !title) return null;
    return {
        title,
        description: `${summonerName} has ${isPromotion ? 'ranked up!' : 'been demoted.'}`,
        url: deepLolLink,
        colorHex,
        thumbnailUrl: getRankedEmblem(tier) ?? undefined,
        fields: [
            {
                name: '🏆 **Rank Change**',
                value: `**${newRankMsg}**`,
                inline: true,
            },
            {
                name: '🔄 **LP Change**',
                value: `**${lpChangeMsg} LP**`,
                inline: true,
            },
        ],
        footer: 'Rank Change Notification',
        timestamp: new Date().toISOString(),
    };
}

function buildMissingDataMessage(
    summonerSummary: SummonerSummary
): MessagePayload {
    const {
        name,
        tier,
        rank,
        lp,
        totalGames,
        wins,
        losses,
        winRate,
        totalTimeInHours,
        mostPlayedChampion,
        averageDamageDealtToChampions,
        mostPlayedRole,
    } = summonerSummary;

    const colorHex = rankColors.get(rank) || 0x3498db;
    const title = `📊 ${name}'s Summary`;
    const description = `Missing data for ${name}.`;

    const fields = [
        {
            name: '🏅 **Rank**',
            value: `${tier} ${rank} (${lp} LP)`,
            inline: false,
        },
        {
            name: '🎮 **Missing Games Found**',
            value: `${totalGames}`,
            inline: false,
        },
        {
            name: '✅ **Wins / ❌ Losses**',
            value: `${wins} / ${losses}`,
            inline: false,
        },
        { name: '📈 **Win Rate**', value: `${winRate}%`, inline: false },
        { name: '⏱️ **Time Played**', value: totalTimeInHours, inline: false },
        {
            name: '💪 **Avg Damage**',
            value: averageDamageDealtToChampions,
            inline: false,
        },
        {
            name: '👑 **Most Played Champ**',
            value: `${mostPlayedChampion.name}`,
            inline: false,
        },
        { name: '🧭 **Fav Role**', value: mostPlayedRole, inline: false },
    ];

    return {
        title,
        description,
        colorHex,
        thumbnailUrl: getChampionThumbnail(mostPlayedChampion.name),
        fields,
        footer: 'Summoner Stats Overview',
        timestamp: new Date().toISOString(),
    };
}

async function sendWithAdapter(
    adapter: MessageAdapter | null | undefined,
    channelId: string | undefined,
    payload: MessagePayload,
    label: string
): Promise<boolean> {
    if (!adapter) {
        console.warn(
            `[Notification] No message adapter set; skipping ${label}.`
        );
        return true;
    }
    if (!channelId) {
        console.warn(
            `[Notification] Missing channelId; skipping ${label} message.`
        );
        return false;
    }
    try {
        await adapter.sendMessage({ channelId }, payload);
        return true;
    } catch (error) {
        console.error(
            `[Notification Error] Failed to send ${label} message:`,
            error
        );
        return false;
    }
}

interface NotifyMatchEnd extends MatchEndMessageInput {
    discordChannelId: string;
}

export async function notifyMatchEnd(
    adapter: MessageAdapter | null | undefined,
    { discordChannelId, ...payload }: NotifyMatchEnd
): Promise<boolean> {
    const message = buildMatchEndMessage(payload);
    return sendWithAdapter(adapter, discordChannelId, message, 'match end');
}

interface NotifyRankChange extends RankChangeMessageInput {
    discordChannelId: string;
}

export async function notifyRankChange(
    adapter: MessageAdapter | null | undefined,
    { discordChannelId, ...payload }: NotifyRankChange
): Promise<boolean> {
    const message = buildRankChangeMessage(payload);
    if (!message) return false;
    return sendWithAdapter(adapter, discordChannelId, message, 'rank change');
}

export async function notifyMissingData(
    adapter: MessageAdapter | null | undefined,
    summonerSummary: SummonerSummary
): Promise<boolean> {
    const message = buildMissingDataMessage(summonerSummary);
    return sendWithAdapter(
        adapter,
        summonerSummary.discordChannelId,
        message,
        'missing data'
    );
}
