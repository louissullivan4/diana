require('dotenv').config();

jest.mock('../src/discord/commandService', () => ({
    handleAutocompleteInteraction: jest.fn(),
    handleSlashCommandInteraction: jest.fn(),
    registerSlashCommands: jest.fn(),
}));

jest.mock('discord.js', () => {
    const mockChannel = {
        isSendable: () => true,
        send: jest.fn(),
    };

    const fetchMock = jest.fn().mockResolvedValue(mockChannel);

    class MockClient {
        once = jest.fn();
        on = jest.fn();
        login = jest.fn().mockResolvedValue(undefined);
        channels = { fetch: fetchMock };
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

        setURL(url: string) {
            this.data.url = url;
            return this;
        }

        setColor(color: number) {
            this.data.color = color;
            return this;
        }

        setThumbnail(url: string) {
            this.data.thumbnail = { url };
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

        setFooter(footer: Record<string, any>) {
            this.data.footer = footer;
            return this;
        }
    }

    return {
        Client: MockClient,
        EmbedBuilder: MockEmbedBuilder,
        IntentsBitField: {
            Flags: {
                Guilds: 'Guilds',
                GuildMessages: 'GuildMessages',
            },
        },
        __mocks: {
            fetchMock,
            mockChannel,
        },
    };
});

const discordService = require('../src/discord/discordService');

const {
    createMatchEndEmbed,
    createNotifyMissingDataEmbed,
    createRankChangeEmbed,
    notifyMatchEnd,
    notifyRankChange,
    rankColors,
} = discordService;

describe('discordService', () => {
    const DISCORD_CHANNEL_ID =
        process.env.TEST_DISCORD_CHANNEL_ID || 'test-channel-id';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createMatchEndEmbed', () => {
        it('builds a ranked match embed with role and LP change details', () => {
            const embed = createMatchEndEmbed(
                'TestSummoner',
                'Ranked Flex',
                'Win',
                'GOLD II',
                20,
                'Ahri',
                'Mid',
                '10/2/8',
                15000,
                'https://deep.lol/match/end'
            );

            const embedData = embed.data;
            expect(embedData.title).toBe('🎮 **Match Summary**');
            expect(embedData.description).toContain('TestSummoner');
            expect(embedData.url).toBe('https://deep.lol/match/end');
            expect(embedData.color).toBe(0x28a745);
            expect(embedData.thumbnail.url).toContain('Ahri');

            const fields = embedData.fields;
            expect(fields).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: '📈 **Rank Update**',
                        value: '**GOLD II**',
                    }),
                    expect.objectContaining({
                        name: '🔄 **LP Change**',
                        value: '**20 LP**',
                    }),
                    expect.objectContaining({
                        name: '🎯 **Role**',
                        value: '**Mid**',
                    }),
                    expect.objectContaining({
                        name: '⚔️ **KDA**',
                        value: '**10/2/8**',
                    }),
                    expect.objectContaining({
                        name: '💥 **Damage Dealt**',
                        value: '**15000**',
                    }),
                ])
            );
        });

        it('falls back to neutral colour and omits role for non-role queue', () => {
            const embed = createMatchEndEmbed(
                'TestSummoner',
                'ARAM',
                'Unknown',
                'UNRANKED I',
                0,
                'Sona',
                'Support',
                '2/1/20',
                9000,
                'https://deep.lol/match/aram'
            );

            const embedData = embed.data;
            expect(embedData.color).toBe(0x95a5a6);
            const roleField = (
                embedData.fields as Array<Record<string, any>>
            ).find((field: Record<string, any>) => field.name.includes('Role'));
            expect(roleField).toBeUndefined();
        });
    });

    describe('notifyMatchEnd', () => {
        const matchEndInfo = {
            summonerName: 'TestSummoner',
            queueName: 'Ranked Flex',
            result: 'Win',
            newRankMsg: 'GOLD II',
            lpChangeMsg: 20,
            championDisplay: 'Ahri',
            role: 'Mid',
            kdaStr: '10/2/8',
            damage: 15000,
            discordChannelId: DISCORD_CHANNEL_ID,
            deepLolLink: 'https://deep.lol/match/end',
        };

        it('sends an embed message and returns true when sending succeeds', async () => {
            const sendSpy = jest
                .spyOn(discordService, 'sendDiscordMessage')
                .mockResolvedValue(undefined);
            const logSpy = jest
                .spyOn(console, 'log')
                .mockImplementation(() => undefined);

            const result = await notifyMatchEnd(matchEndInfo);

            expect(result).toBe(true);
            expect(sendSpy).toHaveBeenCalledWith(
                process.env.DISCORD_CHANNEL_ID ||
                    process.env.TEST_DISCORD_CHANNEL_ID ||
                    'test-channel-id',
                expect.objectContaining({
                    embeds: [expect.any(Object)],
                })
            );

            const embed = (sendSpy.mock.calls[0][1] as { embeds: any[] })
                .embeds[0];
            expect(embed.data.fields).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: '🏁 **Result**',
                        value: '**Win**',
                    }),
                ])
            );
            expect(logSpy).toHaveBeenCalledWith(
                '[Notification] Sent match end message for TestSummoner.'
            );
        });

        it('returns false and logs an error if sending fails', async () => {
            const error = new Error('Discord unavailable');
            jest.spyOn(discordService, 'sendDiscordMessage').mockRejectedValue(
                error
            );
            const errorSpy = jest
                .spyOn(console, 'error')
                .mockImplementation(() => undefined);

            const result = await notifyMatchEnd(matchEndInfo);

            expect(result).toBe(false);
            expect(errorSpy).toHaveBeenCalledWith(
                '[Notification Error] Could not send message for TestSummoner:',
                error
            );
        });
    });

    describe('createRankChangeEmbed', () => {
        it('builds a promotion embed with ranked colour', () => {
            const embed = createRankChangeEmbed(
                'TestSummoner',
                'promoted',
                'PLATINUM I',
                25,
                'https://deep.lol/rank/change'
            );

            expect(embed).not.toBeNull();
            const embedData = embed.data;
            expect(embedData.title).toBe('📈 **Rank Promotion!**');
            expect(embedData.color).toBe(rankColors.get('PLATINUM'));
            expect(embedData.thumbnail.url).toContain('platinum.webp');
            expect(embedData.fields).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: '🏆 **Rank Change**',
                        value: '**PLATINUM I**',
                    }),
                    expect.objectContaining({
                        name: '🔄 **LP Change**',
                        value: '**25 LP**',
                    }),
                ])
            );
        });

        it('returns null for non-promotion/demotion directions', () => {
            const embed = createRankChangeEmbed(
                'TestSummoner',
                'no_change',
                'PLATINUM I',
                0,
                'https://deep.lol/rank/change'
            );

            expect(embed).toBeNull();
        });
    });

    describe('notifyRankChange', () => {
        const baseRankChangeInfo = {
            summonerName: 'TestSummoner',
            direction: 'promoted',
            newRankMsg: 'EMERALD I',
            lpChangeMsg: 35,
            discordChannelId: DISCORD_CHANNEL_ID,
            deepLolLink: 'https://deep.lol/rank/change',
        };

        it('sends a rank change embed when direction is promoted', async () => {
            const sendSpy = jest
                .spyOn(discordService, 'sendDiscordMessage')
                .mockResolvedValue(undefined);

            await notifyRankChange(baseRankChangeInfo);

            expect(sendSpy).toHaveBeenCalledTimes(1);
            const embed = (sendSpy.mock.calls[0][1] as { embeds: any[] })
                .embeds[0];
            expect(embed.data.title).toBe('📈 **Rank Promotion!**');
        });

        it('skips sending when embed creation returns null', async () => {
            const sendSpy = jest
                .spyOn(discordService, 'sendDiscordMessage')
                .mockResolvedValue(undefined);

            await notifyRankChange({
                ...baseRankChangeInfo,
                direction: 'no_change',
            });

            expect(sendSpy).not.toHaveBeenCalled();
        });
    });

    describe('createNotifyMissingDataEmbed', () => {
        it('creates a summary embed with key statistics', () => {
            const embed = createNotifyMissingDataEmbed({
                name: 'TestSummoner',
                tier: 'GOLD',
                rank: 'II',
                lp: 75,
                totalGames: 5,
                wins: 3,
                losses: 2,
                winRate: '60',
                totalTimeInHours: '4h',
                mostPlayedChampion: { name: 'Ahri' },
                averageDamageDealtToChampions: '12345',
                mostPlayedRole: 'Mid',
                discordChannelId: DISCORD_CHANNEL_ID,
            });

            const embedData = embed.data;
            expect(embedData.title).toBe("📊 TestSummoner's Summary");
            expect(embedData.description).toBe(
                'Missing data for TestSummoner.'
            );
            expect(embedData.thumbnail.url).toContain('Ahri');
            expect(embedData.fields).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: '🏅 **Rank**',
                        value: 'GOLD II (75 LP)',
                    }),
                    expect.objectContaining({
                        name: '✅ **Wins / ❌ Losses**',
                        value: '3 / 2',
                    }),
                    expect.objectContaining({
                        name: '🧭 **Fav Role**',
                        value: 'Mid',
                    }),
                ])
            );
        });
    });
});
