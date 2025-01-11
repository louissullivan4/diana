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
                    `INSERT INTO match_ids (matchId, puuid, updatedAt)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (matchId) DO UPDATE 
                     SET updatedAt = EXCLUDED.updatedAt
                     RETURNING *`,
                    [matchId, summoner.puuid, currentTime]
                )
            )
        );

        return updatedMatches.map((result) => result.rows[0]);
    } catch (error) {
        throw new Error('Failed to retrieve match IDs.');
    }
};

const getMatchDetailsById = async (matchId) => {
    try {
        const { rows: existingMatch } = await db.query(
            `SELECT * FROM match_details WHERE matchId = $1`,
            [matchId]
        );

        if (existingMatch.length > 0) {
            const lastUpdated = new Date(existingMatch[0].lastUpdated);
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

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
                matchId, gameVersion, gameCreation, gameStartTime, gameEndTime, gameDuration, 
                gameMode, gameType, queueId, mapId, tournamentCode, participants, teams, lastUpdated
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
            ) ON CONFLICT (matchId) DO UPDATE 
            SET 
                gameVersion = EXCLUDED.gameVersion,
                gameCreation = EXCLUDED.gameCreation,
                gameStartTime = EXCLUDED.gameStartTime,
                gameEndTime = EXCLUDED.gameEndTime,
                gameDuration = EXCLUDED.gameDuration,
                gameMode = EXCLUDED.gameMode,
                gameType = EXCLUDED.gameType,
                queueId = EXCLUDED.queueId,
                mapId = EXCLUDED.mapId,
                tournamentCode = EXCLUDED.tournamentCode,
                participants = EXCLUDED.participants,
                teams = EXCLUDED.teams,
                lastUpdated = NOW();`
            ,
            [
                matchDetails.matchId,
                matchDetails.gameVersion,
                matchDetails.gameCreation,
                matchDetails.gameStartTime,
                matchDetails.gameEndTime,
                matchDetails.gameDuration,
                matchDetails.gameMode,
                matchDetails.gameType,
                matchDetails.queueId,
                matchDetails.mapId,
                matchDetails.tournamentCode,
                JSON.stringify(matchDetails.participants),
                JSON.stringify(matchDetails.teams),
            ]
        );

        if (info.frames && info.frames.length) {
            const timelineInserts = info.frames.map((frame, index) =>
                db.query(
                    `INSERT INTO match_timeline (matchId, frameIndex, timestamp, participantFrames, events)
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
        throw new Error('Failed to retrieve match details.');
    }
};

module.exports = { getMatchIds, getMatchDetailsById };
