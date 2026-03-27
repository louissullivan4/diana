import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { SlashCommand } from '../../../../discord/commandTypes';
import {
    createApexService,
    getApexRankEmblem,
    APEX_PLATFORMS,
} from 'diana-core';

const apexService = createApexService();

export const apexPredatorCommand: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName('apex-predator')
        .setDescription(
            'Show the current Apex Predator RP cut-off for each platform.'
        ),

    execute: async (interaction) => {
        await interaction.deferReply();

        try {
            const data = await apexService.getPredatorRanks();

            const predatorEmblem = getApexRankEmblem('Apex Predator');

            const embed = new EmbedBuilder()
                .setTitle('🔴 **Apex Predator Cut-off**')
                .setColor(0xe74c3c)
                .setDescription(
                    'Minimum RP required to reach Apex Predator on each platform.'
                )
                .setTimestamp()
                .setFooter({ text: 'Apex Legends' });

            if (predatorEmblem) {
                embed.setThumbnail(predatorEmblem);
            }

            for (const platform of APEX_PLATFORMS) {
                const entry = data.RP[platform];
                if (entry) {
                    embed.addFields({
                        name: `🖥️ **${platform}**`,
                        value: `**${entry.val.toLocaleString()} RP**`,
                        inline: true,
                    });
                }
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error('[/apex-predator] Error:', err);
            await interaction.editReply(
                'Failed to fetch predator data. Please try again later.'
            );
        }
    },
};
