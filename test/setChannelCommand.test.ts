export {};

// ─── Discord.js mock builders ─────────────────────────────────────────────────

class MockChannelOption {
    public config: Record<string, unknown> = {};
    setName(n: string) {
        this.config.name = n;
        return this;
    }
    setDescription(d: string) {
        this.config.description = d;
        return this;
    }
    setRequired(r: boolean) {
        this.config.required = r;
        return this;
    }
    addChannelTypes(..._types: unknown[]) {
        return this;
    }
}

class MockSlashCommandBuilder {
    public name?: string;
    public description?: string;
    public options: MockChannelOption[] = [];
    setName(n: string) {
        this.name = n;
        return this;
    }
    setDescription(d: string) {
        this.description = d;
        return this;
    }
    setDefaultMemberPermissions(_p: unknown) {
        return this;
    }
    addChannelOption(cb: (o: MockChannelOption) => unknown) {
        const o = new MockChannelOption();
        cb(o);
        this.options.push(o);
        return this;
    }
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

const setGuildChannelMock = jest.fn();

jest.mock('discord.js', () => ({
    SlashCommandBuilder: MockSlashCommandBuilder,
    PermissionFlagsBits: { ManageChannels: BigInt(16) },
    ChannelType: { GuildText: 0 },
    MessageFlags: { Ephemeral: 64 },
}));

jest.mock('diana-core', () => ({
    setGuildChannel: setGuildChannelMock,
}));

const {
    setChannelCommand,
} = require('../packages/diana-discord/src/plugins/diana-league-bot/discord/commands/setChannelCommand');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInteraction(overrides: Record<string, unknown> = {}) {
    return {
        guildId: 'guild-123',
        options: {
            getChannel: jest.fn().mockReturnValue({ id: 'channel-456' }),
        },
        reply: jest.fn().mockResolvedValue(undefined),
        deferReply: jest.fn().mockResolvedValue(undefined),
        editReply: jest.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('setChannelCommand', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('data', () => {
        it('has the correct command name', () => {
            expect(setChannelCommand.data.name).toBe('setchannel');
        });

        it('has a channel option', () => {
            const opt = setChannelCommand.data.options.find(
                (o: any) => o.config.name === 'channel'
            );
            expect(opt).toBeDefined();
            expect(opt.config.required).toBe(true);
        });
    });

    describe('execute', () => {
        it('calls setGuildChannel with guildId and channelId, then replies', async () => {
            const interaction = makeInteraction();
            setGuildChannelMock.mockResolvedValue(undefined);

            await setChannelCommand.execute(interaction as any);

            expect(setGuildChannelMock).toHaveBeenCalledWith(
                'guild-123',
                'channel-456'
            );
            expect(interaction.editReply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('<#channel-456>'),
                })
            );
        });

        it('replies ephemerally', async () => {
            const interaction = makeInteraction();
            setGuildChannelMock.mockResolvedValue(undefined);

            await setChannelCommand.execute(interaction as any);

            expect(interaction.deferReply).toHaveBeenCalledWith(
                expect.objectContaining({ flags: 64 })
            );
        });

        it('rejects with ephemeral message when guildId is null', async () => {
            const interaction = makeInteraction({ guildId: null });

            await setChannelCommand.execute(interaction as any);

            expect(setGuildChannelMock).not.toHaveBeenCalled();
            expect(interaction.reply).toHaveBeenCalledWith(
                expect.objectContaining({ flags: 64 })
            );
        });
    });
});
