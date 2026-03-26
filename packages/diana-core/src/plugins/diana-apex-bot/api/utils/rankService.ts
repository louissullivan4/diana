import { APEX_TIER_ORDER } from '../../types.js';

const getTierIndex = (tier: string): number => {
    const normalized = tier.trim();
    const index = APEX_TIER_ORDER.findIndex(
        (t) => t.toLowerCase() === normalized.toLowerCase()
    );
    return index !== -1 ? index : -1;
};

/**
 * Returns 'promoted', 'demoted', or 'no_change' based on tier/division comparison.
 * Higher division number = lower rank within a tier (div 4 is lowest, div 1 is highest).
 */
export function determineApexRankMovement(
    previousTier: string,
    previousDiv: number,
    previousRp: number,
    currentTier: string,
    currentDiv: number,
    currentRp: number
): 'promoted' | 'demoted' | 'no_change' {
    const prevTierIdx = getTierIndex(previousTier);
    const currTierIdx = getTierIndex(currentTier);

    if (prevTierIdx === -1 || currTierIdx === -1) return 'no_change';

    if (currTierIdx > prevTierIdx) return 'promoted';
    if (currTierIdx < prevTierIdx) return 'demoted';

    // Same tier - compare division (lower number = higher rank)
    if (currentDiv < previousDiv) return 'promoted';
    if (currentDiv > previousDiv) return 'demoted';

    // Same tier and division - no promotion/demotion (just RP change)
    return 'no_change';
}

export function getRpChange(previousRp: number, currentRp: number): number {
    return currentRp - previousRp;
}

/** Format rank for display: "Platinum II (1500 RP)" */
export function formatApexRank(tier: string, div: number, rp: number): string {
    const isSingleTier = tier === 'Master' || tier === 'Apex Predator';
    if (isSingleTier) return `${tier} (${rp} RP)`;
    const divRoman = ['', 'I', 'II', 'III', 'IV'][div] ?? String(div);
    return `${tier} ${divRoman} (${rp} RP)`;
}
