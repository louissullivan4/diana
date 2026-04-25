/**
 * Match scoring algorithm.
 *
 * Each participant in a match receives a score derived from role-specific
 * weighted stats. Stats are min-max normalised across all 10 participants in
 * the same match before weights are applied, so the score is always relative
 * to the actual lobby - a "good" CS for this match, not an absolute threshold.
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
    /** Contribution fraction - ideally all weights per role sum to 1.0 */
    weight: number;
    /**
     * When true, this stat is normalised against same-role peers in the lobby
     * (e.g. support vs support, jungle vs jungle) instead of the whole lobby.
     * Use for stats that only one role realistically competes in (vision,
     * dragon takedowns, heal/shield) so role-winners don't get a free 1.0
     * just by playing the role.
     */
    roleExclusive?: boolean;
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
            {
                key: 'kda',
                source: 'challenges',
                higherIsBetter: true,
                weight: 0.25,
            },
            // Damage output - top laners are expected to threaten in team fights
            {
                key: 'totalDamageDealtToChampions',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.2,
            },
            // CS reflects laning dominance
            {
                key: 'totalMinionsKilled',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.15,
            },
            // Damage absorbed shows effective tanking / frontline value
            {
                key: 'damageSelfMitigated',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.1,
            },
            // Gold parity - income signals win conditions being hit
            {
                key: 'goldEarned',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.1,
            },
            // Turret pressure is a core top lane win condition
            {
                key: 'damageDealtToTurrets',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.08,
            },
            // Being in fights matters for a champion expected to set plays
            {
                key: 'killParticipation',
                source: 'challenges',
                higherIsBetter: true,
                weight: 0.07,
            },
            // Vision control is expected even in solo lanes
            {
                key: 'visionScore',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.05,
            },
        ],
    },
    JUNGLE: {
        stats: [
            // KDA — contested cross-role
            {
                key: 'kda',
                source: 'challenges',
                higherIsBetter: true,
                weight: 0.22,
            },
            // Kill participation — contested cross-role
            {
                key: 'killParticipation',
                source: 'challenges',
                higherIsBetter: true,
                weight: 0.22,
            },
            // Damage to champions — contested, rewards skirmish/teamfight
            // junglers and prevents farm-only afk-jg from coasting
            {
                key: 'totalDamageDealtToChampions',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.15,
            },
            // Dragon control — only the jungler realistically takes drakes,
            // compare jungler-vs-jungler
            {
                key: 'dragonTakedowns',
                source: 'challenges',
                higherIsBetter: true,
                weight: 0.08,
                roleExclusive: true,
            },
            // Baron — same story, jungler-vs-jungler
            {
                key: 'baronTakedowns',
                source: 'challenges',
                higherIsBetter: true,
                weight: 0.08,
                roleExclusive: true,
            },
            // Gold — contested, validates efficient farming and skirmishing
            {
                key: 'goldEarned',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.07,
            },
            // Camp clear efficiency — jungler-only stat
            {
                key: 'neutralMinionsKilled',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.05,
                roleExclusive: true,
            },
            // Rift Herald — jungler-only objective
            {
                key: 'riftHeraldTakedowns',
                source: 'challenges',
                higherIsBetter: true,
                weight: 0.05,
                roleExclusive: true,
            },
            // Vision around objectives — contested with support
            {
                key: 'visionScore',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.05,
            },
            // Steals — jungler vs jungler
            {
                key: 'objectivesStolen',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.03,
                roleExclusive: true,
            },
        ],
    },
    MIDDLE: {
        stats: [
            // Mid laners are expected to be primary damage dealers
            {
                key: 'totalDamageDealtToChampions',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.25,
            },
            // KDA rewards good decision making and survivability
            {
                key: 'kda',
                source: 'challenges',
                higherIsBetter: true,
                weight: 0.2,
            },
            // Roaming and skirmishing show impact across the map
            {
                key: 'killParticipation',
                source: 'challenges',
                higherIsBetter: true,
                weight: 0.15,
            },
            // CS is the primary laning metric for mid
            {
                key: 'totalMinionsKilled',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.15,
            },
            // Gold income validates both CS and kill leads
            {
                key: 'goldEarned',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.1,
            },
            // Mid is a high traffic area - vision matters
            {
                key: 'visionScore',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.1,
            },
            // Solo kills demonstrate individual skill
            {
                key: 'soloKills',
                source: 'challenges',
                higherIsBetter: true,
                weight: 0.05,
            },
        ],
    },
    BOTTOM: {
        stats: [
            // ADCs are the late-game primary damage source
            {
                key: 'totalDamageDealtToChampions',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.3,
            },
            // CS is the ADC's main income vehicle early/mid game
            {
                key: 'totalMinionsKilled',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.2,
            },
            // KDA - ADCs die often but staying alive multiplies their damage
            {
                key: 'kda',
                source: 'challenges',
                higherIsBetter: true,
                weight: 0.2,
            },
            // Gold tracks item progression which drives ADC power spikes
            {
                key: 'goldEarned',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.15,
            },
            // Being in fights is important even for a positioned carry
            {
                key: 'killParticipation',
                source: 'challenges',
                higherIsBetter: true,
                weight: 0.1,
            },
            // ADCs should share vision duties with support
            {
                key: 'visionScore',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.05,
            },
        ],
    },
    UTILITY: {
        stats: [
            // Vision is the entire job description of a support — but supports
            // always own this stat in the lobby, so compare support-vs-support
            {
                key: 'visionScore',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.15,
                roleExclusive: true,
            },
            // Control wards: same story — only supports buy them at scale
            {
                key: 'controlWardsPlaced',
                source: 'challenges',
                higherIsBetter: true,
                weight: 0.08,
                roleExclusive: true,
            },
            // Presence in fights — contested across all roles
            {
                key: 'killParticipation',
                source: 'challenges',
                higherIsBetter: true,
                weight: 0.18,
            },
            // Assists — supports lead the lobby almost every game
            {
                key: 'assists',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.12,
                roleExclusive: true,
            },
            // Heal and shield — only enchanters generate meaningful values
            {
                key: 'effectiveHealAndShielding',
                source: 'challenges',
                higherIsBetter: true,
                weight: 0.08,
                roleExclusive: true,
            },
            // Hard CC — supports usually top this; compare support-vs-support
            {
                key: 'timeCCingOthers',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.1,
                roleExclusive: true,
            },
            // KDA — contested cross-role, weight increased so a feeding
            // support can't coast on vision alone
            {
                key: 'kda',
                source: 'challenges',
                higherIsBetter: true,
                weight: 0.12,
            },
            // Damage soaked — contested with frontline tanks/junglers
            {
                key: 'damageTakenOnTeamPercentage',
                source: 'challenges',
                higherIsBetter: true,
                weight: 0.1,
            },
            // Damage to champions — minor, but rewards engage/poke supports
            {
                key: 'totalDamageDealtToChampions',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.07,
            },
        ],
    },
    // Fallback: used for ARAM, Swiftplay, unknown positions, and anything else
    DEFAULT: {
        stats: [
            {
                key: 'kda',
                source: 'challenges',
                higherIsBetter: true,
                weight: 0.25,
            },
            {
                key: 'totalDamageDealtToChampions',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.25,
            },
            {
                key: 'killParticipation',
                source: 'challenges',
                higherIsBetter: true,
                weight: 0.2,
            },
            {
                key: 'goldEarned',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.15,
            },
            {
                key: 'visionScore',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.1,
            },
            {
                key: 'totalMinionsKilled',
                source: 'direct',
                higherIsBetter: true,
                weight: 0.05,
            },
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
        mod100 >= 11 && mod100 <= 13 ? 'th' : (suffixes[n % 10] ?? 'th');
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

    // Build a deduplicated set of every stat referenced by any role config.
    // We track whether a stat is ever used as roleExclusive so we know to
    // build per-role normalisation tables for it.
    const allStatDefs = new Map<string, StatDef>();
    for (const roleConfig of Object.values(scoringWeights)) {
        for (const stat of roleConfig.stats) {
            const cacheKey = `${stat.source}:${stat.key}`;
            if (!allStatDefs.has(cacheKey)) {
                allStatDefs.set(cacheKey, stat);
            }
        }
    }

    // Determine the effective role for every participant once
    const participantRoles: string[] = participants.map((p) => {
        const pos: string = p.teamPosition || p.individualPosition || '';
        return pos in scoringWeights ? pos : 'DEFAULT';
    });

    // Group participant indices by role for role-scoped normalisation
    const roleGroups = new Map<string, number[]>();
    for (let i = 0; i < participants.length; i++) {
        const r = participantRoles[i];
        if (!roleGroups.has(r)) roleGroups.set(r, []);
        roleGroups.get(r)!.push(i);
    }

    // Lobby-wide normalisation (used for non-role-exclusive stats)
    const lobbyNormalised = new Map<string, number[]>();
    for (const [cacheKey, statDef] of allStatDefs) {
        const rawValues = participants.map((p) => getStatValue(p, statDef));
        const normalised = minMaxNormalize(rawValues);
        lobbyNormalised.set(
            cacheKey,
            statDef.higherIsBetter ? normalised : normalised.map((v) => 1 - v)
        );
    }

    // Role-scoped normalisation for stats tagged roleExclusive on a given
    // role's config. Key: `${role}:${cacheKey}` → array indexed by lobby idx
    // (entries for participants outside the role are unused).
    const roleScopedNormalised = new Map<string, number[]>();
    for (const [role, config] of Object.entries(scoringWeights)) {
        const indices = roleGroups.get(role);
        if (!indices || indices.length === 0) continue;
        for (const stat of config.stats) {
            if (!stat.roleExclusive) continue;
            const cacheKey = `${stat.source}:${stat.key}`;
            const mapKey = `${role}:${cacheKey}`;
            if (roleScopedNormalised.has(mapKey)) continue;
            const rawValues = indices.map((i) =>
                getStatValue(participants[i], stat)
            );
            const normalised = minMaxNormalize(rawValues);
            const adjusted = stat.higherIsBetter
                ? normalised
                : normalised.map((v) => 1 - v);
            const fullArr = new Array(participants.length).fill(0);
            for (let j = 0; j < indices.length; j++) {
                fullArr[indices[j]] = adjusted[j];
            }
            roleScopedNormalised.set(mapKey, fullArr);
        }
    }

    // Compute weighted score for each participant
    const rawScores = participants.map((participant, idx) => {
        const role = participantRoles[idx];
        const roleConfig = scoringWeights[role];

        let total = 0;
        for (const statDef of roleConfig.stats) {
            const cacheKey = `${statDef.source}:${statDef.key}`;
            let value: number | undefined;
            if (statDef.roleExclusive) {
                value = roleScopedNormalised.get(`${role}:${cacheKey}`)?.[idx];
            } else {
                value = lobbyNormalised.get(cacheKey)?.[idx];
            }
            if (value !== undefined) {
                total += statDef.weight * value;
            }
        }

        // Win bonus applied last so it cannot dominate - only breaks ties
        if (participant.win) total += WIN_BONUS;

        return {
            puuid: String(participant.puuid ?? ''),
            participantId: Number(participant.participantId ?? idx + 1),
            role,
            score: Math.round((Math.round(total * 10000) / 10000) * 100),
            win: Boolean(participant.win),
        };
    });

    // Sort descending by score and assign placements 1–N
    const sorted = [...rawScores].sort((a, b) => b.score - a.score);
    return sorted.map((s, i) => ({ ...s, placement: i + 1 }));
}
