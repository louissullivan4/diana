import 'dotenv/config';
import type { MessageAdapter } from '../../../core/pluginTypes.js';
import { createApexService } from '../api/utils/apexServiceFactory.js';
import {
    getAllTrackedApexPlayers,
    getApexPlayerByUid,
    getGuildsTrackingApexPlayer,
    updateApexPlayerRank,
    createApexRankHistory,
    setApexPlayerMatchId,
    extractLegendStats,
    isInActiveMatch,
    extractMatchRecordId,
} from '../api/players/playerService.js';
import {
    createApexMatchRecord,
    finishApexMatchRecord,
    getApexMatchRecord,
} from '../api/matches/apexMatchService.js';
import {
    determineApexRankMovement,
    getRpChange,
    formatApexRank,
} from '../api/utils/rankService.js';
import {
    notifyApexMatchEnd,
    notifyApexRankChange,
} from '../notifications/apexNotifications.js';
import { APEX_IN_GAME_PREFIX } from '../types.js';

const apexService = createApexService();

// Minimum match duration in ms to avoid false positives (< 3 min = noise)
const MIN_MATCH_DURATION_MS = 3 * 60 * 1000;

export async function runApexTick(
    adapter: MessageAdapter | null | undefined
): Promise<void> {
    if (process.env.STOP_BOT === 'true') return;

    let players;
    try {
        players = await getAllTrackedApexPlayers();
    } catch (err) {
        console.error('[Apex] Failed to fetch tracked players:', err);
        return;
    }

    if (players.length === 0) return;
    console.log(`[Apex] Tick — checking ${players.length} player(s)`);

    for (const player of players) {
        try {
            await processPlayer(player.uid, player.platform, adapter);
        } catch (err) {
            console.error(`[Apex] Error processing ${player.gameName}:`, err);
        }
    }
}

async function processPlayer(
    uid: string,
    platform: string,
    adapter: MessageAdapter | null | undefined
): Promise<void> {
    const data = await apexService.getPlayerByUid(uid, platform);
    const player = await getApexPlayerByUid(uid);
    if (!player) return;

    const apiRank = data.global.rank;
    const isInGame = (data.realtime?.isInGame ?? 0) === 1;
    const wasInGame = isInActiveMatch(player.currentMatchId);

    if (!wasInGame && isInGame) {
        await handleMatchStart(uid, data, player);
    } else if (wasInGame && !isInGame) {
        await handleMatchEnd(uid, platform, data, player, adapter);
    } else if (!wasInGame && !isInGame) {
        // Not in a match — update rank silently if it drifted (e.g. bot was down)
        await syncRankIfChanged(uid, player, apiRank, adapter);
    }
    // wasInGame && isInGame → still in match, nothing to do
}

async function handleMatchStart(
    uid: string,
    data: Awaited<ReturnType<typeof apexService.getPlayerByUid>>,
    player: NonNullable<Awaited<ReturnType<typeof getApexPlayerByUid>>>
): Promise<void> {
    const selectedLegend =
        data.realtime?.selectedLegend ??
        Object.keys(data.legends.selected)[0] ??
        null;

    const legendData = selectedLegend
        ? (data.legends.all[selectedLegend] ??
          data.legends.selected[selectedLegend] ??
          null)
        : null;

    const stats = extractLegendStats(legendData);
    const now = Date.now();

    const record = await createApexMatchRecord({
        player_uid: uid,
        match_start: now,
        legend: selectedLegend,
        kills_before: stats.kills,
        damage_before: stats.damage,
        wins_before: stats.wins,
        rp_before: data.global.rank.rankScore,
        tier_before: data.global.rank.rankName,
    });

    await setApexPlayerMatchId(uid, `${APEX_IN_GAME_PREFIX}${record.id}`);
    console.log(
        `[Apex] Match started for ${data.global.name} (legend: ${selectedLegend ?? 'unknown'})`
    );
}

async function handleMatchEnd(
    uid: string,
    platform: string,
    data: Awaited<ReturnType<typeof apexService.getPlayerByUid>>,
    player: NonNullable<Awaited<ReturnType<typeof getApexPlayerByUid>>>,
    adapter: MessageAdapter | null | undefined
): Promise<void> {
    const currentMatchId = player.currentMatchId!;
    const recordId = extractMatchRecordId(currentMatchId);
    const pendingRecord = await getApexMatchRecord(recordId);

    const now = Date.now();

    // Ignore very short durations — likely API noise
    if (
        pendingRecord &&
        now - Number(pendingRecord.match_start) < MIN_MATCH_DURATION_MS
    ) {
        console.log(
            `[Apex] Match for ${data.global.name} was too short (<3 min) — ignoring`
        );
        await setApexPlayerMatchId(uid, null);
        return;
    }

    const legend = pendingRecord?.legend ?? null;
    const legendData = legend
        ? (data.legends.all[legend] ?? data.legends.selected[legend] ?? null)
        : null;

    const statsAfter = extractLegendStats(legendData);
    const apiRank = data.global.rank;

    const finishedRecord = await finishApexMatchRecord({
        id: recordId,
        match_end: now,
        kills_after: statsAfter.kills,
        damage_after: statsAfter.damage,
        wins_after: statsAfter.wins,
        rp_after: apiRank.rankScore,
        tier_after: apiRank.rankName,
    });

    // Clear in-game flag
    await setApexPlayerMatchId(uid, null);

    // Update stored rank
    const oldTier = player.tier;
    const oldDiv = player.division;
    const oldRp = player.rp;
    const newTier = apiRank.rankName;
    const newDiv = apiRank.rankDiv;
    const newRp = apiRank.rankScore;

    await updateApexPlayerRank(uid, newTier, newDiv, newRp);
    await createApexRankHistory(
        `APEX_MATCH_${recordId}`,
        uid,
        newTier,
        newDiv,
        newRp
    ).catch(() => {});

    if (!finishedRecord) return;

    const killsGained =
        (finishedRecord.kills_after ?? 0) - finishedRecord.kills_before;
    const damageGained =
        (finishedRecord.damage_after ?? 0) - finishedRecord.damage_before;
    const winsGained =
        (finishedRecord.wins_after ?? 0) - finishedRecord.wins_before;
    const rpChange = newRp - oldRp;
    const durationSecs = Math.floor(
        (now - Number(finishedRecord.match_start)) / 1000
    );
    const matchResult: 'WIN' | 'LOSS' | 'UNKNOWN' =
        finishedRecord.wins_after !== null
            ? winsGained > 0
                ? 'WIN'
                : 'LOSS'
            : 'UNKNOWN';

    const rankMovement = determineApexRankMovement(
        oldTier,
        oldDiv,
        oldRp,
        newTier,
        newDiv,
        newRp
    );
    const newRankMsg = formatApexRank(newTier, newDiv, newRp);

    console.log(
        `[Apex] Match ended for ${data.global.name}: ${matchResult} | ${killsGained} kills | ${damageGained} dmg | ${rpChange > 0 ? '+' : ''}${rpChange} RP`
    );

    const guilds = await getGuildsTrackingApexPlayer(uid);
    for (const guild of guilds) {
        const channelId =
            guild.channel_id ?? process.env.DISCORD_CHANNEL_ID ?? null;
        if (!channelId) continue;

        await notifyApexMatchEnd(adapter, {
            playerName: data.global.name,
            legend: legend ?? 'Unknown',
            result: matchResult,
            durationSecs,
            killsGained,
            damageGained,
            rpChange,
            newRankMsg,
            discordChannelId: channelId,
        });

        if (rankMovement !== 'no_change') {
            await notifyApexRankChange(adapter, {
                playerName: data.global.name,
                direction: rankMovement,
                newRankMsg,
                rpChange,
                discordChannelId: channelId,
            });
        }
    }
}

async function syncRankIfChanged(
    uid: string,
    player: NonNullable<Awaited<ReturnType<typeof getApexPlayerByUid>>>,
    apiRank: { rankName: string; rankDiv: number; rankScore: number },
    _adapter: MessageAdapter | null | undefined
): Promise<void> {
    const { rankName: newTier, rankDiv: newDiv, rankScore: newRp } = apiRank;
    if (
        player.tier === newTier &&
        player.division === newDiv &&
        player.rp === newRp
    ) {
        return;
    }

    await updateApexPlayerRank(uid, newTier, newDiv, newRp);
    await createApexRankHistory(
        `APEX_SYNC_${uid}_${Date.now()}`,
        uid,
        newTier,
        newDiv,
        newRp
    ).catch(() => {});
}
