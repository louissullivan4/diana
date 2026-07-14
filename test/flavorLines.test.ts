import {
    pickFlavorLine,
    FLAVOR_RULES,
    type FlavorContext,
} from '../packages/diana-core/src/plugins/diana-league-bot/notifications/flavorLines';

function makeCtx(overrides: Partial<FlavorContext> = {}): FlavorContext {
    return {
        result: 'win',
        kills: 5,
        deaths: 5,
        assists: 5,
        ...overrides,
    };
}

describe('pickFlavorLine', () => {
    it('returns null when no rule matches', () => {
        const line = pickFlavorLine(
            makeCtx({
                result: 'win',
                kills: 3,
                deaths: 3,
                assists: 3,
                killParticipationPct: 50,
                visionScore: 25,
                placement: 5,
                totalPlayers: 10,
            })
        );
        expect(line).toBeNull();
    });

    it('picks the highest-priority matching rule', () => {
        // Both multikill-monster (95) and lobby-mvp (80) match; multikill wins.
        const line = pickFlavorLine(
            makeCtx({ largestMultikill: 5, placement: 1 }),
            () => 0
        );
        expect(line).toContain('PENTAKILL');
    });

    it('uses the injected rng to pick among lines', () => {
        const ctx = makeCtx({ deaths: 12, kills: 1, assists: 2 });
        const first = pickFlavorLine(ctx, () => 0);
        const last = pickFlavorLine(ctx, () => 0.99);
        expect(first).not.toBeNull();
        expect(last).not.toBeNull();
        expect(first).not.toEqual(last);
    });

    it('roasts heavy deaths with the death count interpolated', () => {
        const line = pickFlavorLine(
            makeCtx({ deaths: 14, kills: 0, assists: 3 }),
            () => 0
        );
        expect(line).toContain('14');
    });

    it('praises a deathless win', () => {
        const line = pickFlavorLine(
            makeCtx({ result: 'win', deaths: 0, kills: 8, assists: 4 }),
            () => 0
        );
        expect(line).toContain('Deathless');
    });

    it('gives the wooden spoon to the last-place player', () => {
        const line = pickFlavorLine(
            makeCtx({ placement: 10, totalPlayers: 10 }),
            () => 0
        );
        expect(line).toContain('spoon');
    });

    it('does not roast low KP in remakes', () => {
        const line = pickFlavorLine(
            makeCtx({ result: 'remake', killParticipationPct: 0 })
        );
        expect(line).toBeNull();
    });

    it('skips the vision roast for short games', () => {
        const line = pickFlavorLine(
            makeCtx({ visionScore: 2, gameLengthSeconds: 600 })
        );
        expect(line).toBeNull();
    });

    it('every rule produces non-empty lines', () => {
        const richCtx = makeCtx({
            result: 'win',
            kills: 10,
            deaths: 12,
            assists: 2,
            killParticipationPct: 10,
            damagePerMinute: 900,
            soloKills: 4,
            visionScore: 1,
            enemyMissingPings: 45,
            largestMultikill: 5,
            placement: 1,
            totalPlayers: 10,
            gameLengthSeconds: 2400,
        });
        for (const rule of FLAVOR_RULES) {
            for (const line of rule.lines) {
                expect(typeof line(richCtx)).toBe('string');
                expect(line(richCtx).length).toBeGreaterThan(0);
            }
        }
    });
});
