import {
    buildApexRankChangeMessage,
    buildApexSessionMessage,
    notifyApexRankChange,
    notifyApexSession,
} from '../packages/diana-core/src/plugins/diana-apex-bot/notifications/apexNotifications';

describe('apexNotifications', () => {
    describe('buildApexRankChangeMessage', () => {
        it('returns a promotion payload with correct title and color', () => {
            const msg = buildApexRankChangeMessage({
                playerName: 'TestPlayer',
                direction: 'promoted',
                newRankMsg: 'Platinum IV (1000 RP)',
                rpChange: 150,
            });

            expect(msg.title).toContain('Rank Up');
            expect(msg.description).toContain('TestPlayer');
            expect(msg.description).toContain('ranked up');
            // Platinum color
            expect(msg.colorHex).toBe(0x00cfff);
        });

        it('returns a demotion payload with correct title', () => {
            const msg = buildApexRankChangeMessage({
                playerName: 'FallenPlayer',
                direction: 'demoted',
                newRankMsg: 'Gold I (900 RP)',
                rpChange: -50,
            });

            expect(msg.title).toContain('Rank Down');
            expect(msg.description).toContain('demoted');
            expect(msg.colorHex).toBe(0xffd700); // Gold
        });

        it('includes new rank and RP change fields', () => {
            const msg = buildApexRankChangeMessage({
                playerName: 'Player',
                direction: 'promoted',
                newRankMsg: 'Diamond II (4000 RP)',
                rpChange: 200,
            });

            const rankField = msg.fields?.find((f) =>
                f.name.includes('New Rank')
            );
            const rpField = msg.fields?.find((f) =>
                f.name.includes('RP Change')
            );

            expect(rankField?.value).toContain('Diamond II');
            expect(rpField?.value).toContain('+200 RP');
        });

        it('shows negative RP change without + prefix', () => {
            const msg = buildApexRankChangeMessage({
                playerName: 'Player',
                direction: 'demoted',
                newRankMsg: 'Silver III (300 RP)',
                rpChange: -75,
            });

            const rpField = msg.fields?.find((f) =>
                f.name.includes('RP Change')
            );
            expect(rpField?.value).toContain('-75 RP');
            expect(rpField?.value).not.toContain('+-75');
        });

        it('falls back to default color for unknown tier', () => {
            const msg = buildApexRankChangeMessage({
                playerName: 'Player',
                direction: 'promoted',
                newRankMsg: 'UnknownTier I (100 RP)',
                rpChange: 50,
            });
            expect(msg.colorHex).toBe(0x3498db);
        });

        it('sets thumbnailUrl when rankIconUrl is provided', () => {
            const msg = buildApexRankChangeMessage({
                playerName: 'Player',
                direction: 'promoted',
                newRankMsg: 'Diamond I (5000 RP)',
                rpChange: 300,
                rankIconUrl: 'https://example.com/diamond.png',
            });
            expect(msg.thumbnailUrl).toBe('https://example.com/diamond.png');
        });

        it('leaves thumbnailUrl undefined when rankIconUrl is null', () => {
            const msg = buildApexRankChangeMessage({
                playerName: 'Player',
                direction: 'promoted',
                newRankMsg: 'Rookie IV (0 RP)',
                rpChange: 10,
                rankIconUrl: null,
            });
            expect(msg.thumbnailUrl).toBeUndefined();
        });
    });

    describe('buildApexSessionMessage', () => {
        const baseInput = {
            playerName: 'ProPlayer',
            legend: 'Wraith',
            rpChange: 150,
            newRankMsg: 'Platinum II (1500 RP)',
            killsGained: 5,
            damageGained: 2800,
            winsGained: 1,
        };

        it('returns a session update payload with correct title', () => {
            const msg = buildApexSessionMessage(baseInput);
            expect(msg.title).toContain('Session Update');
            expect(msg.description).toContain('ProPlayer');
        });

        it('uses the rank color for the embed', () => {
            const msg = buildApexSessionMessage(baseInput);
            // Platinum color
            expect(msg.colorHex).toBe(0x00cfff);
        });

        it('includes RP change, current rank, and legend fields', () => {
            const msg = buildApexSessionMessage(baseInput);
            const fieldNames = msg.fields?.map((f) => f.name) ?? [];
            expect(fieldNames.some((n) => n.includes('RP Change'))).toBe(true);
            expect(fieldNames.some((n) => n.includes('Current Rank'))).toBe(
                true
            );
            expect(fieldNames.some((n) => n.includes('Legend'))).toBe(true);
        });

        it('shows + prefix for positive RP change', () => {
            const msg = buildApexSessionMessage(baseInput);
            const rpField = msg.fields?.find((f) =>
                f.name.includes('RP Change')
            );
            expect(rpField?.value).toContain('+150 RP');
        });

        it('shows kills, damage, and wins when non-zero', () => {
            const msg = buildApexSessionMessage(baseInput);
            const fieldNames = msg.fields?.map((f) => f.name) ?? [];
            expect(fieldNames.some((n) => n.includes('Kills'))).toBe(true);
            expect(fieldNames.some((n) => n.includes('Damage'))).toBe(true);
            expect(fieldNames.some((n) => n.includes('Win'))).toBe(true);
        });

        it('shows stats note when snapshots are present but all zero', () => {
            const msg = buildApexSessionMessage({
                ...baseInput,
                killsGained: 0,
                damageGained: 0,
                winsGained: 0,
            });
            const fieldNames = msg.fields?.map((f) => f.name) ?? [];
            expect(fieldNames.some((n) => n.includes('Kills'))).toBe(false);
            expect(fieldNames.some((n) => n.includes('Damage'))).toBe(false);
            expect(fieldNames.some((n) => n.includes('Stats'))).toBe(true);
        });

        it('omits stats section entirely when snapshots are null (first session)', () => {
            const msg = buildApexSessionMessage({
                ...baseInput,
                killsGained: null,
                damageGained: null,
                winsGained: null,
            });
            const fieldNames = msg.fields?.map((f) => f.name) ?? [];
            expect(fieldNames.some((n) => n.includes('Kills'))).toBe(false);
            expect(fieldNames.some((n) => n.includes('Damage'))).toBe(false);
            expect(fieldNames.some((n) => n.includes('Stats'))).toBe(false);
        });

        it('shows kills when only kills is non-zero', () => {
            const msg = buildApexSessionMessage({
                ...baseInput,
                killsGained: 3,
                damageGained: 0,
                winsGained: 0,
            });
            const fieldNames = msg.fields?.map((f) => f.name) ?? [];
            expect(fieldNames.some((n) => n.includes('Kills'))).toBe(true);
            expect(fieldNames.some((n) => n.includes('Damage'))).toBe(false);
        });

        it('sets thumbnailUrl when legendIconUrl is provided', () => {
            const msg = buildApexSessionMessage({
                ...baseInput,
                legendIconUrl: 'https://example.com/wraith.png',
            });
            expect(msg.thumbnailUrl).toBe('https://example.com/wraith.png');
        });

        it('uses default color for unknown rank tier', () => {
            const msg = buildApexSessionMessage({
                ...baseInput,
                newRankMsg: 'UnknownTier I (100 RP)',
            });
            expect(msg.colorHex).toBe(0x95a5a6);
        });
    });

    describe('notifyApexRankChange', () => {
        it('calls adapter.sendMessage with the rank change payload', async () => {
            const sendMessage = jest.fn().mockResolvedValue(undefined);
            const adapter = { sendMessage };

            const result = await notifyApexRankChange(adapter as any, {
                playerName: 'Player',
                direction: 'promoted',
                newRankMsg: 'Diamond I (5000 RP)',
                rpChange: 300,
                discordChannelId: 'chan-123',
            });

            expect(sendMessage).toHaveBeenCalledWith(
                { channelId: 'chan-123' },
                expect.objectContaining({
                    title: expect.stringContaining('Rank Up'),
                })
            );
            expect(result).toBe(true);
        });

        it('returns true and logs warning when adapter is null', async () => {
            const warnSpy = jest
                .spyOn(console, 'warn')
                .mockImplementation(() => {});
            const result = await notifyApexRankChange(null, {
                playerName: 'Player',
                direction: 'promoted',
                newRankMsg: 'Master (11000 RP)',
                rpChange: 100,
                discordChannelId: 'chan-abc',
            });
            expect(result).toBe(true);
            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
        });

        it('returns false and logs error when adapter throws', async () => {
            const sendMessage = jest
                .fn()
                .mockRejectedValue(new Error('network error'));
            const errorSpy = jest
                .spyOn(console, 'error')
                .mockImplementation(() => {});
            const result = await notifyApexRankChange({ sendMessage } as any, {
                playerName: 'Player',
                direction: 'demoted',
                newRankMsg: 'Gold IV (800 RP)',
                rpChange: -100,
                discordChannelId: 'chan-xyz',
            });
            expect(result).toBe(false);
            expect(errorSpy).toHaveBeenCalled();
            errorSpy.mockRestore();
        });
    });

    describe('notifyApexSession', () => {
        it('calls adapter.sendMessage with session payload', async () => {
            const sendMessage = jest.fn().mockResolvedValue(undefined);
            const adapter = { sendMessage };

            const result = await notifyApexSession(adapter as any, {
                playerName: 'Player',
                legend: 'Bloodhound',
                rpChange: 125,
                newRankMsg: 'Gold II (1000 RP)',
                killsGained: 3,
                damageGained: 1500,
                winsGained: 0,
                discordChannelId: 'chan-999',
            });

            expect(sendMessage).toHaveBeenCalledWith(
                { channelId: 'chan-999' },
                expect.objectContaining({
                    title: expect.stringContaining('Session Update'),
                })
            );
            expect(result).toBe(true);
        });

        it('returns true and logs warning when adapter is null', async () => {
            const warnSpy = jest
                .spyOn(console, 'warn')
                .mockImplementation(() => {});
            const result = await notifyApexSession(null, {
                playerName: 'Player',
                legend: 'Wraith',
                rpChange: 50,
                newRankMsg: 'Silver I (500 RP)',
                killsGained: null,
                damageGained: null,
                winsGained: null,
                discordChannelId: 'chan-abc',
            });
            expect(result).toBe(true);
            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
        });
    });
});
