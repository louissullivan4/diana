import 'dotenv/config';
import type { MessageAdapter } from '../../../core/pluginTypes.js';
import { createApexService } from '../api/utils/apexServiceFactory.js';
import {
    getAllTrackedApexPlayers,
    getGuildsTrackingApexPlayer,
    updateApexPlayerRank,
    createApexRankHistory,
} from '../api/players/playerService.js';
import { determineApexRankMovement, getRpChange, formatApexRank } from '../api/utils/rankService.js';
import { notifyApexRankChange } from '../notifications/apexNotifications.js';

const apexService = createApexService();

export async function runApexTick(adapter: MessageAdapter | null | undefined): Promise<void> {
    if (process.env.STOP_BOT === 'true') return;

    let players;
    try {
        players = await getAllTrackedApexPlayers();
    } catch (err) {
        console.error('[Apex] Failed to fetch tracked players:', err);
        return;
    }

    if (players.length === 0) return;

    console.log(`[Apex] Checking ranks for ${players.length} tracked player(s)`);

    for (const player of players) {
        try {
            await checkPlayerRank(player.uid, player.gameName, player.platform, adapter);
        } catch (err) {
            console.error(`[Apex] Error checking rank for ${player.gameName}:`, err);
        }
    }
}

async function checkPlayerRank(
    uid: string,
    gameName: string,
    platform: string,
    adapter: MessageAdapter | null | undefined
): Promise<void> {
    const data = await apexService.getPlayerByUid(uid, platform);
    const { rank: apiRank } = data.global;

    const freshName = data.global.name;
    const newTier = apiRank.rankName;
    const newDiv = apiRank.rankDiv;
    const newRp = apiRank.rankScore;

    // We stored old rank as tier/rank(div)/lp in summoners table
    const player = await import('../api/players/playerService.js').then((m) =>
        m.getApexPlayerByUid(uid)
    );
    if (!player) return;

    const oldTier = player.tier;
    const oldDiv = parseInt(player.rank, 10) || 0;
    const oldRp = player.rp;

    const movement = determineApexRankMovement(oldTier, oldDiv, oldRp, newTier, newDiv, newRp);
    const rpChange = getRpChange(oldRp, newRp);

    // Always update stored rank
    await updateApexPlayerRank(uid, newTier, newDiv, newRp);

    // Store rank history snapshot keyed by timestamp (ISO string as matchId for apex)
    const snapshotKey = `APEX_${uid}_${Date.now()}`;
    await createApexRankHistory(snapshotKey, uid, newTier, newDiv, newRp).catch(() => {});

    if (movement === 'no_change') return;

    const guilds = await getGuildsTrackingApexPlayer(uid);
    for (const guild of guilds) {
        const channelId =
            guild.channel_id ?? process.env.DISCORD_CHANNEL_ID ?? null;
        if (!channelId) continue;

        const newRankMsg = formatApexRank(newTier, newDiv, newRp);
        await notifyApexRankChange(adapter, {
            playerName: freshName,
            direction: movement,
            newRankMsg,
            rpChange,
            discordChannelId: channelId,
        });
    }
}
