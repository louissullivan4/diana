export {};

// ─── Discord.js mock builders ─────────────────────────────────────────────────

class MockStringOption {
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

const getAccountByRiotIdMock = jest.fn();
const createLolServiceMock = jest.fn(() => ({
    getAccountByRiotId: getAccountByRiotIdMock,
}));
const getSummonerByPuuidMock = jest.fn();
const createSummonerMock = jest.fn();
const addSummonerToGuildMock = jest.fn();
const isSummonerInGuildMock = jest.fn();

jest.mock('discord.js', () => ({
    SlashCommandBuilder: MockSlashCommandBuilder,
    MessageFlags: { Ephemeral: 64 },
}));

jest.mock('twisted', () => ({
    Constants: {
        Regions: { EU_WEST: 'eu_west', NA_1: 'na1' },
        RegionGroups: { EUROPE: 'EUROPE', AMERICAS: 'AMERICAS' },
    },
}));

jest.mock('diana-core', () => ({
    createLolService: createLolServiceMock,
    getSummonerByPuuid: getSummonerByPuuidMock,
    createSummoner: createSummonerMock,
    addSummonerToGuild: addSummonerToGuildMock,
    isSummonerInGuild: isSummonerInGuildMock,
}));

const {
    addSummonerCommand,
} = require('../packages/diana-discord/src/plugins/diana-league-bot/discord/commands/addSummonerCommand');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInteraction(
    opts: {
        name?: string;
        tag?: string;
        region?: string;
        guildId?: string | null;
    } = {}
) {
    const {
        name = 'FM Stew',
        tag = 'RATS',
        region = null,
        guildId = 'guild-99',
    } = opts;

    return {
        guildId,
        user: { id: 'user-111' },
        options: {
            getString: jest.fn((key: string) => {
                if (key === 'name') return name;
                if (key === 'tag') return tag;
                if (key === 'region') return region;
                return null;
            }),
        },
        deferReply: jest.fn().mockResolvedValue(undefined),
        editReply: jest.fn().mockResolvedValue(undefined),
        reply: jest.fn().mockResolvedValue(undefined),
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('addSummonerCommand', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('data', () => {
        it('has command name "add"', () => {
            expect(addSummonerCommand.data.name).toBe('add');
        });

        it('has required name and tag options', () => {
            const nameOpt = addSummonerCommand.data.options.find(
                (o: any) => o.config.name === 'name'
            );
            const tagOpt = addSummonerCommand.data.options.find(
                (o: any) => o.config.name === 'tag'
            );
            expect(nameOpt?.config.required).toBe(true);
            expect(tagOpt?.config.required).toBe(true);
        });

        it('has an optional region option', () => {
            const regionOpt = addSummonerCommand.data.options.find(
                (o: any) => o.config.name === 'region'
            );
            expect(regionOpt?.config.required).toBe(false);
        });
    });

    describe('execute', () => {
        it('adds a new summoner and links to guild', async () => {
            const account = {
                puuid: 'puuid-1',
                gameName: 'FM Stew',
                tagLine: 'RATS',
            };
            getAccountByRiotIdMock.mockResolvedValue(account);
            isSummonerInGuildMock.mockResolvedValue(false);
            getSummonerByPuuidMock.mockResolvedValue(null);
            createSummonerMock.mockResolvedValue(account);
            addSummonerToGuildMock.mockResolvedValue(undefined);

            const interaction = makeInteraction();
            await addSummonerCommand.execute(interaction as any);

            expect(getAccountByRiotIdMock).toHaveBeenCalledWith(
                'FM Stew',
                'RATS',
                expect.any(String)
            );
            expect(createSummonerMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    puuid: 'puuid-1',
                    gameName: 'FM Stew',
                })
            );
            expect(addSummonerToGuildMock).toHaveBeenCalledWith(
                'guild-99',
                'puuid-1',
                'user-111'
            );
            expect(interaction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('FM Stew#RATS')
            );
        });

        it('skips createSummoner when summoner already exists globally', async () => {
            const account = {
                puuid: 'puuid-2',
                gameName: 'FM Stew',
                tagLine: 'RATS',
            };
            getAccountByRiotIdMock.mockResolvedValue(account);
            isSummonerInGuildMock.mockResolvedValue(false);
            getSummonerByPuuidMock.mockResolvedValue({
                puuid: 'puuid-2',
                gameName: 'FM Stew',
            });
            addSummonerToGuildMock.mockResolvedValue(undefined);

            const interaction = makeInteraction();
            await addSummonerCommand.execute(interaction as any);

            expect(createSummonerMock).not.toHaveBeenCalled();
            expect(addSummonerToGuildMock).toHaveBeenCalled();
        });

        it('replies with "already tracked" when summoner is already in guild', async () => {
            const account = {
                puuid: 'puuid-3',
                gameName: 'FM Stew',
                tagLine: 'RATS',
            };
            getAccountByRiotIdMock.mockResolvedValue(account);
            isSummonerInGuildMock.mockResolvedValue(true);

            const interaction = makeInteraction();
            await addSummonerCommand.execute(interaction as any);

            expect(createSummonerMock).not.toHaveBeenCalled();
            expect(addSummonerToGuildMock).not.toHaveBeenCalled();
            expect(interaction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('already being tracked')
            );
        });

        it('replies with not-found message on 404 from Riot API', async () => {
            const error = new Error('Not found') as any;
            error.status = 404;
            getAccountByRiotIdMock.mockRejectedValue(error);

            const interaction = makeInteraction({ name: 'Ghost', tag: 'XXXX' });
            await addSummonerCommand.execute(interaction as any);

            expect(interaction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('Could not find summoner')
            );
        });

        it('replies with generic error on non-404 API failure', async () => {
            getAccountByRiotIdMock.mockRejectedValue(new Error('Rate limited'));

            const interaction = makeInteraction();
            await addSummonerCommand.execute(interaction as any);

            expect(interaction.editReply).toHaveBeenCalledWith(
                expect.stringContaining('Something went wrong')
            );
        });

        it('replies with guild-only message when guildId is null', async () => {
            const interaction = makeInteraction({ guildId: null });
            await addSummonerCommand.execute(interaction as any);

            expect(getAccountByRiotIdMock).not.toHaveBeenCalled();
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
