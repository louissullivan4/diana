import {
    Client,
    EmbedBuilder,
    IntentsBitField,
    Message,
    MessagePayload,
} from 'discord.js';
import 'dotenv/config';
import { Summoner, SummonerSummary } from '../types';

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
    ],
});

let hasClientLoggedIn = false;

export const loginClient = async () => {
    if (hasClientLoggedIn) return;
    try {
        await client.login(process.env.DISCORD_BOT_TOKEN);
        hasClientLoggedIn = true;
    } catch (error) {
        console.error('Could not login to Discord client:', error);
        throw new Error('Could not login to Discord client.');
    }
};

const rankColors = new Map<string, number>([
    ['UNRANKED', 0x95a5a6],
    ['IRON', 0x7f8c8d],
    ['BRONZE', 0xcd7f32],
    ['SILVER', 0xc0c0c0],
    ['GOLD', 0xffd700],
    ['PLATINUM', 0x40e0d0],
    ['EMERALD', 0x50c878],
    ['DIAMOND', 0xb9f2ff],
    ['MASTER', 0x800080],
    ['GRANDMASTER', 0x8b0000],
    ['CHALLENGER', 0x1e90ff],
]);

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

function getChampionThumbnail(championName: string) {
    const sanitized = championName.replace(/\s+/g, '');
    return `https://ddragon.leagueoflegends.com/cdn/15.2.1/img/champion/${encodeURIComponent(
        sanitized
    )}.png`;
}

function getRankedEmblem(tier: string) {
    if (!tier) return null;
    const sanitized = tier.replace(/\s+/g, '').toString().toLowerCase();
    return `https://raw.githubusercontent.com/louissullivan4/diana/refs/heads/main/assets/ranked-emblem/${sanitized}.webp`;
}

interface MessageBody {
    embeds: [EmbedBuilder];
}

export const sendDiscordMessage = async (
    channelId: string,
    message: MessageBody
) => {
    if (!channelId) {
        if (process.env.DISCORD_CHANNEL_ID) {
            channelId = process.env.DISCORD_CHANNEL_ID;
        } else {
            throw new Error('Channel ID not provided.');
        }
    }
    if (!message) throw new Error('Message content not provided.');
    const channel = await client.channels.fetch(channelId);
    if (!channel) throw new Error(`Channel with ID ${channelId} not found.`);
    if (channel.isSendable()) {
        channel.send(message);
    }
};


export function createMatchEndEmbed(
    summonerName: string,
    queueName: string,
    result: string,
    newRankMsg: string,
    lpChangeMsg: number,
    championDisplay: string,
    role: string,
    kdaStr: string,
    damage: number,
    deepLolLink: string
) {
    const embedColor = resultColors.get(result.toLowerCase()) || 0x95a5a6;
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
    return new EmbedBuilder()
        .setTitle('🎮 **Match Summary**')
        .setDescription(`${summonerName} has completed a match!`)
        .setURL(deepLolLink)
        .setColor(embedColor)
        .setThumbnail(getChampionThumbnail(championDisplay))
        .addFields(fields)
        .setTimestamp()
        .setFooter({ text: 'Match Summary' });
}

export function createRankChangeEmbed(
    summonerName: string,
    direction: string,
    newRankMsg: string,
    lpChangeMsg: number,
    deepLolLink: string
) {
    const isPromotion = direction === 'promoted';
    const isDemotion = direction === 'demoted';
    const tier = newRankMsg.match(/(\w+)\s+\w+/)?.[1]?.toUpperCase() ?? '';
    const embedColor = rankColors.get(tier) || 0x3498db;
    const title = isPromotion
        ? '📈 **Rank Promotion!**'
        : isDemotion
          ? '📉 **Rank Demotion...**'
          : null;
    if (!embedColor || !title) return null;
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(
            `${summonerName} has ${isPromotion ? 'ranked up!' : 'been demoted.'}`
        )
        .setURL(deepLolLink)
        .setColor(embedColor)
        .setThumbnail(getRankedEmblem(tier))
        .addFields(
            {
                name: '🏆 **Rank Change**',
                value: `**${newRankMsg}**`,
                inline: true,
            },
            {
                name: '🔄 **LP Change**',
                value: `**${lpChangeMsg} LP**`,
                inline: true,
            }
        )
        .setTimestamp()
        .setFooter({ text: 'Rank Change Notification' });
}


interface NotifyMatchEnd {
    summonerName: string;
    queueName: string;
    result: string;
    newRankMsg: string;
    lpChangeMsg: number;
    championDisplay: string;
    role: string;
    kdaStr: string;
    damage: number;
    discordChannelId: string;
    deepLolLink: string;
}
export async function notifyMatchEnd({
    summonerName,
    queueName,
    result,
    newRankMsg,
    lpChangeMsg,
    championDisplay,
    role,
    kdaStr,
    damage,
    discordChannelId,
    deepLolLink,
}: NotifyMatchEnd) {
    const embed = createMatchEndEmbed(
        summonerName,
        queueName,
        result,
        newRankMsg,
        lpChangeMsg,
        championDisplay,
        role,
        kdaStr,
        damage,
        deepLolLink
    );
    try {
        await sendDiscordMessage(discordChannelId, { embeds: [embed] });
        console.log(
            `[Notification] Sent match end message for ${summonerName}.`
        );
        return true;
    } catch (error) {
        console.error(
            `[Notification Error] Could not send message for ${summonerName}:`,
            error
        );
        return false;
    }
}

interface NotifyRankChange {
    summonerName: string;
    direction: string;
    newRankMsg: string;
    lpChangeMsg: number;
    discordChannelId: string;
    deepLolLink: string;
}

export async function notifyRankChange({
    summonerName,
    direction,
    newRankMsg,
    lpChangeMsg,
    discordChannelId,
    deepLolLink,
}: NotifyRankChange) {
    const embed = createRankChangeEmbed(
        summonerName,
        direction,
        newRankMsg,
        lpChangeMsg,
        deepLolLink
    );
    if (!embed) return;
    try {
        await sendDiscordMessage(discordChannelId, { embeds: [embed] });
        console.log(
            `[Notification] Sent rank change message for ${summonerName}.`
        );
    } catch (error) {
        console.error(
            `[Notification Error] Could not send rank change message for ${summonerName}:`,
            error
        );
    }
}

export function createNotifyMissingDataEmbed(summonerSummary: SummonerSummary) {
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

    const embedColor = rankColors.get(rank) || 0x3498db;
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

    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(embedColor)
        .setThumbnail(getChampionThumbnail(mostPlayedChampion.name))
        .addFields(fields)
        .setTimestamp()
        .setFooter({ text: 'Summoner Stats Overview' });
}

export async function notifyMissingData(summonerSummary: SummonerSummary) {
    const embed = createNotifyMissingDataEmbed(summonerSummary);
    if (!embed) return;
    try {
        await sendDiscordMessage(summonerSummary.discordChannelId, {
            embeds: [embed],
        });
        console.log(
            `[Notification] Sent notify missing data message for ${summonerSummary.name}.`
        );
    } catch (error) {
        console.error(
            `[Notification Error] Could not notify missing data message for ${summonerSummary.name}:`,
            error
        );
    }
}
