import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { SlashCommand } from '../../../../core/pluginTypes';
import {
    getInterCandidatesLastWeek,
    type InterCandidate,
} from '../utils/interStats';

interface CategoryConfig {
    key:
        | 'avgDamage'
        | 'kdaRatio'
        | 'winRate'
        | 'matchesPlayed'
        | 'avgVisionScore';
    title: string;
    subtitle: string;
    emoji: string;
    sortDirection: 'asc' | 'desc';
}

interface CategoryWinner {
    config: CategoryConfig;
    winner: InterCandidate;
}

const numberFormatter = new Intl.NumberFormat('en-US');

function determineCategoryWinners(
    candidates: InterCandidate[]
): CategoryWinner[] {
    if (candidates.length === 0) return [];

    const categories: CategoryConfig[] = [
        {
            key: 'avgDamage',
            title: 'Least damage done',
            subtitle: '',
            emoji: '💥',
            sortDirection: 'asc',
        },
        {
            key: 'kdaRatio',
            title: 'Worst KDA',
            subtitle: '',
            emoji: '⚰️',
            sortDirection: 'asc',
        },
        {
            key: 'winRate',
            title: 'Lowest Winrate',
            subtitle: '',
            emoji: '📉',
            sortDirection: 'asc',
        },
        {
            key: 'matchesPlayed',
            title: 'Most Matches Played',
            subtitle: '',
            emoji: '🕒',
            sortDirection: 'desc',
        },
        {
            key: 'avgVisionScore',
            title: 'Worst vision score',
            subtitle: '',
            emoji: '👁️‍🗨️',
            sortDirection: 'asc',
        },
    ];

    const comparer = (
        a: InterCandidate,
        b: InterCandidate,
        key: CategoryConfig['key'],
        direction: CategoryConfig['sortDirection']
    ) => {
        const first = a[key] ?? 0;
        const second = b[key] ?? 0;

        if (first !== second) {
            const diff = first - second;
            return direction === 'asc' ? diff : -diff;
        }

        if (a.matchesPlayed !== b.matchesPlayed) {
            return b.matchesPlayed - a.matchesPlayed;
        }

        return a.displayName.localeCompare(b.displayName);
    };

    return categories
        .map((config) => {
            const eligible =
                config.key === 'winRate'
                    ? candidates.filter(
                          (candidate) => candidate.matchesPlayed >= 3
                      )
                    : candidates;

            if (eligible.length === 0) return null;

            const sorted = [...eligible].sort((a, b) =>
                comparer(a, b, config.key, config.sortDirection)
            );
            return {
                config,
                winner: sorted[0],
            };
        })
        .filter((entry): entry is CategoryWinner => entry !== null);
}

function formatNumber(value: number, fractionDigits = 0) {
    if (!Number.isFinite(value)) return '0';
    if (fractionDigits <= 0) {
        return numberFormatter.format(Math.round(value));
    }
    return value.toFixed(fractionDigits);
}

function buildCategoryValue(category: CategoryWinner) {
    const { config, winner } = category;
    const name = winner.deepLolLink
        ? `[${winner.displayName}](${winner.deepLolLink})`
        : winner.displayName;

    switch (config.key) {
        case 'avgDamage': {
            const damage = formatNumber(winner.avgDamage);
            return `${name} - ${damage} dmg per game across ${winner.matchesPlayed} match${winner.matchesPlayed === 1 ? '' : 'es'}.`;
        }
        case 'kdaRatio': {
            const kda = Number.isFinite(winner.kdaRatio)
                ? winner.kdaRatio.toFixed(2)
                : '0.00';
            return `${name} - KDA ${kda} (${winner.totalKills}/${winner.totalDeaths}/${winner.totalAssists}).`;
        }
        case 'winRate': {
            const winPercent = (winner.winRate * 100).toFixed(1);
            return `${name} - ${winPercent}% (${winner.wins}W-${winner.losses}L).`;
        }
        case 'matchesPlayed': {
            const games = formatNumber(winner.matchesPlayed);
            return `${name} - ${games} game${winner.matchesPlayed === 1 ? '' : 's'} in the last week.`;
        }
        case 'avgVisionScore': {
            const vision = formatNumber(winner.avgVisionScore, 1);
            return `${name} - Average vision score ${vision}.`;
        }
        default:
            return name;
    }
}

function buildEmbed(categories: CategoryWinner[]): EmbedBuilder {
    const tally = new Map<
        string,
        { candidate: InterCandidate; count: number }
    >();

    for (const { winner } of categories) {
        const existing = tally.get(winner.puuid);
        if (existing) {
            existing.count += 1;
        } else {
            tally.set(winner.puuid, { candidate: winner, count: 1 });
        }
    }

    const crownEntries: { candidate: InterCandidate; count: number }[] = [];
    tally.forEach((v) => crownEntries.push(v));
    const highestCount = crownEntries.reduce(
        (max, entry) => Math.max(max, entry.count),
        0
    );

    const crowned = crownEntries
        .filter((entry) => entry.count === highestCount && highestCount > 0)
        .map((entry) => entry.candidate);

    const crownNames = crowned.map((candidate) =>
        candidate.deepLolLink
            ? `[${candidate.displayName}](${candidate.deepLolLink})`
            : candidate.displayName
    );

    let description = '';

    if (crownNames.length === 0) {
        description =
            'No one earned the crown this time. Everyone dodged the inter spotlight!';
    } else if (crownNames.length === 1) {
        const crownCount = highestCount === 1 ? 'category' : 'categories';
        description = `**${crownNames[0]}** \nInter of the Week crowned by sweeping ${highestCount} ${crownCount} of shame.`;
    } else {
        const formattedNames = crownNames.join(' & ');
        const crownCount = highestCount === 1 ? 'category' : 'categories';
        description = `**${formattedNames}** \nInters of the Week crowned with ${highestCount} ${crownCount} each.`;
    }

    const embed = new EmbedBuilder()
        .setTitle('Inter Of the Week')
        .setDescription(description)
        .setColor(0xe74c3c)
        .setFooter({ text: 'Last week of matches' })
        .setTimestamp();

    const categoryLines = categories.map((category) => {
        const titleLine = `**${category.config.emoji} ${category.config.title}**`;
        const valueLine = buildCategoryValue(category);
        return `${titleLine}\n${valueLine}`;
    });

    embed.addFields({
        name: 'Stats',
        value: categoryLines.join('\n\n'),
    });

    return embed;
}

export const interOfTheWeekCommand: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName('iotw')
        .setDescription('Crowns the Inter of the Week from the past week.'),
    execute: async (interaction) => {
        await interaction.deferReply();

        try {
            const candidates = await getInterCandidatesLastWeek();

            if (candidates.length === 0) {
                await interaction.editReply(
                    'No matches found in the last 7 days. Nobody is inting—yet.'
                );
                return;
            }

            const categories = determineCategoryWinners(candidates);

            if (categories.length === 0) {
                await interaction.editReply(
                    'Not enough data to crown an Inter of the Week.'
                );
                return;
            }

            const embed = buildEmbed(categories);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to compute Inter of the Week:', error);
            await interaction.editReply(
                'Something went wrong while picking the Inter of the Week.'
            );
        }
    },
};
