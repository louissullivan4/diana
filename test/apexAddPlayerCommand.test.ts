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
    addChoices(..._choices: unknown[]) {
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

const getUidByNameMock = jest.fn();
const getPlayerByUidMock = jest.fn();
const createApexServiceMock = jest.fn(() => ({
    getUidByName: getUidByNameMock,
    getPlayerByUid: getPlayerByUidMock,
}));
const getApexPlayerByUidMock = jest.fn();
const createApexPlayerMock = jest.fn();
const addApexPlayerToGuildMock = jest.fn();
const isApexPlayerInGuildMock = jest.fn();
const createApexRankHistoryMock = jest.fn().mockResolvedValue(undefined);

jest.mock('discord.js', () => ({
    SlashCommandBuilder: MockSlashCommandBuilder,
    MessageFlags: { Ephemeral: 64 },
}));

jest.mock('diana-core', () => ({
    createApexService: createApexServiceMock,
    getApexPlayerByUid: getApexPlayerByUidMock,
    createApexPlayer: createApexPlayerMock,
    addApexPlayerToGuild: addApexPlayerToGuildMock,
    isApexPlayerInGuild: isApexPlayerInGuildMock,
    createApexRankHistory: createApexRankHistoryMock,
    APEX_PLATFORMS: ['PC', 'PS4', 'X1', 'SWITCH'],
}));

const {
    apexAddPlayerCommand,
} = require('../packages/diana-discord/src/plugins/diana-apex-bot/discord/commands/apexAddPlayerCommand');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBridgeData(name = 'ProPlayer', uid = 111222333) {
    return {
        global: {
            name,
            uid,
            platform: 'PC',
            rank: {
                rankName: 'Gold',
                rankDiv: 2,
                rankScore: 900,
            },
        },
    };
}

function makeInteraction(
    opts: {
        name?: string;
        platform?: string | null;
        uid?: string | null;
        guildId?: string | null;
    } = {}
) {
    const {
        name = 'ProPlayer',
        platform = null,
        uid = null,
        guildId = 'guild-1',
    } = opts;
    return {
        guildId,
        user: { id: 'user-42' },
        options: {
            getString: jest.fn((key: string, _req?: boolean) => {
                if (key === 'name') return name;
                if (key === 'platform') return platform;
                if (key === 'uid') return uid;
                return null;
            }),
        },
        deferReply: jest.fn().mockResolvedValue(undefined),
        editReply: jest.fn().mockResolvedValue(undefined),
        reply: jest.fn().mockResolvedValue(undefined),
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('apexAddPlayerCommand', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('data', () => {
        it('has command name "apex-add"', () => {
            expect(apexAddPlayerCommand.data.name).toBe('apex-add');
        });

        it('has required name option', () => {
            const nameOpt = apexAddPlayerCommand.data.options.find(
                (o: any) => o.config.name === 'name'
            );
            expect(nameOpt?.config.required).toBe(true);
        });

        it('has optional platform option', () => {
            const platformOpt = apexAddPlayerCommand.data.options.find(
                (o: any) => o.config.name === 'platform'
            );
            expect(platformOpt?.config.required).toBe(false);
        });
    });

    describe('execute', () => {
        it('replies guild-only when guildId is null', async () => {
            const interaction = makeInteraction({ guildId: null });
            await apexAddPlayerCommand.execute(interaction as any);

            expect(getUidByNameMock).not.toHaveBeenCalled();
            expect(interaction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining(
                        'only be used in a server'
                    ),
                })
            );
        });

        it('adds a new player and links to guild', async () => {
            getUidByNameMock.mockResolvedValue('111222333');
            getPlayerByUidMock.mockResolvedValue(makeBridgeData());
            isApexPlayerInGuildMock.mockResolvedValue(false);
            getApexPlayerByUidMock.mockResolvedValue(null);
            createApexPlayerMock.mockResolvedValue({});
            addApexPlayerToGuildMock.mockResolvedValue(undefined);

            const interaction = makeInteraction();
            await apexAddPlayerCommand.execute(interaction as any);

            expect(getUidByNameMock).toHaveBeenCalledWith('ProPlayer', 'PC');
            expect(getPlayerByUidMock).toHaveBeenCalledWith('111222333', 'PC');
            expect(createApexPlayerMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    uid: '111222333',
                    gameName: 'ProPlayer',
                })
            );
            expect(addApexPlayerToGuildMock).toHaveBeenCalledWith(
                'guild-1',
                '111222333',
                'user-42'
            );
            expect(interaction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('ProPlayer')
            );
        });

        it('skips createApexPlayer when player already exists globally', async () => {
            getUidByNameMock.mockResolvedValue('111222333');
            getPlayerByUidMock.mockResolvedValue(makeBridgeData());
            isApexPlayerInGuildMock.mockResolvedValue(false);
            getApexPlayerByUidMock.mockResolvedValue({ uid: '111222333' });
            addApexPlayerToGuildMock.mockResolvedValue(undefined);

            const interaction = makeInteraction();
            await apexAddPlayerCommand.execute(interaction as any);

            expect(createApexPlayerMock).not.toHaveBeenCalled();
            expect(addApexPlayerToGuildMock).toHaveBeenCalled();
        });

        it('replies already-tracked when player is in guild', async () => {
            getUidByNameMock.mockResolvedValue('111222333');
            getPlayerByUidMock.mockResolvedValue(makeBridgeData());
            isApexPlayerInGuildMock.mockResolvedValue(true);

            const interaction = makeInteraction();
            await apexAddPlayerCommand.execute(interaction as any);

            expect(createApexPlayerMock).not.toHaveBeenCalled();
            expect(addApexPlayerToGuildMock).not.toHaveBeenCalled();
            expect(interaction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('already being tracked')
            );
        });

        it('replies not-found on 404 from nametouid', async () => {
            const err = new Error('Not found') as any;
            err.status = 404;
            getUidByNameMock.mockRejectedValue(err);

            const interaction = makeInteraction({ name: 'GhostPlayer' });
            await apexAddPlayerCommand.execute(interaction as any);

            expect(getPlayerByUidMock).not.toHaveBeenCalled();
            expect(interaction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('Could not find player')
            );
        });

        it('replies generic error on non-404 failure', async () => {
            getUidByNameMock.mockRejectedValue(new Error('Network timeout'));

            const interaction = makeInteraction();
            await apexAddPlayerCommand.execute(interaction as any);

            expect(interaction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('Something went wrong')
            );
        });

        it('skips name lookup when uid is provided directly', async () => {
            getPlayerByUidMock.mockResolvedValue(
                makeBridgeData('FM_Stew', 999888777)
            );
            isApexPlayerInGuildMock.mockResolvedValue(false);
            getApexPlayerByUidMock.mockResolvedValue(null);
            createApexPlayerMock.mockResolvedValue({});
            addApexPlayerToGuildMock.mockResolvedValue(undefined);

            const interaction = makeInteraction({
                name: 'FM_Stew',
                uid: '999888777',
            });
            await apexAddPlayerCommand.execute(interaction as any);

            expect(getUidByNameMock).not.toHaveBeenCalled();
            expect(getPlayerByUidMock).toHaveBeenCalledWith('999888777', 'PC');
            expect(createApexPlayerMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    uid: '999888777',
                    gameName: 'FM_Stew',
                })
            );
            expect(interaction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('FM_Stew')
            );
        });

        it('shows uid-specific error message on 404 when uid was provided', async () => {
            const err = new Error('Not found') as any;
            err.status = 404;
            getPlayerByUidMock.mockRejectedValue(err);

            const interaction = makeInteraction({
                name: 'FM_Stew',
                uid: '000000000',
            });
            await apexAddPlayerCommand.execute(interaction as any);

            expect(interaction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('UID **000000000**')
            );
        });

        it('defaults to PC platform when none provided', async () => {
            getUidByNameMock.mockResolvedValue('111222333');
            getPlayerByUidMock.mockResolvedValue(makeBridgeData());
            isApexPlayerInGuildMock.mockResolvedValue(false);
            getApexPlayerByUidMock.mockResolvedValue(null);
            createApexPlayerMock.mockResolvedValue({});
            addApexPlayerToGuildMock.mockResolvedValue(undefined);

            const interaction = makeInteraction({ platform: null });
            await apexAddPlayerCommand.execute(interaction as any);

            expect(getUidByNameMock).toHaveBeenCalledWith('ProPlayer', 'PC');
        });
    });
});
