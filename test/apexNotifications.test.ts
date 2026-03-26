import {
    buildApexRankChangeMessage,
    buildApexMatchEndMessage,
    notifyApexRankChange,
    notifyApexMatchEnd,
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
    });

    describe('buildApexMatchEndMessage', () => {
        const baseInput = {
            playerName: 'ProPlayer',
            legend: 'Wraith',
            result: 'WIN' as const,
            durationSecs: 1865,
            killsGained: 5,
            damageGained: 2800,
            rpChange: 150,
            newRankMsg: 'Platinum II (1500 RP)',
        };

        it('returns a WIN payload with green color', () => {
            const msg = buildApexMatchEndMessage(baseInput);
            expect(msg.colorHex).toBe(0x28a745);
            expect(msg.description).toContain('ProPlayer');
        });

        it('returns a LOSS payload with red color', () => {
            const msg = buildApexMatchEndMessage({
                ...baseInput,
                result: 'LOSS',
                rpChange: -30,
            });
            expect(msg.colorHex).toBe(0xe74c3c);
        });

        it('returns an UNKNOWN payload with grey color', () => {
            const msg = buildApexMatchEndMessage({
                ...baseInput,
                result: 'UNKNOWN',
                rpChange: 0,
            });
            expect(msg.colorHex).toBe(0x95a5a6);
        });

        it('formats duration correctly in footer', () => {
            // 1865 seconds = 31 minutes, 5 seconds
            const msg = buildApexMatchEndMessage(baseInput);
            expect(msg.footer).toContain('31:05');
        });

        it('includes all expected fields', () => {
            const msg = buildApexMatchEndMessage(baseInput);
            const fieldNames = msg.fields?.map((f) => f.name) ?? [];
            expect(fieldNames.some((n) => n.includes('Result'))).toBe(true);
            expect(fieldNames.some((n) => n.includes('Legend'))).toBe(true);
            expect(fieldNames.some((n) => n.includes('Kills'))).toBe(true);
            expect(fieldNames.some((n) => n.includes('Damage'))).toBe(true);
            expect(fieldNames.some((n) => n.includes('RP Change'))).toBe(true);
            expect(fieldNames.some((n) => n.includes('Current Rank'))).toBe(
                true
            );
        });

        it('shows WIN emoji in result field', () => {
            const msg = buildApexMatchEndMessage(baseInput);
            const resultField = msg.fields?.find((f) =>
                f.name.includes('Result')
            );
            expect(resultField?.name).toContain('🏆');
        });

        it('shows LOSS emoji in result field', () => {
            const msg = buildApexMatchEndMessage({
                ...baseInput,
                result: 'LOSS',
            });
            const resultField = msg.fields?.find((f) =>
                f.name.includes('Result')
            );
            expect(resultField?.name).toContain('💀');
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

    describe('notifyApexMatchEnd', () => {
        it('calls adapter.sendMessage with match end payload', async () => {
            const sendMessage = jest.fn().mockResolvedValue(undefined);
            const adapter = { sendMessage };

            const result = await notifyApexMatchEnd(adapter as any, {
                playerName: 'Player',
                legend: 'Bloodhound',
                result: 'WIN',
                durationSecs: 600,
                killsGained: 3,
                damageGained: 1500,
                rpChange: 125,
                newRankMsg: 'Gold II (1000 RP)',
                discordChannelId: 'chan-999',
            });

            expect(sendMessage).toHaveBeenCalledWith(
                { channelId: 'chan-999' },
                expect.objectContaining({
                    title: expect.stringContaining('Match Summary'),
                })
            );
            expect(result).toBe(true);
        });
    });
});
