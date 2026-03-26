import {
    buildApexPlayerEmbed,
    formatMatchHistory,
} from '../packages/diana-core/src/plugins/diana-apex-bot/presentation/apexPresentation';
import type { ApexBridgeResponse } from '../packages/diana-core/src/plugins/diana-apex-bot/types';
import type { ApexMatchResult } from '../packages/diana-core/src/plugins/diana-apex-bot/types';

function makeApexBridgeResponse(
    overrides: Partial<ApexBridgeResponse> = {}
): ApexBridgeResponse {
    return {
        global: {
            name: 'ProPlayer',
            uid: 123456,
            platform: 'PC',
            level: 500,
            toNextLevelPercent: 60,
            rank: {
                rankScore: 4500,
                rankName: 'Diamond',
                rankDiv: 2,
                rankImg: '',
                rankedSeason: 'S20',
            },
        },
        legends: {
            selected: {
                Wraith: {
                    data: [
                        { key: 'kills', name: 'Kills', value: 5000 },
                        { key: 'damage', name: 'Damage Dealt', value: 4000000 },
                        { key: 'wins', name: 'Wins', value: 200 },
                    ],
                },
            },
            all: {},
        },
        ...overrides,
    };
}

function makeMatchResult(
    overrides: Partial<ApexMatchResult> = {}
): ApexMatchResult {
    return {
        id: 1,
        player_uid: 'uid-1',
        match_start: 1700000000000,
        match_end: 1700003661000,
        legend: 'Wraith',
        kills_before: 100,
        damage_before: 80000,
        wins_before: 10,
        kills_after: 103,
        damage_after: 82500,
        wins_after: 11,
        rp_before: 1000,
        rp_after: 1150,
        tier_before: 'Gold',
        tier_after: 'Gold',
        game_id: 'apex_legends',
        created_at: '2025-01-01T00:00:00Z',
        kills_gained: 3,
        damage_gained: 2500,
        wins_gained: 1,
        rp_change: 150,
        result: 'WIN',
        duration_secs: 3661,
        ...overrides,
    };
}

describe('apexPresentation', () => {
    describe('buildApexPlayerEmbed', () => {
        it('returns correct player name and platform', () => {
            const embed = buildApexPlayerEmbed(makeApexBridgeResponse());
            expect(embed.playerName).toBe('ProPlayer');
            expect(embed.platform).toBe('PC');
        });

        it('returns correct level and progress', () => {
            const embed = buildApexPlayerEmbed(makeApexBridgeResponse());
            expect(embed.level).toBe(500);
            expect(embed.levelProgress).toBe(60);
        });

        it('formats rank display correctly', () => {
            const embed = buildApexPlayerEmbed(makeApexBridgeResponse());
            expect(embed.rankDisplay).toBe('Diamond II (4500 RP)');
        });

        it('uses Diamond color for Diamond rank', () => {
            const embed = buildApexPlayerEmbed(makeApexBridgeResponse());
            expect(embed.colorHex).toBe(0x00bfff);
        });

        it('uses default color for unknown rank tier', () => {
            const response = makeApexBridgeResponse();
            response.global.rank.rankName = 'CustomTier';
            const embed = buildApexPlayerEmbed(response);
            expect(embed.colorHex).toBe(0x3498db);
        });

        it('populates top stats from selected legend', () => {
            const embed = buildApexPlayerEmbed(makeApexBridgeResponse());
            expect(embed.topStats).toHaveLength(3);
            expect(embed.topStats[0].name).toBe('Kills');
        });

        it('returns empty topStats when no legends selected', () => {
            const response = makeApexBridgeResponse();
            response.legends.selected = {};
            const embed = buildApexPlayerEmbed(response);
            expect(embed.topStats).toHaveLength(0);
        });

        it('returns Offline status when no realtime data', () => {
            const embed = buildApexPlayerEmbed(makeApexBridgeResponse());
            expect(embed.status).toBe('🔴 Offline');
        });

        it('returns Online status when isOnline is 1', () => {
            const response = makeApexBridgeResponse({
                realtime: { isOnline: 1, isInGame: 0 },
            });
            const embed = buildApexPlayerEmbed(response);
            expect(embed.status).toBe('🟢 Online');
        });

        it('returns In Game status when isInGame is 1', () => {
            const response = makeApexBridgeResponse({
                realtime: { isOnline: 1, isInGame: 1 },
            });
            const embed = buildApexPlayerEmbed(response);
            expect(embed.status).toBe('🎮 In Game');
        });

        it('caps top stats at 3 entries', () => {
            const response = makeApexBridgeResponse();
            response.legends.selected = {
                Lifeline: {
                    data: [
                        { key: 'kills', name: 'Kills', value: 100 },
                        { key: 'damage', name: 'Damage', value: 200000 },
                        { key: 'wins', name: 'Wins', value: 50 },
                        { key: 'revives', name: 'Revives', value: 3000 },
                    ],
                },
            };
            const embed = buildApexPlayerEmbed(response);
            expect(embed.topStats).toHaveLength(3);
        });
    });

    describe('formatMatchHistory', () => {
        it('returns empty array for empty input', () => {
            expect(formatMatchHistory([])).toEqual([]);
        });

        it('formats a WIN match correctly', () => {
            const lines = formatMatchHistory([makeMatchResult()]);
            const line = lines[0];
            expect(line.legend).toBe('Wraith');
            expect(line.result).toContain('WIN');
            expect(line.result).toContain('🏆');
            expect(line.kills).toBe(3);
            expect(line.damage).toBe(2500);
            expect(line.rpChange).toBe(150);
        });

        it('formats a LOSS match with skull emoji', () => {
            const lines = formatMatchHistory([
                makeMatchResult({
                    result: 'LOSS',
                    wins_gained: 0,
                    rp_change: -30,
                }),
            ]);
            expect(lines[0].result).toContain('💀');
        });

        it('formats an UNKNOWN match with game controller emoji', () => {
            const lines = formatMatchHistory([
                makeMatchResult({ result: 'UNKNOWN' }),
            ]);
            expect(lines[0].result).toContain('🎮');
        });

        it('formats duration as MM:SS', () => {
            // 3661 seconds = 61 minutes 1 second
            const lines = formatMatchHistory([
                makeMatchResult({ duration_secs: 3661 }),
            ]);
            expect(lines[0].durationDisplay).toBe('61:01');
        });

        it('pads seconds with leading zero', () => {
            const lines = formatMatchHistory([
                makeMatchResult({ duration_secs: 125 }),
            ]);
            // 2 minutes, 5 seconds
            expect(lines[0].durationDisplay).toBe('2:05');
        });

        it('returns "Unknown" for null legend', () => {
            const lines = formatMatchHistory([
                makeMatchResult({ legend: null }),
            ]);
            expect(lines[0].legend).toBe('Unknown');
        });

        it('maps multiple matches in order', () => {
            const matches = [
                makeMatchResult({ id: 1, legend: 'Wraith', result: 'WIN' }),
                makeMatchResult({
                    id: 2,
                    legend: 'Bloodhound',
                    result: 'LOSS',
                }),
            ];
            const lines = formatMatchHistory(matches);
            expect(lines).toHaveLength(2);
            expect(lines[0].legend).toBe('Wraith');
            expect(lines[1].legend).toBe('Bloodhound');
        });
    });
});
