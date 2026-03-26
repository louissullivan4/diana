import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { SlashCommand } from '../../../../discord/commandTypes';
import { createApexService, APEX_PLATFORMS } from 'diana-core';

const apexService = createApexService();
const platformChoices = APEX_PLATFORMS.map((p) => ({ name: p, value: p }));

export const apexUidCommand: SlashCommand = {
    data: (() => {
        const builder = new SlashCommandBuilder()
            .setName('apex-uid')
            .setDescription(
                'Look up an Apex UID by name. Use this when /apex-add fails to find a player.'
            )
            .addStringOption((opt) =>
                opt
                    .setName('name')
                    .setDescription('Player name to search for.')
                    .setRequired(true)
            )
            .addStringOption((opt) => {
                opt.setName('platform')
                    .setDescription('Platform (default: PC).')
                    .setRequired(false);
                for (const c of platformChoices) {
                    opt.addChoices({ name: c.name, value: c.value });
                }
                return opt;
            });
        return builder;
    })(),

    execute: async (interaction) => {
        const name = interaction.options.getString('name', true).trim();
        const platform = (
            interaction.options.getString('platform') ?? 'PC'
        ).toUpperCase();

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Use the fuzzy /bridge endpoint — exact /nametouid may 404 for some names
            const data = await apexService.getPlayerByName(name, platform);
            const { uid, name: resolvedName } = data.global;

            await interaction.editReply(
                `Found: **${resolvedName}** (${platform}) — UID: \`${uid}\`\n\n` +
                    `Is this you? Run:\n` +
                    `\`/apex-add name:${name} uid:${uid}\``
            );
        } catch (err: any) {
            const status = err?.status ?? err?.statusCode;
            if (status === 404) {
                await interaction.editReply(
                    `Could not find any player matching **${name}** on **${platform}**.\n` +
                        `Try a different spelling or check your platform.`
                );
            } else {
                console.error('[/apex-uid] Error:', err);
                await interaction.editReply(
                    'Something went wrong. Please try again later.'
                );
            }
        }
    },
};
