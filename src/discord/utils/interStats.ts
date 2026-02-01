import { db } from '../../api/utils/db';

export const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

export interface RiotParticipant {
    puuid: string;
    championName?: string;
    totalDamageDealtToChampions?: number;
    kills?: number;
    deaths?: number;
    assists?: number;
    win?: boolean;
    teamId?: number;
    teamPosition?: string;
    individualPosition?: string;
    goldEarned?: number;
    visionScore?: number;
    profileIcon?: number;
    riotIdGameName?: string;
    riotIdTagline?: string;
    summonerLevel?: number;
}

export interface RawMatchRow {
    puuid: string;
    gameName: string;
    tagLine: string;
    deepLolLink?: string | null;
    matchId: string;
    queueId?: number | string | null;
    gameDuration?: number | string | null;
    participants: string | RiotParticipant[];
    gameCreation: string | number | null;
}

export interface InterCandidate {
    puuid: string;
    displayName: string;
    deepLolLink?: string | null;
    matchesPlayed: number;
    wins: number;
    losses: number;
    totalDamage: number;
    totalKills: number;
    totalDeaths: number;
    totalAssists: number;
    totalVisionScore: number;
    latestProfileIconId?: number;
    avgDamage: number;
    kdaRatio: number;
    winRate: number;
    avgVisionScore: number;
}

export function parseParticipants(
    participants: RawMatchRow['participants']
): RiotParticipant[] {
    if (!participants) return [];

    if (Array.isArray(participants)) {
        return participants as RiotParticipant[];
    }

    if (typeof participants === 'string') {
        try {
            const parsed = JSON.parse(participants);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    return [];
}

function buildDisplayName(gameName: string, tagLine: string) {
    return tagLine ? `${gameName}#${tagLine}` : gameName;
}

export async function getInterCandidatesSince(
    sinceTimestamp: number,
    targetPuuid?: string
): Promise<InterCandidate[]> {
    const params: Array<string | number> = [sinceTimestamp];

    let query = `
        SELECT
            s."puuid",
            s."gameName",
            s."tagLine",
            s."deepLolLink",
            md."matchId",
            md."participants",
            md."gameCreation"
        FROM summoners s
        JOIN match_details md ON md."entryPlayerPuuid" = s."puuid"
        WHERE md."gameCreation" IS NOT NULL
          AND md."gameCreation" >= $1
    `;

    if (targetPuuid) {
        query += ' AND s."puuid" = $2';
        params.push(targetPuuid);
    }

    query += ' ORDER BY md."gameCreation" DESC';

    const result = await db.query(query, params);
    const rows: RawMatchRow[] = result.rows;

    const accumulator = new Map<
        string,
        InterCandidate & { matchIds: Set<string> }
    >();

    for (const row of rows) {
        const { puuid, gameName, tagLine, deepLolLink, participants, matchId } =
            row;

        if (!matchId) continue;
        if (targetPuuid && puuid !== targetPuuid) continue;

        let candidate = accumulator.get(puuid);

        if (!candidate) {
            candidate = {
                puuid,
                displayName: buildDisplayName(gameName, tagLine),
                deepLolLink,
                matchesPlayed: 0,
                wins: 0,
                losses: 0,
                totalDamage: 0,
                totalKills: 0,
                totalDeaths: 0,
                totalAssists: 0,
                totalVisionScore: 0,
                latestProfileIconId: undefined,
                avgDamage: 0,
                kdaRatio: 0,
                winRate: 0,
                avgVisionScore: 0,
                matchIds: new Set<string>(),
            };
            accumulator.set(puuid, candidate);
        }

        if (candidate.matchIds.has(matchId)) continue;
        candidate.matchIds.add(matchId);

        const parsedParticipants = parseParticipants(participants);
        const participant = parsedParticipants.find((p) => p.puuid === puuid);

        if (!participant) continue;

        const damage = participant.totalDamageDealtToChampions ?? 0;
        const kills = participant.kills ?? 0;
        const deaths = participant.deaths ?? 0;
        const assists = participant.assists ?? 0;
        const win = participant.win ?? false;
        const visionScore = participant.visionScore ?? 0;

        candidate.matchesPlayed += 1;
        candidate.totalDamage += damage;
        candidate.totalKills += kills;
        candidate.totalDeaths += deaths;
        candidate.totalAssists += assists;
        candidate.totalVisionScore += visionScore;
        candidate.wins += win ? 1 : 0;
        candidate.losses += win ? 0 : 1;
        candidate.latestProfileIconId =
            participant.profileIcon ?? candidate.latestProfileIconId;
    }

    const candidates: InterCandidate[] = [];

    for (const entry of Array.from(accumulator.values())) {
        if (entry.matchesPlayed === 0) continue;

        const avgDamage = entry.totalDamage / entry.matchesPlayed;
        const deaths = entry.totalDeaths;
        const killContrib = entry.totalKills + entry.totalAssists;
        const kdaRatio = deaths === 0 ? killContrib : killContrib / deaths;
        const winRate = entry.matchesPlayed
            ? entry.wins / entry.matchesPlayed
            : 0;
        const avgVisionScore = entry.totalVisionScore / entry.matchesPlayed;

        const { matchIds: _matchIds, ...rest } = entry;

        candidates.push({
            ...rest,
            avgDamage,
            kdaRatio,
            winRate,
            avgVisionScore,
        });
    }

    return candidates;
}

export function getInterCandidatesLastWeek(targetPuuid?: string) {
    return getInterCandidatesSince(Date.now() - ONE_WEEK_IN_MS, targetPuuid);
}
