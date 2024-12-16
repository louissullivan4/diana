const db = require('../models/db');
const { getMatchesByPUUID, getMatchDataById } = require('../services/riotService');

const getMatchIds = async (summoner, numberOfMatches) => {
    try {
        const { rows: existingMatches } = await db.query(
            `SELECT * FROM match_ids 
             WHERE puuid = $1 
             ORDER BY updatedAt DESC 
             LIMIT $2`,
            [summoner.puuid, numberOfMatches]
        );

        const mostRecentMatchStoredTime = existingMatches.length
            ? new Date(existingMatches[0].updatedAt).getTime()
            : 0;
        const oneHourAgo = Date.now() - 60 * 60 * 1000;

        if (mostRecentMatchStoredTime >= oneHourAgo && existingMatches.length >= numberOfMatches) {
            return existingMatches;
        }

        const matchesCall = await getMatchesByPUUID(summoner.puuid, numberOfMatches);
        if (!matchesCall || matchesCall.length === 0) {
            return existingMatches;
        }

        const currentTime = new Date();

        const updatedMatches = await Promise.all(
            matchesCall.map((matchId) =>
                db.query(
                    `INSERT INTO match_ids (match_id, puuid, updatedAt)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (match_id) DO UPDATE 
                     SET updatedAt = EXCLUDED.updatedAt
                     RETURNING *`,
                    [matchId, summoner.puuid, currentTime]
                )
            )
        );

        return updatedMatches.map((result) => result.rows[0]);
    } catch (error) {
        console.error('Error in getMatchIds:', error);
        throw new Error('Failed to retrieve match IDs.');
    }
};

const getMatchDetailsById = async (matchId) => {
    try {
        const { rows: existingMatch } = await db.query(
            `SELECT * FROM match_details WHERE match_id = $1`,
            [matchId]
        );

        if (existingMatch.length > 0) {
            const lastUpdated = new Date(existingMatch[0].last_updated);
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

            if (lastUpdated > thirtyDaysAgo) {
                return existingMatch[0];
            }
        }

        const matchData = await getMatchDataById(matchId);

        if (!matchData) {
            throw new Error(`No data found for match ID: ${matchId}`);
        }

        const { metadata, info } = matchData;

        const participants = info.participants.map((participant) => ({
            puuid: participant.puuid,
            summonerId: participant.summonerId,
            summonerName: participant.summonerName,
            profileIcon: participant.profileIcon,
            championId: participant.championId,
            championName: participant.championName,
            teamId: participant.teamId,
            kills: participant.kills,
            deaths: participant.deaths,
            assists: participant.assists,
            largestKillingSpree: participant.largestKillingSpree,
            largestMultiKill: participant.largestMultiKill,
            firstBloodKill: participant.firstBloodKill,
            firstBloodAssist: participant.firstBloodAssist,
            firstTowerKill: participant.firstTowerKill,
            firstTowerAssist: participant.firstTowerAssist,
            totalDamageDealt: participant.totalDamageDealt,
            magicDamageDealt: participant.magicDamageDealt,
            physicalDamageDealt: participant.physicalDamageDealt,
            trueDamageDealt: participant.trueDamageDealt,
            totalDamageTaken: participant.totalDamageTaken,
            magicDamageTaken: participant.magicDamageTaken,
            physicalDamageTaken: participant.physicalDamageTaken,
            trueDamageTaken: participant.trueDamageTaken,
            totalHeal: participant.totalHeal,
            totalHealsOnTeammates: participant.totalHealsOnTeammates,
            damageSelfMitigated: participant.damageSelfMitigated,
            goldEarned: participant.goldEarned,
            goldSpent: participant.goldSpent,
            totalMinionsKilled: participant.totalMinionsKilled,
            neutralMinionsKilled: participant.neutralMinionsKilled,
            wardsPlaced: participant.wardsPlaced,
            wardsKilled: participant.wardsKilled,
            visionScore: participant.visionScore,
            visionWardsBoughtInGame: participant.visionWardsBoughtInGame,
            perks: participant.perks,
            timePlayed: participant.timePlayed,
            role: participant.role,
            lane: participant.lane,
            individualPosition: participant.individualPosition,
            win: participant.win,
        }));

        const teams = info.teams.map((team) => ({
            teamId: team.teamId,
            win: team.win,
            objectives: {
                baronKills: team.objectives.baron.kills,
                dragonKills: team.objectives.dragon.kills,
                towerKills: team.objectives.tower.kills,
                inhibitorKills: team.objectives.inhibitor.kills,
                nexusKills: team.objectives.nexus.kills,
                riftHeraldKills: team.objectives.riftHerald.kills,
                damageToTurrets: team.objectives.turret.damageDealt,
            },
        }));

        const matchDetails = {
            matchId: metadata.matchId,
            gameVersion: info.gameVersion,
            gameCreation: info.gameCreation,
            gameStartTime: info.gameStartTimestamp,
            gameEndTime: info.gameEndTimestamp,
            gameDuration: info.gameDuration,
            gameMode: info.gameMode,
            gameType: info.gameType,
            queueId: info.queueId,
            mapId: info.mapId,
            tournamentCode: info.tournamentCode || null,
            participants,
            teams,
        };

        await db.query(
            `INSERT INTO match_details (
                match_id, game_version, game_creation, game_start_time, game_end_time, game_duration, 
                game_mode, game_type, queue_id, map_id, tournament_code, participants, teams, last_updated
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
            ) ON CONFLICT (match_id) DO UPDATE 
            SET 
                game_version = EXCLUDED.game_version,
                game_creation = EXCLUDED.game_creation,
                game_start_time = EXCLUDED.game_start_time,
                game_end_time = EXCLUDED.game_end_time,
                game_duration = EXCLUDED.game_duration,
                game_mode = EXCLUDED.game_mode,
                game_type = EXCLUDED.game_type,
                queue_id = EXCLUDED.queue_id,
                map_id = EXCLUDED.map_id,
                tournament_code = EXCLUDED.tournament_code,
                participants = EXCLUDED.participants,
                teams = EXCLUDED.teams,
                last_updated = NOW();`
        );

        if (info.frames && info.frames.length) {
            const timelineInserts = info.frames.map((frame, index) =>
                db.query(
                    `INSERT INTO match_timeline (match_id, frame_index, timestamp, participant_frames, events)
                     VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
                    [
                        metadata.matchId,
                        index,
                        frame.timestamp,
                        JSON.stringify(frame.participantFrames),
                        JSON.stringify(frame.events),
                    ]
                )
            );
            await Promise.all(timelineInserts);
        }

        return matchDetails;
    } catch (error) {
        console.error('Error in getMatchDetailsById:', error);
        throw new Error('Failed to retrieve match details.');
    }
};


module.exports = { getMatchIds, getMatchDetailsById };
