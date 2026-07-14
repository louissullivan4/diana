import { buildSparkline } from '../packages/diana-core/src/plugins/diana-league-bot/utils/sparkline';

describe('buildSparkline', () => {
    it('returns an empty string for no values', () => {
        expect(buildSparkline([])).toBe('');
    });

    it('renders a flat series as mid-height blocks', () => {
        expect(buildSparkline([50, 50, 50])).toBe('▄▄▄');
    });

    it('renders min as the lowest block and max as the highest', () => {
        const line = buildSparkline([0, 100]);
        expect(line[0]).toBe('▁');
        expect(line[1]).toBe('█');
    });

    it('renders a monotonic climb left to right', () => {
        const line = buildSparkline([10, 20, 30, 40, 50, 60, 70, 80]);
        const blocks = '▁▂▃▄▅▆▇█';
        expect(line).toBe(blocks);
    });

    it('keeps only the most recent points beyond the width cap', () => {
        const values = Array.from({ length: 50 }, (_, i) => i);
        const line = buildSparkline(values, 20);
        expect([...line]).toHaveLength(20);
        // Last (most recent, highest) value must render as the top block.
        expect([...line].pop()).toBe('█');
    });

    it('ignores non-finite values', () => {
        const line = buildSparkline([10, NaN, Infinity, 20]);
        expect([...line]).toHaveLength(2);
    });

    it('handles a single value', () => {
        expect(buildSparkline([42])).toBe('▄');
    });
});
