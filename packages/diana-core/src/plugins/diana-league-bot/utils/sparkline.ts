const BLOCKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'] as const;

/**
 * Render a unicode sparkline for a series of values (oldest first).
 * Keeps the most recent `width` points when the series is longer.
 */
export function buildSparkline(values: number[], width = 20): string {
    const finite = values.filter((value) => Number.isFinite(value));
    if (finite.length === 0) return '';

    const sampled = finite.length > width ? finite.slice(-width) : finite;
    const min = Math.min(...sampled);
    const max = Math.max(...sampled);

    if (max === min) {
        return BLOCKS[3].repeat(sampled.length);
    }

    return sampled
        .map((value) => {
            const normalized = (value - min) / (max - min);
            const index = Math.min(
                BLOCKS.length - 1,
                Math.floor(normalized * BLOCKS.length)
            );
            return BLOCKS[index];
        })
        .join('');
}
