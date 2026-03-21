import { SlashCommandBuilder } from 'discord.js';
import type { SlashCommand } from '../../../../discord/commandTypes';
import {
    getSummonersForGuild,
    removeSummonerFromGuild,
    type GuildSummonerRow,
} from 'diana-core';

export const removeSummonerCommand: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Stop tracking a summoner in this server.')
        .addStringOption((option) =>
            option
                .setName('name')
                .setDescription('Summoner game name.')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption((option) =>
            option
                .setName('tag')
                .setDescription('Summoner tagline (required if multiple with the same name).')
                .setRequired(false)
                .setAutocomplete(true)
        ),

    execute: async (interaction) => {
        const guildId = interaction.guildId;
        if (!guildId) {
            await interaction.reply({
                content: 'This command can only be used in a server.',
                ephemeral: true,
            });
            return;
        }

        const name = interaction.options.getString('name', true).trim();
        const tag = interaction.options.getString('tag')?.trim() ?? null;

        await interaction.deferReply({ ephemeral: true });

        try {
            const guildSummoners = await getSummonersForGuild(guildId);

            const matches = guildSummoners.filter((s: GuildSummonerRow) => {
                const nameMatch = s.gameName.toLowerCase() === name.toLowerCase();
                if (tag) {
                    return nameMatch && s.tagLine.toLowerCase() === tag.toLowerCase();
                }
                return nameMatch;
            });

            if (matches.length === 0) {
                await interaction.editReply(
                    `No tracked summoner found matching **${name}${tag ? `#${tag}` : ''}** in this server.`
                );
                return;
            }

            if (matches.length > 1) {
                const list = matches.map((s: GuildSummonerRow) => `• ${s.gameName}#${s.tagLine}`).join('\n');
                await interaction.editReply(
                    `Multiple summoners match **${name}**. Please re-run with a tag:\n${list}`
                );
                return;
            }

            const summoner = matches[0];
            await removeSummonerFromGuild(guildId, summoner.puuid);

            await interaction.editReply(
                `Stopped tracking **${summoner.gameName}#${summoner.tagLine}** in this server.`
            );
        } catch (error) {
            console.error('[/remove] Error removing summoner:', error);
            await interaction.editReply(
                'Something went wrong while removing this summoner. Please try again later.'
            );
        }
    },

    autocomplete: async (interaction) => {
        const guildId = interaction.guildId;
        if (!guildId) {
            await interaction.respond([]);
            return;
        }

        try {
            const focused = interaction.options.getFocused(true);
            const guildSummoners = await getSummonersForGuild(guildId);
            const focusedValue = focused.value.toString().toLowerCase();

            if (focused.name === 'name') {
                const allNames: string[] = guildSummoners.map((s: GuildSummonerRow) => s.gameName);
                const unique = [...new Set(allNames)];
                const filtered = unique
                    .filter((n: string) => n.toLowerCase().startsWith(focusedValue))
                    .slice(0, 25);
                await interaction.respond(filtered.map((n: string) => ({ name: n, value: n })));
                return;
            }

            if (focused.name === 'tag') {
                const selectedName = interaction.options.getString('name')?.toLowerCase();
                const tags: string[] = guildSummoners
                    .filter((s: GuildSummonerRow) => !selectedName || s.gameName.toLowerCase() === selectedName)
                    .map((s: GuildSummonerRow) => s.tagLine)
                    .filter((t: string) => t.toLowerCase().startsWith(focusedValue));
                const unique = [...new Set(tags)].slice(0, 25);
                await interaction.respond(unique.map((t: string) => ({ name: t, value: t })));
                return;
            }

            await interaction.respond([]);
        } catch (error) {
            console.error('[/remove autocomplete] Error:', error);
            try {
                if (!interaction.responded) await interaction.respond([]);
            } catch (_) {}
        }
    },
};
