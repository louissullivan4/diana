import { APEX_TIER_ORDER } from '../../types.js';

// Verified thresholds for Season 28 (Breach) — source: apexlegends.wiki.gg / gametree.me
// Format: [tier, div, minRp] ordered lowest → highest. div=0 means no divisions (Master).
// Divisions are NOT uniform — width grows from 250 (Rookie) up to 900 (Diamond).
const RANK_LADDER: {
    tier: string;
    div: number;
    minRp: number;
    label: string;
}[] = [
    { tier: 'Rookie', div: 4, minRp: 0, label: 'Rookie IV' },
    { tier: 'Rookie', div: 3, minRp: 250, label: 'Rookie III' },
    { tier: 'Rookie', div: 2, minRp: 500, label: 'Rookie II' },
    { tier: 'Rookie', div: 1, minRp: 750, label: 'Rookie I' },
    { tier: 'Bronze', div: 4, minRp: 1000, label: 'Bronze IV' },
    { tier: 'Bronze', div: 3, minRp: 1500, label: 'Bronze III' },
    { tier: 'Bronze', div: 2, minRp: 2000, label: 'Bronze II' },
    { tier: 'Bronze', div: 1, minRp: 2500, label: 'Bronze I' },
    { tier: 'Silver', div: 4, minRp: 3000, label: 'Silver IV' },
    { tier: 'Silver', div: 3, minRp: 3600, label: 'Silver III' },
    { tier: 'Silver', div: 2, minRp: 4200, label: 'Silver II' },
    { tier: 'Silver', div: 1, minRp: 4800, label: 'Silver I' },
    { tier: 'Gold', div: 4, minRp: 5400, label: 'Gold IV' },
    { tier: 'Gold', div: 3, minRp: 6100, label: 'Gold III' },
    { tier: 'Gold', div: 2, minRp: 6800, label: 'Gold II' },
    { tier: 'Gold', div: 1, minRp: 7500, label: 'Gold I' },
    { tier: 'Platinum', div: 4, minRp: 8200, label: 'Platinum IV' },
    { tier: 'Platinum', div: 3, minRp: 9000, label: 'Platinum III' },
    { tier: 'Platinum', div: 2, minRp: 9800, label: 'Platinum II' },
    { tier: 'Platinum', div: 1, minRp: 10600, label: 'Platinum I' },
    { tier: 'Diamond', div: 4, minRp: 11400, label: 'Diamond IV' },
    { tier: 'Diamond', div: 3, minRp: 12300, label: 'Diamond III' },
    { tier: 'Diamond', div: 2, minRp: 13200, label: 'Diamond II' },
    { tier: 'Diamond', div: 1, minRp: 14100, label: 'Diamond I' },
    { tier: 'Master', div: 0, minRp: 15000, label: 'Master' },
];

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

/**
 * Returns RP needed to reach the next division or tier, and its display name.
 * Returns null for Master and Apex Predator (no standard RP threshold above them).
 * div 1 = highest division in tier, div 4 = lowest.
 */
export function getRpToNextRank(
    tier: string,
    div: number,
    rp: number
): { rpNeeded: number; nextRankName: string } | null {
    if (tier === 'Apex Predator' || tier === 'Master') return null;

    const idx = RANK_LADDER.findIndex(
        (r) => r.tier.toLowerCase() === tier.toLowerCase() && r.div === div
    );
    if (idx === -1) return null;

    const next = RANK_LADDER[idx + 1];
    if (!next) return null;

    return {
        rpNeeded: Math.max(0, next.minRp - rp),
        nextRankName: next.label,
    };
}

/** Format rank for display: "Platinum II (1500 RP)" */
export function formatApexRank(tier: string, div: number, rp: number): string {
    const isSingleTier = tier === 'Master' || tier === 'Apex Predator';
    if (isSingleTier) return `${tier} (${rp} RP)`;
    const divRoman = ['', 'I', 'II', 'III', 'IV'][div] ?? String(div);
    return `${tier} ${divRoman} (${rp} RP)`;
}
