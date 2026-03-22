export {};

// ─── Discord.js mock builders ─────────────────────────────────────────────────

class MockBooleanOption {
    public config: Record<string, unknown> = {};
    setName(n: string) {
        this.config.name = n;
        return this;
    }
    setDescription(_d: string) {
        return this;
    }
    setRequired(r: boolean) {
        this.config.required = r;
        return this;
    }
}

class MockSubcommand {
    public name?: string;
    public options: MockBooleanOption[] = [];
    setName(n: string) {
        this.name = n;
        return this;
    }
    setDescription(_d: string) {
        return this;
    }
    addBooleanOption(cb: (o: MockBooleanOption) => unknown) {
        const o = new MockBooleanOption();
        cb(o);
        this.options.push(o);
        return this;
    }
}

class MockSlashCommandBuilder {
    public name?: string;
    public subcommands: MockSubcommand[] = [];
    setName(n: string) {
        this.name = n;
        return this;
    }
    setDescription(_d: string) {
        return this;
    }
    setDefaultMemberPermissions(_p: unknown) {
        return this;
    }
    addSubcommand(cb: (s: MockSubcommand) => unknown) {
        const s = new MockSubcommand();
        cb(s);
        this.subcommands.push(s);
        return this;
    }
}

class MockEmbedBuilder {
    public data: Record<string, any> = { fields: [] };
    setTitle(t: string) {
        this.data.title = t;
        return this;
    }
    setColor(c: number) {
        this.data.color = c;
        return this;
    }
    setTimestamp() {
        return this;
    }
    addFields(...fields: any[]) {
        const normalized = Array.isArray(fields[0]) ? fields[0] : fields;
        this.data.fields = [...this.data.fields, ...normalized];
        return this;
    }
}

// ─── diana-core mocks ─────────────────────────────────────────────────────────

const getGuildConfigMock = jest.fn();
const setGuildLivePostingMock = jest.fn();

jest.mock('discord.js', () => ({
    SlashCommandBuilder: MockSlashCommandBuilder,
    PermissionFlagsBits: { ManageGuild: BigInt(32) },
    EmbedBuilder: MockEmbedBuilder,
}));

jest.mock('diana-core', () => ({
    getGuildConfig: getGuildConfigMock,
    setGuildLivePosting: setGuildLivePostingMock,
}));

const {
    configCommand,
} = require('../packages/diana-discord/src/plugins/diana-league-bot/discord/commands/configCommand');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInteraction(
    opts: {
        subcommand?: string;
        enabled?: boolean;
        guildId?: string | null;
    } = {}
) {
    const {
        subcommand = 'live-posting',
        enabled = true,
        guildId = 'guild-7',
    } = opts;
    return {
        guildId,
        options: {
            getSubcommand: jest.fn().mockReturnValue(subcommand),
            getBoolean: jest.fn().mockReturnValue(enabled),
        },
        reply: jest.fn().mockResolvedValue(undefined),
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('configCommand', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('data', () => {
        it('has command name "config"', () => {
            expect(configCommand.data.name).toBe('config');
        });

        it('has live-posting and view subcommands', () => {
            const names = configCommand.data.subcommands.map(
                (s: any) => s.name
            );
            expect(names).toContain('live-posting');
            expect(names).toContain('view');
        });
    });

    describe('execute — live-posting subcommand', () => {
        it('disables live posting and confirms', async () => {
            setGuildLivePostingMock.mockResolvedValue(undefined);
            const interaction = makeInteraction({
                subcommand: 'live-posting',
                enabled: false,
            });

            await configCommand.execute(interaction as any);

            expect(setGuildLivePostingMock).toHaveBeenCalledWith(
                'guild-7',
                false
            );
            expect(interaction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('disabled'),
                })
            );
        });

        it('enables live posting and confirms', async () => {
            setGuildLivePostingMock.mockResolvedValue(undefined);
            const interaction = makeInteraction({
                subcommand: 'live-posting',
                enabled: true,
            });

            await configCommand.execute(interaction as any);

            expect(setGuildLivePostingMock).toHaveBeenCalledWith(
                'guild-7',
                true
            );
            expect(interaction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('enabled'),
                })
            );
        });

        it('replies ephemerally', async () => {
            setGuildLivePostingMock.mockResolvedValue(undefined);
            const interaction = makeInteraction({ subcommand: 'live-posting' });

            await configCommand.execute(interaction as any);

            expect(interaction.reply).toHaveBeenCalledWith(
                expect.objectContaining({ ephemeral: true })
            );
        });
    });

    describe('execute — view subcommand', () => {
        it('shows channel and live_posting from DB config', async () => {
            getGuildConfigMock.mockResolvedValue({
                channel_id: 'c-123',
                live_posting: true,
            });
            const interaction = makeInteraction({ subcommand: 'view' });

            await configCommand.execute(interaction as any);

            expect(interaction.reply).toHaveBeenCalledWith(
                expect.objectContaining({ embeds: expect.any(Array) })
            );
        });

        it('shows "Not set" when no config exists', async () => {
            getGuildConfigMock.mockResolvedValue(null);
            const interaction = makeInteraction({ subcommand: 'view' });

            await configCommand.execute(interaction as any);

            const reply = interaction.reply.mock.calls[0][0];
            const embed: MockEmbedBuilder = reply.embeds[0];
            const channelField = embed.data.fields.find(
                (f: any) => f.name === 'Notification Channel'
            );
            expect(channelField.value).toContain('Not set');
        });

        it('shows live posting as Disabled when false', async () => {
            getGuildConfigMock.mockResolvedValue({
                channel_id: 'c-1',
                live_posting: false,
            });
            const interaction = makeInteraction({ subcommand: 'view' });

            await configCommand.execute(interaction as any);

            const reply = interaction.reply.mock.calls[0][0];
            const embed: MockEmbedBuilder = reply.embeds[0];
            const liveField = embed.data.fields.find(
                (f: any) => f.name === 'Live Match Posting'
            );
            expect(liveField.value).toContain('Disabled');
        });
    });

    describe('execute — guildId guard', () => {
        it('replies with error when not in a guild', async () => {
            const interaction = makeInteraction({ guildId: null });

            await configCommand.execute(interaction as any);

            expect(setGuildLivePostingMock).not.toHaveBeenCalled();
            expect(interaction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining(
                        'only be used in a server'
                    ),
                })
            );
        });
    });
});
