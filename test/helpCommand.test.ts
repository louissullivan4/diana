export {};

// ─── Discord.js mock builders ─────────────────────────────────────────────────

class MockSlashCommandBuilder {
    public name?: string;
    setName(n: string) { this.name = n; return this; }
    setDescription(_d: string) { return this; }
}

class MockEmbedBuilder {
    public data: Record<string, any> = { fields: [] };
    setTitle(t: string) { this.data.title = t; return this; }
    setDescription(d: string) { this.data.description = d; return this; }
    setColor(c: number) { this.data.color = c; return this; }
    setFooter(f: Record<string, string>) { this.data.footer = f; return this; }
    setTimestamp() { return this; }
    addFields(...fields: any[]) {
        const normalized = Array.isArray(fields[0]) ? fields[0] : fields;
        this.data.fields = [...this.data.fields, ...normalized];
        return this;
    }
}

jest.mock('discord.js', () => ({
    SlashCommandBuilder: MockSlashCommandBuilder,
    EmbedBuilder: MockEmbedBuilder,
}));

const { helpCommand } = require('../packages/diana-discord/src/plugins/diana-league-bot/discord/commands/helpCommand');

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('helpCommand', () => {
    describe('data', () => {
        it('has command name "help"', () => {
            expect(helpCommand.data.name).toBe('help');
        });
    });

    describe('execute', () => {
        it('replies with an embed', async () => {
            const interaction = {
                reply: jest.fn().mockResolvedValue(undefined),
            };

            await helpCommand.execute(interaction as any);

            expect(interaction.reply).toHaveBeenCalledWith(
                expect.objectContaining({ embeds: expect.arrayContaining([expect.any(MockEmbedBuilder)]) })
            );
        });

        it('reply is ephemeral', async () => {
            const interaction = {
                reply: jest.fn().mockResolvedValue(undefined),
            };

            await helpCommand.execute(interaction as any);

            expect(interaction.reply).toHaveBeenCalledWith(
                expect.objectContaining({ ephemeral: true })
            );
        });

        it('embed includes /add, /remove, /setchannel and /config commands', async () => {
            const interaction = {
                reply: jest.fn().mockResolvedValue(undefined),
            };

            await helpCommand.execute(interaction as any);

            const embed: MockEmbedBuilder = interaction.reply.mock.calls[0][0].embeds[0];
            const allFieldValues = embed.data.fields.map((f: any) => f.value).join(' ');
            expect(allFieldValues).toContain('/add');
            expect(allFieldValues).toContain('/remove');
            expect(allFieldValues).toContain('/setchannel');
            expect(allFieldValues).toContain('/config');
        });

        it('embed has a title', async () => {
            const interaction = {
                reply: jest.fn().mockResolvedValue(undefined),
            };

            await helpCommand.execute(interaction as any);

            const embed: MockEmbedBuilder = interaction.reply.mock.calls[0][0].embeds[0];
            expect(typeof embed.data.title).toBe('string');
            expect(embed.data.title.length).toBeGreaterThan(0);
        });

        it('reply is called exactly once', async () => {
            const interaction = {
                reply: jest.fn().mockResolvedValue(undefined),
            };

            await helpCommand.execute(interaction as any);

            expect(interaction.reply).toHaveBeenCalledTimes(1);
        });
    });
});
