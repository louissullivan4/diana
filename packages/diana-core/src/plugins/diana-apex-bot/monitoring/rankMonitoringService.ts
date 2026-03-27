import 'dotenv/config';
import type { MessageAdapter } from '../../../core/pluginTypes.js';
import { createApexService } from '../api/utils/apexServiceFactory.js';
import {
    getAllTrackedApexPlayers,
    getApexPlayerByUid,
    getGuildsTrackingApexPlayer,
    updateApexPlayerRankAndSnapshot,
    createApexRankHistory,
    extractLegendStats,
} from '../api/players/playerService.js';
import {
    determineApexRankMovement,
    formatApexRank,
} from '../api/utils/rankService.js';
import {
    notifyApexSession,
    notifyApexRankChange,
} from '../notifications/apexNotifications.js';
import {
    getApexRankEmblem,
    getApexLegendIcon,
} from '../presentation/apexPresentation.js';

const apexService = createApexService();

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

    await postSessionIfChanged(uid, player, data, adapter);
}

async function postSessionIfChanged(
    uid: string,
    player: NonNullable<Awaited<ReturnType<typeof getApexPlayerByUid>>>,
    data: Awaited<ReturnType<typeof apexService.getPlayerByUid>>,
    adapter: MessageAdapter | null | undefined
): Promise<void> {
    const {
        rankName: newTier,
        rankDiv: newDiv,
        rankScore: newRp,
    } = data.global.rank;

    // Nothing changed since last poll
    if (
        player.tier === newTier &&
        player.division === newDiv &&
        player.rp === newRp
    ) {
        return;
    }

    const rpChange = newRp - player.rp;

    // Resolve current legend + stats from the API response
    const selectedLegendName =
        data.realtime?.selectedLegend ??
        Object.keys(data.legends.selected)[0] ??
        null;

    const legendData = selectedLegendName
        ? (data.legends.all[selectedLegendName] ??
          data.legends.selected[selectedLegendName] ??
          null)
        : null;
    const currentStats = extractLegendStats(legendData);

    // Legend icon: prefer the URL from the API response, fall back to CDN pattern
    const legendIconFromApi = selectedLegendName
        ? (data.legends.selected[selectedLegendName]?.ImgAssets?.icon ??
          data.legends.all[selectedLegendName]?.ImgAssets?.icon ??
          null)
        : null;
    const legendIconUrl = legendIconFromApi
        ? legendIconFromApi.replace('http://', 'https://')
        : getApexLegendIcon(selectedLegendName ?? '');

    // Rank icon from wiki.gg CDN
    const rankIconUrl = getApexRankEmblem(newTier);

    // Stat diffs — null means no snapshot yet (first session for this player)
    const killsGained =
        player.killsSnapshot !== null
            ? Math.max(0, currentStats.kills - player.killsSnapshot)
            : null;
    const damageGained =
        player.damageSnapshot !== null
            ? Math.max(0, currentStats.damage - player.damageSnapshot)
            : null;
    const winsGained =
        player.winsSnapshot !== null
            ? Math.max(0, currentStats.wins - player.winsSnapshot)
            : null;

    // Rank movement for promotion/demotion embed
    const rankMovement = determineApexRankMovement(
        player.tier,
        player.division,
        player.rp,
        newTier,
        newDiv,
        newRp
    );
    const newRankMsg = formatApexRank(newTier, newDiv, newRp);

    console.log(
        `[Apex] Session for ${data.global.name}: ${rpChange > 0 ? '+' : ''}${rpChange} RP → ${newRankMsg}`
    );

    // Persist new rank + stat snapshot
    await updateApexPlayerRankAndSnapshot(
        uid,
        newTier,
        newDiv,
        newRp,
        currentStats.kills,
        currentStats.damage,
        currentStats.wins
    );
    await createApexRankHistory(
        `APEX_SYNC_${uid}_${Date.now()}`,
        uid,
        newTier,
        newDiv,
        newRp
    ).catch(() => {});

    // Notify all guilds tracking this player
    const guilds = await getGuildsTrackingApexPlayer(uid);
    for (const guild of guilds) {
        const channelId =
            guild.channel_id ?? process.env.DISCORD_CHANNEL_ID ?? null;
        if (!channelId) continue;

        await notifyApexSession(adapter, {
            playerName: data.global.name,
            legend: selectedLegendName ?? 'Unknown',
            legendIconUrl,
            rpChange,
            newRankMsg,
            killsGained,
            damageGained,
            winsGained,
            discordChannelId: channelId,
        });

        if (rankMovement !== 'no_change') {
            await notifyApexRankChange(adapter, {
                playerName: data.global.name,
                direction: rankMovement,
                newRankMsg,
                rankIconUrl,
                rpChange,
                discordChannelId: channelId,
            });
        }
    }
}
