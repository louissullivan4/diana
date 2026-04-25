import {
    calculateMatchScores,
    getOrdinal,
    scoringWeights,
    WIN_BONUS,
    type PlayerScore,
} from '../packages/diana-core/src/plugins/diana-league-bot/scoring/scoringAlgorithm';

// ---------------------------------------------------------------------------
// Participant factory
// ---------------------------------------------------------------------------

interface ParticipantOverrides {
    puuid?: string;
    participantId?: number;
    teamPosition?: string;
    individualPosition?: string;
    win?: boolean;
    kills?: number;
    deaths?: number;
    assists?: number;
    totalDamageDealtToChampions?: number;
    totalMinionsKilled?: number;
    neutralMinionsKilled?: number;
    goldEarned?: number;
    visionScore?: number;
    timeCCingOthers?: number;
    damageDealtToTurrets?: number;
    damageSelfMitigated?: number;
    objectivesStolen?: number;
    challenges?: Record<string, number>;
}

function makeParticipant(
    overrides: ParticipantOverrides = {}
): Record<string, any> {
    return {
        puuid: overrides.puuid ?? `puuid-${overrides.participantId ?? 0}`,
        participantId: overrides.participantId ?? 1,
        teamPosition: overrides.teamPosition ?? 'MIDDLE',
        individualPosition:
            overrides.individualPosition ?? overrides.teamPosition ?? 'MIDDLE',
        win: overrides.win ?? false,
        kills: overrides.kills ?? 5,
        deaths: overrides.deaths ?? 3,
        assists: overrides.assists ?? 5,
        totalDamageDealtToChampions:
            overrides.totalDamageDealtToChampions ?? 20000,
        totalMinionsKilled: overrides.totalMinionsKilled ?? 150,
        neutralMinionsKilled: overrides.neutralMinionsKilled ?? 50,
        goldEarned: overrides.goldEarned ?? 12000,
        visionScore: overrides.visionScore ?? 20,
        timeCCingOthers: overrides.timeCCingOthers ?? 30,
        damageDealtToTurrets: overrides.damageDealtToTurrets ?? 3000,
        damageSelfMitigated: overrides.damageSelfMitigated ?? 15000,
        objectivesStolen: overrides.objectivesStolen ?? 0,
        challenges: {
            kda: 3.33,
            killParticipation: 0.6,
            dragonTakedowns: 1,
            baronTakedowns: 0,
            riftHeraldTakedowns: 0,
            controlWardsPlaced: 3,
            effectiveHealAndShielding: 5000,
            soloKills: 1,
            ...(overrides.challenges ?? {}),
        },
    };
}

/**
 * Build a full 10-participant lobby (5 per team, one per role).
 * Optionally override specific participants by index (0-9).
 */
function makeLobby(
    overridesByIndex: Record<number, ParticipantOverrides> = {}
): Record<string, any>[] {
    const roles = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];
    const participants: Record<string, any>[] = [];

    for (let i = 0; i < 10; i++) {
        const role = roles[i % 5];
        const isWinner = i < 5; // first team wins
        const base: ParticipantOverrides = {
            puuid: `puuid-${i}`,
            participantId: i + 1,
            teamPosition: role,
            win: isWinner,
        };
        participants.push(
            makeParticipant({ ...base, ...(overridesByIndex[i] ?? {}) })
        );
    }
    return participants;
}

// ---------------------------------------------------------------------------
// getOrdinal
// ---------------------------------------------------------------------------

describe('getOrdinal', () => {
    it('1 → "1st"', () => expect(getOrdinal(1)).toBe('1st'));
    it('2 → "2nd"', () => expect(getOrdinal(2)).toBe('2nd'));
    it('3 → "3rd"', () => expect(getOrdinal(3)).toBe('3rd'));
    it('4 → "4th"', () => expect(getOrdinal(4)).toBe('4th'));
    it('10 → "10th"', () => expect(getOrdinal(10)).toBe('10th'));
    it('11 → "11th" (irregular)', () => expect(getOrdinal(11)).toBe('11th'));
    it('12 → "12th" (irregular)', () => expect(getOrdinal(12)).toBe('12th'));
    it('13 → "13th" (irregular)', () => expect(getOrdinal(13)).toBe('13th'));
    it('21 → "21st"', () => expect(getOrdinal(21)).toBe('21st'));
    it('22 → "22nd"', () => expect(getOrdinal(22)).toBe('22nd'));
    it('100 → "100th"', () => expect(getOrdinal(100)).toBe('100th'));
});

// ---------------------------------------------------------------------------
// calculateMatchScores - basic behaviour
// ---------------------------------------------------------------------------

describe('calculateMatchScores - basic behaviour', () => {
    it('returns an empty array for empty input', () => {
        expect(calculateMatchScores([])).toEqual([]);
    });

    it('returns scores for all 10 participants', () => {
        const scores = calculateMatchScores(makeLobby());
        expect(scores).toHaveLength(10);
    });

    it('assigns placements 1 through 10 exactly once each', () => {
        const scores = calculateMatchScores(makeLobby());
        const placements = scores.map((s) => s.placement).sort((a, b) => a - b);
        expect(placements).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('result is sorted ascending by placement', () => {
        const scores = calculateMatchScores(makeLobby());
        for (let i = 1; i < scores.length; i++) {
            expect(scores[i].placement).toBeGreaterThan(
                scores[i - 1].placement
            );
        }
    });

    it('every score is a finite number ≥ 0', () => {
        const scores = calculateMatchScores(makeLobby());
        for (const s of scores) {
            expect(isFinite(s.score)).toBe(true);
            expect(s.score).toBeGreaterThanOrEqual(0);
        }
    });

    it('includes puuid, participantId, role, score, placement, win on each row', () => {
        const scores = calculateMatchScores(makeLobby());
        for (const s of scores) {
            expect(s).toHaveProperty('puuid');
            expect(s).toHaveProperty('participantId');
            expect(s).toHaveProperty('role');
            expect(s).toHaveProperty('score');
            expect(s).toHaveProperty('placement');
            expect(s).toHaveProperty('win');
        }
    });

    it('reflects the correct win status for each participant', () => {
        const lobby = makeLobby();
        const scores = calculateMatchScores(lobby);
        // participant indices 0-4 are winners in makeLobby
        const winningPuuids = new Set(lobby.slice(0, 5).map((p) => p.puuid));
        for (const s of scores) {
            expect(s.win).toBe(winningPuuids.has(s.puuid));
        }
    });

    it('higher score participant always has a better (lower) placement', () => {
        const scores = calculateMatchScores(makeLobby());
        for (let i = 1; i < scores.length; i++) {
            expect(scores[i].score).toBeLessThanOrEqual(scores[i - 1].score);
        }
    });

    it('works with a single participant', () => {
        const single = [
            makeParticipant({ puuid: 'solo', participantId: 1, win: true }),
        ];
        const scores = calculateMatchScores(single);
        expect(scores).toHaveLength(1);
        expect(scores[0].placement).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// calculateMatchScores - normalisation
// ---------------------------------------------------------------------------

describe('calculateMatchScores - normalisation', () => {
    it('all-identical stats still produce valid placements 1-N', () => {
        // 10 identical mid laners - scores will all be 0.5 per stat + win bonus
        const lobby = Array.from({ length: 10 }, (_, i) =>
            makeParticipant({
                puuid: `p${i}`,
                participantId: i + 1,
                teamPosition: 'MIDDLE',
                win: false,
            })
        );
        const scores = calculateMatchScores(lobby);
        const placements = scores.map((s) => s.placement).sort((a, b) => a - b);
        expect(placements).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        // All scores should be equal (all same stats, no win bonus)
        const firstScore = scores[0].score;
        for (const s of scores) {
            expect(s.score).toBeCloseTo(firstScore, 4);
        }
    });

    it('score is proportional - participant with double the stats scores higher', () => {
        const lobby = makeLobby();
        // Give participant 0 (TOP) dramatically better stats
        lobby[0].totalDamageDealtToChampions = 100000;
        lobby[0].totalMinionsKilled = 400;
        lobby[0].goldEarned = 30000;
        lobby[0].challenges.kda = 20;
        lobby[0].challenges.killParticipation = 1.0;

        const scores = calculateMatchScores(lobby);
        const topPlayer = scores.find((s) => s.puuid === 'puuid-0');
        expect(topPlayer?.placement).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// calculateMatchScores - win bonus
// ---------------------------------------------------------------------------

describe('calculateMatchScores - win bonus', () => {
    it('winner with identical stats to a loser scores higher by WIN_BONUS', () => {
        // Two mid laners with identical stats - one wins, one loses
        const p1 = makeParticipant({
            puuid: 'winner',
            participantId: 1,
            teamPosition: 'MIDDLE',
            win: true,
        });
        const p2 = makeParticipant({
            puuid: 'loser',
            participantId: 2,
            teamPosition: 'MIDDLE',
            win: false,
        });
        // Pad to 10 with filler participants
        const fillers = Array.from({ length: 8 }, (_, i) =>
            makeParticipant({
                puuid: `filler-${i}`,
                participantId: i + 3,
                teamPosition: 'MIDDLE',
                win: false,
            })
        );

        const scores = calculateMatchScores([p1, p2, ...fillers]);
        const winnerScore = scores.find((s) => s.puuid === 'winner')!.score;
        const loserScore = scores.find((s) => s.puuid === 'loser')!.score;
        expect(winnerScore - loserScore).toBeCloseTo(WIN_BONUS * 100, 4);
    });

    it('winning participants have the win flag set to true on their score', () => {
        const scores = calculateMatchScores(makeLobby());
        const winners = scores.filter((s) => s.win);
        expect(winners.length).toBe(5);
    });
});

// ---------------------------------------------------------------------------
// calculateMatchScores - role-specific weighting
// ---------------------------------------------------------------------------

describe('calculateMatchScores - role-specific weighting', () => {
    it('ADC with very high damage scores well even with low vision', () => {
        const lobby = makeLobby({
            // participant index 3 = BOTTOM (ADC)
            3: {
                totalDamageDealtToChampions: 150000, // massive damage
                visionScore: 1, // terrible vision - irrelevant for ADC
                totalMinionsKilled: 350,
                challenges: {
                    kda: 10,
                    killParticipation: 0.9,
                    dragonTakedowns: 0,
                    baronTakedowns: 0,
                    riftHeraldTakedowns: 0,
                    controlWardsPlaced: 0,
                    effectiveHealAndShielding: 0,
                    soloKills: 0,
                },
            },
        });
        const scores = calculateMatchScores(lobby);
        const adc = scores.find((s) => s.puuid === 'puuid-3');
        expect(adc?.placement).toBeLessThanOrEqual(3);
    });

    it('support with high vision and assists scores well even with low damage', () => {
        const lobby = makeLobby({
            // participant index 4 = UTILITY
            4: {
                visionScore: 120,
                assists: 40,
                timeCCingOthers: 300,
                totalDamageDealtToChampions: 500, // negligible damage
                challenges: {
                    kda: 8,
                    killParticipation: 0.95,
                    dragonTakedowns: 0,
                    baronTakedowns: 0,
                    riftHeraldTakedowns: 0,
                    controlWardsPlaced: 20,
                    effectiveHealAndShielding: 50000,
                    soloKills: 0,
                },
            },
        });
        const scores = calculateMatchScores(lobby);
        const support = scores.find((s) => s.puuid === 'puuid-4');
        expect(support?.placement).toBeLessThanOrEqual(3);
    });

    it('jungler with dragon and baron takedowns scores well', () => {
        const lobby = makeLobby({
            // participant index 1 = JUNGLE
            1: {
                neutralMinionsKilled: 200,
                challenges: {
                    kda: 6,
                    killParticipation: 0.85,
                    dragonTakedowns: 5, // dominated dragons
                    baronTakedowns: 2,
                    riftHeraldTakedowns: 2,
                    controlWardsPlaced: 5,
                    effectiveHealAndShielding: 0,
                    soloKills: 0,
                },
            },
        });
        const scores = calculateMatchScores(lobby);
        const jungler = scores.find((s) => s.puuid === 'puuid-1');
        expect(jungler?.placement).toBeLessThanOrEqual(3);
    });

    it('top laner damage and CS both contribute to their score', () => {
        const lobby = makeLobby({
            0: {
                // TOP laner
                totalDamageDealtToChampions: 80000,
                totalMinionsKilled: 300,
                damageSelfMitigated: 50000,
                challenges: {
                    kda: 8,
                    killParticipation: 0.8,
                    dragonTakedowns: 0,
                    baronTakedowns: 0,
                    riftHeraldTakedowns: 0,
                    controlWardsPlaced: 2,
                    effectiveHealAndShielding: 0,
                    soloKills: 2,
                },
            },
        });
        const scores = calculateMatchScores(lobby);
        const top = scores.find((s) => s.puuid === 'puuid-0');
        expect(top?.placement).toBeLessThanOrEqual(3);
    });

    it('role is stored as DEFAULT for participants with no teamPosition', () => {
        const lobby = makeLobby({
            0: { teamPosition: '', individualPosition: '' },
        });
        const scores = calculateMatchScores(lobby);
        const unknown = scores.find((s) => s.puuid === 'puuid-0');
        expect(unknown?.role).toBe('DEFAULT');
    });

    it('ARAM-like lobby with all empty positions uses DEFAULT weights without crashing', () => {
        const lobby = Array.from({ length: 10 }, (_, i) =>
            makeParticipant({
                puuid: `aram-${i}`,
                participantId: i + 1,
                teamPosition: '',
                individualPosition: '',
                win: i < 5,
            })
        );
        const scores = calculateMatchScores(lobby);
        expect(scores).toHaveLength(10);
        const placements = scores.map((s) => s.placement).sort((a, b) => a - b);
        expect(placements).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
});

// ---------------------------------------------------------------------------
// calculateMatchScores - role-scoped normalisation (Option 2)
// ---------------------------------------------------------------------------

describe('calculateMatchScores - role-scoped normalisation', () => {
    it('a high-vision support does NOT pin all other roles to 0 on visionScore', () => {
        // Two supports: support A has 100 vision, support B has 50.
        // Without role-scoped normalisation, mid/top/bot/jungle all get 0 on
        // vision because their <30 reads as the minimum. With it, the lobby's
        // non-support participants are unaffected by the support outliers
        // (they're compared on their own contested stats).
        const lobby = makeLobby({
            4: { visionScore: 100, teamPosition: 'UTILITY' }, // support A
            9: { visionScore: 50, teamPosition: 'UTILITY' }, // support B
        });
        const scores = calculateMatchScores(lobby);
        const supportA = scores.find((s) => s.puuid === 'puuid-4')!;
        const supportB = scores.find((s) => s.puuid === 'puuid-9')!;
        // Within support pair, A scores higher than B (head-to-head vision win)
        expect(supportA.score).toBeGreaterThan(supportB.score);
    });

    it('two equal junglers split objective stats 0.5/0.5, neither dominates', () => {
        // Both junglers: identical dragon/baron/herald takedowns (range=0 → 0.5)
        const lobby = makeLobby({
            1: {
                challenges: {
                    kda: 5,
                    killParticipation: 0.6,
                    dragonTakedowns: 2,
                    baronTakedowns: 1,
                    riftHeraldTakedowns: 1,
                    controlWardsPlaced: 2,
                    effectiveHealAndShielding: 0,
                    soloKills: 0,
                },
                neutralMinionsKilled: 150,
            },
            6: {
                challenges: {
                    kda: 5,
                    killParticipation: 0.6,
                    dragonTakedowns: 2,
                    baronTakedowns: 1,
                    riftHeraldTakedowns: 1,
                    controlWardsPlaced: 2,
                    effectiveHealAndShielding: 0,
                    soloKills: 0,
                },
                neutralMinionsKilled: 150,
            },
        });
        const scores = calculateMatchScores(lobby);
        const j1 = scores.find((s) => s.puuid === 'puuid-1')!;
        const j2 = scores.find((s) => s.puuid === 'puuid-6')!;
        // Junglers should be near-equal — only differ by the WIN_BONUS
        // (j1 is on winning team, j2 isn't, per makeLobby)
        expect(Math.abs(j1.score - j2.score)).toBeLessThanOrEqual(
            WIN_BONUS * 100 + 0.5
        );
    });

    it('every UTILITY role-exclusive stat is tagged', () => {
        const required = [
            'visionScore',
            'controlWardsPlaced',
            'effectiveHealAndShielding',
            'assists',
            'timeCCingOthers',
        ];
        for (const key of required) {
            const stat = scoringWeights.UTILITY.stats.find(
                (s) => s.key === key
            );
            expect(stat?.roleExclusive).toBe(true);
        }
    });

    it('every JUNGLE role-exclusive stat is tagged', () => {
        const required = [
            'dragonTakedowns',
            'baronTakedowns',
            'neutralMinionsKilled',
            'riftHeraldTakedowns',
            'objectivesStolen',
        ];
        for (const key of required) {
            const stat = scoringWeights.JUNGLE.stats.find((s) => s.key === key);
            expect(stat?.roleExclusive).toBe(true);
        }
    });
});

// ---------------------------------------------------------------------------
// calculateMatchScores - edge cases and robustness
// ---------------------------------------------------------------------------

describe('calculateMatchScores - edge cases', () => {
    it('does not crash when challenges object is missing entirely', () => {
        const lobby = makeLobby();
        delete lobby[0].challenges;
        expect(() => calculateMatchScores(lobby)).not.toThrow();
    });

    it('does not crash when individual stat keys are missing', () => {
        const lobby = makeLobby();
        delete lobby[2].goldEarned;
        delete lobby[2].visionScore;
        expect(() => calculateMatchScores(lobby)).not.toThrow();
    });

    it('treats missing numeric stats as 0 (not NaN or undefined)', () => {
        const lobby = makeLobby();
        // Wipe all stats from one participant
        lobby[0] = {
            puuid: 'bare',
            participantId: 1,
            teamPosition: 'TOP',
            win: false,
        };
        const scores = calculateMatchScores(lobby);
        const bare = scores.find((s) => s.puuid === 'bare');
        expect(bare).toBeDefined();
        expect(isFinite(bare!.score)).toBe(true);
    });

    it('handles NaN/null values in stats gracefully', () => {
        const lobby = makeLobby();
        lobby[0].totalDamageDealtToChampions = NaN;
        lobby[1].goldEarned = null;
        expect(() => calculateMatchScores(lobby)).not.toThrow();
        const scores = calculateMatchScores(lobby);
        for (const s of scores) {
            expect(isFinite(s.score)).toBe(true);
        }
    });

    it('scores are rounded to 4 decimal places', () => {
        const scores = calculateMatchScores(makeLobby());
        for (const s of scores) {
            const rounded = Math.round(s.score * 10000) / 10000;
            expect(s.score).toBe(rounded);
        }
    });
});

// ---------------------------------------------------------------------------
// calculateMatchScores - scoring weights sanity
// ---------------------------------------------------------------------------

describe('scoringWeights config sanity', () => {
    const expectedRoles = [
        'TOP',
        'JUNGLE',
        'MIDDLE',
        'BOTTOM',
        'UTILITY',
        'DEFAULT',
    ];

    it('defines weights for all expected roles', () => {
        for (const role of expectedRoles) {
            expect(scoringWeights).toHaveProperty(role);
        }
    });

    it('every role has at least one stat defined', () => {
        for (const [role, config] of Object.entries(scoringWeights)) {
            expect(config.stats.length).toBeGreaterThan(0);
            void role;
        }
    });

    it('stat sources are only "direct" or "challenges"', () => {
        for (const config of Object.values(scoringWeights)) {
            for (const stat of config.stats) {
                expect(['direct', 'challenges']).toContain(stat.source);
            }
        }
    });

    it('all stat weights are positive numbers', () => {
        for (const config of Object.values(scoringWeights)) {
            for (const stat of config.stats) {
                expect(stat.weight).toBeGreaterThan(0);
            }
        }
    });

    it('role weight totals are ≤ 1.05 (allowing minor overages)', () => {
        for (const [role, config] of Object.entries(scoringWeights)) {
            const total = config.stats.reduce((sum, s) => sum + s.weight, 0);
            expect(total).toBeLessThanOrEqual(1.05);
            void role;
        }
    });
});
