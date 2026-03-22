export {};

// ─── Discord.js mock builders ─────────────────────────────────────────────────

class MockStringOption {
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
    setAutocomplete(_a: boolean) {
        return this;
    }
}

class MockSlashCommandBuilder {
    public name?: string;
    public options: MockStringOption[] = [];
    setName(n: string) {
        this.name = n;
        return this;
    }
    setDescription(_d: string) {
        return this;
    }
    addStringOption(cb: (o: MockStringOption) => unknown) {
        const o = new MockStringOption();
        cb(o);
        this.options.push(o);
        return this;
    }
}

// ─── diana-core mocks ─────────────────────────────────────────────────────────

const getSummonersForGuildMock = jest.fn();
const removeSummonerFromGuildMock = jest.fn();

jest.mock('discord.js', () => ({
    SlashCommandBuilder: MockSlashCommandBuilder,
}));

jest.mock('diana-core', () => ({
    getSummonersForGuild: getSummonersForGuildMock,
    removeSummonerFromGuild: removeSummonerFromGuildMock,
}));

const {
    removeSummonerCommand,
} = require('../packages/diana-discord/src/plugins/diana-league-bot/discord/commands/removeSummonerCommand');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALICE = { puuid: 'p-alice', gameName: 'Alice', tagLine: 'EUW' };
const BOB = { puuid: 'p-bob', gameName: 'Bob', tagLine: 'NA1' };
const ALICE2 = { puuid: 'p-alice2', gameName: 'Alice', tagLine: 'KR' };

function makeInteraction(
    opts: {
        name?: string;
        tag?: string | null;
        guildId?: string | null;
    } = {}
) {
    const { name = 'Alice', tag = null, guildId = 'guild-1' } = opts;
    return {
        guildId,
        options: {
            getString: jest.fn((key: string) => {
                if (key === 'name') return name;
                if (key === 'tag') return tag;
                return null;
            }),
        },
        deferReply: jest.fn().mockResolvedValue(undefined),
        editReply: jest.fn().mockResolvedValue(undefined),
        reply: jest.fn().mockResolvedValue(undefined),
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('removeSummonerCommand', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('data', () => {
        it('has command name "remove"', () => {
            expect(removeSummonerCommand.data.name).toBe('remove');
        });

        it('name option is required', () => {
            const opt = removeSummonerCommand.data.options.find(
                (o: any) => o.config.name === 'name'
            );
            expect(opt?.config.required).toBe(true);
        });

        it('tag option is optional', () => {
            const opt = removeSummonerCommand.data.options.find(
                (o: any) => o.config.name === 'tag'
            );
            expect(opt?.config.required).toBe(false);
        });
    });

    describe('execute', () => {
        it('removes a matching summoner and confirms', async () => {
            getSummonersForGuildMock.mockResolvedValue([ALICE, BOB]);
            removeSummonerFromGuildMock.mockResolvedValue(true);

            const interaction = makeInteraction({ name: 'Alice' });
            await removeSummonerCommand.execute(interaction as any);

            expect(removeSummonerFromGuildMock).toHaveBeenCalledWith(
                'guild-1',
                'p-alice'
            );
            expect(interaction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('Stopped tracking')
            );
        });

        it('removes by name+tag when tag is provided', async () => {
            getSummonersForGuildMock.mockResolvedValue([ALICE, ALICE2]);
            removeSummonerFromGuildMock.mockResolvedValue(true);

            const interaction = makeInteraction({ name: 'Alice', tag: 'EUW' });
            await removeSummonerCommand.execute(interaction as any);

            expect(removeSummonerFromGuildMock).toHaveBeenCalledWith(
                'guild-1',
                'p-alice'
            );
        });

        it('asks for tag disambiguation when multiple summoners match name', async () => {
            getSummonersForGuildMock.mockResolvedValue([ALICE, ALICE2]);
            removeSummonerFromGuildMock.mockResolvedValue(true);

            const interaction = makeInteraction({ name: 'Alice', tag: null });
            await removeSummonerCommand.execute(interaction as any);

            expect(removeSummonerFromGuildMock).not.toHaveBeenCalled();
            expect(interaction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('Multiple summoners match')
            );
        });

        it('replies not found when no summoner matches', async () => {
            getSummonersForGuildMock.mockResolvedValue([BOB]);

            const interaction = makeInteraction({ name: 'Unknown' });
            await removeSummonerCommand.execute(interaction as any);

            expect(removeSummonerFromGuildMock).not.toHaveBeenCalled();
            expect(interaction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('No tracked summoner found')
            );
        });

        it('replies with guild-only message when guildId is null', async () => {
            const interaction = makeInteraction({ guildId: null });
            await removeSummonerCommand.execute(interaction as any);

            expect(getSummonersForGuildMock).not.toHaveBeenCalled();
            expect(interaction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining(
                        'only be used in a server'
                    ),
                })
            );
        });

        it('replies with error message on unexpected failure', async () => {
            getSummonersForGuildMock.mockRejectedValue(new Error('DB down'));

            const interaction = makeInteraction();
            await removeSummonerCommand.execute(interaction as any);

            expect(interaction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('Something went wrong')
            );
        });
    });

    describe('autocomplete', () => {
        it('returns guild-scoped name suggestions', async () => {
            getSummonersForGuildMock.mockResolvedValue([ALICE, BOB]);
            const interaction = {
                guildId: 'guild-1',
                options: {
                    getFocused: jest
                        .fn()
                        .mockReturnValue({ name: 'name', value: 'Al' }),
                    getString: jest.fn().mockReturnValue(null),
                },
                respond: jest.fn().mockResolvedValue(undefined),
                responded: false,
            };

            await removeSummonerCommand.autocomplete(interaction as any);

            expect(interaction.respond).toHaveBeenCalledWith(
                expect.arrayContaining([{ name: 'Alice', value: 'Alice' }])
            );
            // Bob should not appear since 'Bo' doesn't start with 'Al'
            const responded = interaction.respond.mock.calls[0][0];
            expect(responded.map((r: any) => r.name)).not.toContain('Bob');
        });

        it('returns guild-scoped tag suggestions filtered by name', async () => {
            getSummonersForGuildMock.mockResolvedValue([ALICE, ALICE2, BOB]);
            const interaction = {
                guildId: 'guild-1',
                options: {
                    getFocused: jest
                        .fn()
                        .mockReturnValue({ name: 'tag', value: '' }),
                    getString: jest.fn().mockReturnValue('Alice'),
                },
                respond: jest.fn().mockResolvedValue(undefined),
                responded: false,
            };

            await removeSummonerCommand.autocomplete(interaction as any);

            const responded = interaction.respond.mock.calls[0][0] as {
                name: string;
                value: string;
            }[];
            expect(responded.map((r) => r.value)).toContain('EUW');
            expect(responded.map((r) => r.value)).toContain('KR');
            expect(responded.map((r) => r.value)).not.toContain('NA1');
        });

        it('responds with empty array when guildId is null', async () => {
            const interaction = {
                guildId: null,
                options: { getFocused: jest.fn(), getString: jest.fn() },
                respond: jest.fn().mockResolvedValue(undefined),
                responded: false,
            };

            await removeSummonerCommand.autocomplete(interaction as any);

            expect(interaction.respond).toHaveBeenCalledWith([]);
        });
    });
});
