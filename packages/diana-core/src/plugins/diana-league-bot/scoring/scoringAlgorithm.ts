/**
 * Match scoring algorithm.
 *
 * Each participant in a match receives a score derived from role-specific
 * weighted stats. Stats are min-max normalised across all 10 participants in
 * the same match before weights are applied, so the score is always relative
 * to the actual lobby — a "good" CS for this match, not an absolute threshold.
 *
 * Placements are assigned 1–10 where 1 is the best performer.
 */

export interface StatDef {
    /** Key to look up on the participant (or participant.challenges) object */
    key: string;
    /** Whether the stat lives under participant.challenges or at the top level */
    source: 'direct' | 'challenges';
    /** When false the normalised value is flipped so that lower raw = higher score */
    higherIsBetter: boolean;
    /** Contribution fraction — ideally all weights per role sum to 1.0 */
    weight: number;
}

export interface RoleWeightConfig {
    stats: StatDef[];
}

/**
 * Small bonus added to winners' total score.
 * Applied after normalisation so it can only shift near-equal scores.
 */
export const WIN_BONUS = 0.05;

/**
 * Tweakable per-role stat weights.
 *
 * Role keys match Riot API teamPosition values:
 *   TOP | JUNGLE | MIDDLE | BOTTOM | UTILITY
 * DEFAULT is used for ARAM, unknown positions, or any unrecognised role.
 */
export const scoringWeights: Record<string, RoleWeightConfig> = {
    TOP: {
        stats: [
            // KDA ratio rewards strong lane presence and survivability
            { key: 'kda', source: 'challenges', higherIsBetter: true, weight: 0.25 },
            // Damage output — top laners are expected to threaten in team fights
            { key: 'totalDamageDealtToChampions', source: 'direct', higherIsBetter: true, weight: 0.20 },
            // CS reflects laning dominance
            { key: 'totalMinionsKilled', source: 'direct', higherIsBetter: true, weight: 0.15 },
            // Damage absorbed shows effective tanking / frontline value
            { key: 'damageSelfMitigated', source: 'direct', higherIsBetter: true, weight: 0.10 },
            // Gold parity — income signals win conditions being hit
            { key: 'goldEarned', source: 'direct', higherIsBetter: true, weight: 0.10 },
            // Turret pressure is a core top lane win condition
            { key: 'damageDealtToTurrets', source: 'direct', higherIsBetter: true, weight: 0.08 },
            // Being in fights matters for a champion expected to set plays
            { key: 'killParticipation', source: 'challenges', higherIsBetter: true, weight: 0.07 },
            // Vision control is expected even in solo lanes
            { key: 'visionScore', source: 'direct', higherIsBetter: true, weight: 0.05 },
        ],
    },
    JUNGLE: {
        stats: [
            // KDA captures efficient skirmishing
            { key: 'kda', source: 'challenges', higherIsBetter: true, weight: 0.20 },
            // Kill participation is the primary jungler performance metric
            { key: 'killParticipation', source: 'challenges', higherIsBetter: true, weight: 0.20 },
            // Dragon control is a core jungler objective
            { key: 'dragonTakedowns', source: 'challenges', higherIsBetter: true, weight: 0.15 },
            // Baron secures late-game win conditions
            { key: 'baronTakedowns', source: 'challenges', higherIsBetter: true, weight: 0.15 },
            // Camp clear efficiency separates good from great junglers
            { key: 'neutralMinionsKilled', source: 'direct', higherIsBetter: true, weight: 0.10 },
            // Rift Herald usage drives early tower advantages
            { key: 'riftHeraldTakedowns', source: 'challenges', higherIsBetter: true, weight: 0.07 },
            // Stealing objectives from the enemy is high-value play
            { key: 'objectivesStolen', source: 'direct', higherIsBetter: true, weight: 0.05 },
            // Vision around objectives is specifically a jungler's job
            { key: 'visionScore', source: 'direct', higherIsBetter: true, weight: 0.05 },
            // Gold income validates efficient pathing
            { key: 'goldEarned', source: 'direct', higherIsBetter: true, weight: 0.03 },
        ],
    },
    MIDDLE: {
        stats: [
            // Mid laners are expected to be primary damage dealers
            { key: 'totalDamageDealtToChampions', source: 'direct', higherIsBetter: true, weight: 0.25 },
            // KDA rewards good decision making and survivability
            { key: 'kda', source: 'challenges', higherIsBetter: true, weight: 0.20 },
            // Roaming and skirmishing show impact across the map
            { key: 'killParticipation', source: 'challenges', higherIsBetter: true, weight: 0.15 },
            // CS is the primary laning metric for mid
            { key: 'totalMinionsKilled', source: 'direct', higherIsBetter: true, weight: 0.15 },
            // Gold income validates both CS and kill leads
            { key: 'goldEarned', source: 'direct', higherIsBetter: true, weight: 0.10 },
            // Mid is a high traffic area — vision matters
            { key: 'visionScore', source: 'direct', higherIsBetter: true, weight: 0.10 },
            // Solo kills demonstrate individual skill
            { key: 'soloKills', source: 'challenges', higherIsBetter: true, weight: 0.05 },
        ],
    },
    BOTTOM: {
        stats: [
            // ADCs are the late-game primary damage source
            { key: 'totalDamageDealtToChampions', source: 'direct', higherIsBetter: true, weight: 0.30 },
            // CS is the ADC's main income vehicle early/mid game
            { key: 'totalMinionsKilled', source: 'direct', higherIsBetter: true, weight: 0.20 },
            // KDA — ADCs die often but staying alive multiplies their damage
            { key: 'kda', source: 'challenges', higherIsBetter: true, weight: 0.20 },
            // Gold tracks item progression which drives ADC power spikes
            { key: 'goldEarned', source: 'direct', higherIsBetter: true, weight: 0.15 },
            // Being in fights is important even for a positioned carry
            { key: 'killParticipation', source: 'challenges', higherIsBetter: true, weight: 0.10 },
            // ADCs should share vision duties with support
            { key: 'visionScore', source: 'direct', higherIsBetter: true, weight: 0.05 },
        ],
    },
    UTILITY: {
        stats: [
            // Vision is the entire job description of a support
            { key: 'visionScore', source: 'direct', higherIsBetter: true, weight: 0.25 },
            // Control wards are the most impactful vision tool
            { key: 'controlWardsPlaced', source: 'challenges', higherIsBetter: true, weight: 0.15 },
            // Presence in fights validates roaming and engage
            { key: 'killParticipation', source: 'challenges', higherIsBetter: true, weight: 0.15 },
            // Assists are the support's primary combat contribution
            { key: 'assists', source: 'direct', higherIsBetter: true, weight: 0.15 },
            // Healing and shielding quantifies protective value
            { key: 'effectiveHealAndShielding', source: 'challenges', higherIsBetter: true, weight: 0.15 },
            // Hard CC secures kills and saves allies
            { key: 'timeCCingOthers', source: 'direct', higherIsBetter: true, weight: 0.10 },
            // KDA matters but support deaths are less punishing
            { key: 'kda', source: 'challenges', higherIsBetter: true, weight: 0.05 },
        ],
    },
    // Fallback: used for ARAM, Swiftplay, unknown positions, and anything else
    DEFAULT: {
        stats: [
            { key: 'kda', source: 'challenges', higherIsBetter: true, weight: 0.25 },
            { key: 'totalDamageDealtToChampions', source: 'direct', higherIsBetter: true, weight: 0.25 },
            { key: 'killParticipation', source: 'challenges', higherIsBetter: true, weight: 0.20 },
            { key: 'goldEarned', source: 'direct', higherIsBetter: true, weight: 0.15 },
            { key: 'visionScore', source: 'direct', higherIsBetter: true, weight: 0.10 },
            { key: 'totalMinionsKilled', source: 'direct', higherIsBetter: true, weight: 0.05 },
        ],
    },
};

export interface PlayerScore {
    puuid: string;
    participantId: number;
    role: string;
    score: number;
    placement: number;
    win: boolean;
}

function getStatValue(
    participant: Record<string, any>,
    statDef: StatDef
): number {
    const value =
        statDef.source === 'challenges'
            ? participant.challenges?.[statDef.key]
            : participant[statDef.key];
    return typeof value === 'number' && isFinite(value) ? value : 0;
}

function minMaxNormalize(values: number[]): number[] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    // When all values are identical give everyone the midpoint rather than 0
    if (range === 0) return values.map(() => 0.5);
    return values.map((v) => (v - min) / range);
}

/**
 * Convert a placement number to a human-readable ordinal string.
 * getOrdinal(1) => "1st", getOrdinal(3) => "3rd", getOrdinal(11) => "11th"
 */
export function getOrdinal(n: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const mod100 = n % 100;
    // 11–13 are irregular ("11th", not "11st")
    const suffix =
        mod100 >= 11 && mod100 <= 13
            ? 'th'
            : (suffixes[n % 10] ?? 'th');
    return `${n}${suffix}`;
}

/**
 * Score all 10 participants in a match and return them sorted by placement.
 *
 * Each stat is min-max normalised across the whole lobby before role weights
 * are applied, so the algorithm self-adjusts to the match context.
 *
 * @param participants - Raw Riot API participant objects (all 10 from match data)
 * @returns PlayerScore[] sorted ascending by placement (index 0 = 1st place)
 */
export function calculateMatchScores(
    participants: Record<string, any>[]
): PlayerScore[] {
    if (!participants || participants.length === 0) return [];

    // Build a deduplicated set of every stat referenced by any role config
    const allStatDefs = new Map<string, StatDef>();
    for (const roleConfig of Object.values(scoringWeights)) {
        for (const stat of roleConfig.stats) {
            const cacheKey = `${stat.source}:${stat.key}`;
            if (!allStatDefs.has(cacheKey)) {
                allStatDefs.set(cacheKey, stat);
            }
        }
    }

    // Normalise every stat once across all participants — O(stats * participants)
    const normalisedCache = new Map<string, number[]>();
    for (const [cacheKey, statDef] of allStatDefs) {
        const rawValues = participants.map((p) => getStatValue(p, statDef));
        const normalised = minMaxNormalize(rawValues);
        normalisedCache.set(
            cacheKey,
            statDef.higherIsBetter
                ? normalised
                : normalised.map((v) => 1 - v)
        );
    }

    // Compute weighted score for each participant
    const rawScores = participants.map((participant, idx) => {
        const position: string =
            participant.teamPosition || participant.individualPosition || '';
        const role =
            position in scoringWeights ? position : 'DEFAULT';
        const roleConfig = scoringWeights[role];

        let total = 0;
        for (const statDef of roleConfig.stats) {
            const cacheKey = `${statDef.source}:${statDef.key}`;
            const values = normalisedCache.get(cacheKey);
            if (values) {
                total += statDef.weight * values[idx];
            }
        }

        // Win bonus applied last so it cannot dominate — only breaks ties
        if (participant.win) total += WIN_BONUS;

        return {
            puuid: String(participant.puuid ?? ''),
            participantId: Number(participant.participantId ?? idx + 1),
            role,
            score: Math.round(total * 10000) / 10000,
            win: Boolean(participant.win),
        };
    });

    // Sort descending by score and assign placements 1–N
    const sorted = [...rawScores].sort((a, b) => b.score - a.score);
    return sorted.map((s, i) => ({ ...s, placement: i + 1 }));
}
