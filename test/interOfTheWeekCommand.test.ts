export {};

const getInterCandidatesLastWeekMock = jest.fn();

class MockSlashCommandBuilder {
    public name?: string;
    public description?: string;

    setName(name: string) {
        this.name = name;
        return this;
    }

    setDescription(description: string) {
        this.description = description;
        return this;
    }
}

class MockEmbedBuilder {
    public data: Record<string, any>;

    constructor() {
        this.data = { fields: [] as Array<Record<string, any>> };
    }

    setTitle(title: string) {
        this.data.title = title;
        return this;
    }

    setDescription(description: string) {
        this.data.description = description;
        return this;
    }

    setColor(color: number) {
        this.data.color = color;
        return this;
    }

    setFooter(footer: Record<string, unknown>) {
        this.data.footer = footer;
        return this;
    }

    addFields(...fields: Array<Record<string, any>>) {
        const normalized = Array.isArray(fields[0]) ? fields[0] : fields;
        this.data.fields = [...(this.data.fields || []), ...normalized];
        return this;
    }

    setTimestamp() {
        this.data.timestamp = 'mock-timestamp';
        return this;
    }

    setThumbnail(url: string) {
        this.data.thumbnail = { url };
        return this;
    }
}

jest.mock('discord.js', () => ({
    EmbedBuilder: MockEmbedBuilder,
    SlashCommandBuilder: MockSlashCommandBuilder,
}));

jest.mock('diana-core', () => ({
    getInterCandidatesLastWeek: getInterCandidatesLastWeekMock,
}));

const {
    interOfTheWeekCommand,
} = require('../packages/diana-discord/src/plugins/diana-league-bot/discord/commands/interOfTheWeekCommand');

// Minimal valid InterCandidate fixture
function makeCandidate(overrides: Record<string, unknown> = {}) {
    return {
        puuid: 'puuid-1',
        displayName: 'TestPlayer',
        deepLolLink: null,
        avgDamage: 10000,
        kdaRatio: 2.5,
        winRate: 0.5,
        matchesPlayed: 5,
        avgVisionScore: 20,
        wins: 3,
        losses: 2,
        totalKills: 15,
        totalDeaths: 6,
        totalAssists: 10,
        ...overrides,
    };
}

describe('interOfTheWeekCommand', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('data', () => {
        it('has name "iotw"', () => {
            expect(interOfTheWeekCommand.data.name).toBe('iotw');
        });

        it('has a non-empty description', () => {
            expect(typeof interOfTheWeekCommand.data.description).toBe(
                'string'
            );
            expect(
                interOfTheWeekCommand.data.description.length
            ).toBeGreaterThan(0);
        });

        it('does not have any required options (command has no options)', () => {
            // The iotw command takes no user-facing options
            expect(interOfTheWeekCommand.data.options ?? []).toHaveLength(0);
        });
    });

    describe('execute', () => {
        it('calls deferReply before any heavy work', async () => {
            getInterCandidatesLastWeekMock.mockResolvedValue([]);

            const interaction = {
                deferReply: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await interOfTheWeekCommand.execute(interaction as any);

            expect(interaction.deferReply).toHaveBeenCalledTimes(1);
        });

        it('replies with a "no matches" message when candidates list is empty', async () => {
            getInterCandidatesLastWeekMock.mockResolvedValue([]);

            const interaction = {
                deferReply: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await interOfTheWeekCommand.execute(interaction as any);

            expect(interaction.editReply).toHaveBeenCalledWith(
                expect.stringMatching(/no matches/i)
            );
        });

        it('replies with an embed when candidates are present', async () => {
            getInterCandidatesLastWeekMock.mockResolvedValue([makeCandidate()]);

            const interaction = {
                deferReply: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await interOfTheWeekCommand.execute(interaction as any);

            const call = interaction.editReply.mock.calls[0][0];
            expect(call).toHaveProperty('embeds');
            expect(call.embeds).toHaveLength(1);
        });

        it('embed title contains "Inter Of the Week"', async () => {
            getInterCandidatesLastWeekMock.mockResolvedValue([makeCandidate()]);

            const interaction = {
                deferReply: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await interOfTheWeekCommand.execute(interaction as any);

            const embed = interaction.editReply.mock.calls[0][0].embeds[0];
            expect(embed.data.title).toContain('Inter Of the Week');
        });

        it('embed description crowns the single candidate when there is only one', async () => {
            const candidate = makeCandidate({
                displayName: 'FakeCrowned',
                matchesPlayed: 10,
            });
            getInterCandidatesLastWeekMock.mockResolvedValue([candidate]);

            const interaction = {
                deferReply: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await interOfTheWeekCommand.execute(interaction as any);

            const embed = interaction.editReply.mock.calls[0][0].embeds[0];
            expect(embed.data.description).toContain('FakeCrowned');
        });

        it('embed includes a Stats field', async () => {
            getInterCandidatesLastWeekMock.mockResolvedValue([makeCandidate()]);

            const interaction = {
                deferReply: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await interOfTheWeekCommand.execute(interaction as any);

            const embed = interaction.editReply.mock.calls[0][0].embeds[0];
            const statsField = embed.data.fields.find(
                (f: any) => f.name === 'Stats'
            );
            expect(statsField).toBeDefined();
        });

        it('handles two candidates and crowns the one with more category wins', async () => {
            // InterPlayer has very bad stats in most categories → should win more crowns
            const bad = makeCandidate({
                puuid: 'puuid-bad',
                displayName: 'InterPlayer',
                avgDamage: 100, // lowest (asc) → wins "least damage"
                kdaRatio: 0.1, // lowest (asc) → wins "worst kda"
                winRate: 0.0, // lowest (asc) → wins "lowest winrate"
                matchesPlayed: 20, // highest (desc) → wins "most matches"
                avgVisionScore: 1, // lowest (asc) → wins "worst vision"
                wins: 0,
                losses: 10,
            });
            const good = makeCandidate({
                puuid: 'puuid-good',
                displayName: 'GoodPlayer',
                avgDamage: 50000,
                kdaRatio: 10,
                winRate: 0.9,
                matchesPlayed: 3,
                avgVisionScore: 50,
                wins: 9,
                losses: 1,
            });

            getInterCandidatesLastWeekMock.mockResolvedValue([good, bad]);

            const interaction = {
                deferReply: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await interOfTheWeekCommand.execute(interaction as any);

            const embed = interaction.editReply.mock.calls[0][0].embeds[0];
            expect(embed.data.description).toContain('InterPlayer');
        });

        it('replies with an error message when getInterCandidatesLastWeek throws', async () => {
            getInterCandidatesLastWeekMock.mockRejectedValue(
                new Error('DB failure')
            );

            const interaction = {
                deferReply: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await interOfTheWeekCommand.execute(interaction as any);

            expect(interaction.editReply).toHaveBeenCalledWith(
                expect.stringMatching(/went wrong/i)
            );
        });

        it('includes the candidate display name in the Stats field value', async () => {
            const candidate = makeCandidate({
                displayName: 'StatsTarget',
                matchesPlayed: 5,
            });
            getInterCandidatesLastWeekMock.mockResolvedValue([candidate]);

            const interaction = {
                deferReply: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await interOfTheWeekCommand.execute(interaction as any);

            const embed = interaction.editReply.mock.calls[0][0].embeds[0];
            const statsField = embed.data.fields.find(
                (f: any) => f.name === 'Stats'
            );
            expect(statsField.value).toContain('StatsTarget');
        });

        it('uses a deepLolLink as a hyperlink in the embed when available', async () => {
            const candidate = makeCandidate({
                displayName: 'LinkedPlayer',
                deepLolLink: 'https://deep.lol/summoner/linked',
                matchesPlayed: 5,
            });
            getInterCandidatesLastWeekMock.mockResolvedValue([candidate]);

            const interaction = {
                deferReply: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await interOfTheWeekCommand.execute(interaction as any);

            const embed = interaction.editReply.mock.calls[0][0].embeds[0];
            expect(embed.data.description).toContain(
                'https://deep.lol/summoner/linked'
            );
        });
    });
});
