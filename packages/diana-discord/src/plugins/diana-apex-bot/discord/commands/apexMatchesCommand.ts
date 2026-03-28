import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { SlashCommand } from '../../../../discord/commandTypes';
import {
    searchApexPlayerNames,
    getApexPlayerUidByName,
    getRecentApexMatches,
    formatMatchHistory,
} from 'diana-core';

export const apexMatchesCommand: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName('apex-matches')
        .setDescription(
            'Show recent match history for a tracked Apex Legends player.'
        )
        .addStringOption((opt) =>
            opt
                .setName('name')
                .setDescription('Player name.')
                .setRequired(true)
                .setAutocomplete(true)
        ) as SlashCommandBuilder,

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
        await interaction.deferReply();

        try {
            const uid = await getApexPlayerUidByName(name);
            if (!uid) {
                await interaction.editReply(
                    `Player **${name}** is not being tracked.`
                );
                return;
            }

            const matches = await getRecentApexMatches(uid, 10);
            if (matches.length === 0) {
                await interaction.editReply(
                    `No match history recorded yet for **${name}**.`
                );
                return;
            }

            const lines = formatMatchHistory(matches);

            const embed = new EmbedBuilder()
                .setTitle(`🔫 **${name} - Recent Matches**`)
                .setColor(0xe74c3c)
                .setTimestamp()
                .setFooter({ text: 'Apex Legends' });

            for (const line of lines) {
                const rpSign = line.rpChange > 0 ? '+' : '';
                embed.addFields({
                    name: `${line.result}  •  **${line.legend}**  •  ${line.dateDisplay}`,
                    value: `⚔️ **${line.kills}** kills  •  💥 **${line.damage.toLocaleString()}** dmg  •  🔄 **${rpSign}${line.rpChange} RP**  •  ⏱️ ${line.durationDisplay}`,
                    inline: false,
                });
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error('[/apex-matches] Error:', err);
            await interaction.editReply(
                'Failed to fetch match history. Please try again later.'
            );
        }
    },
};
