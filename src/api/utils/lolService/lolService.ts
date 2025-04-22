import { LolApi, Constants } from 'twisted';
import { ILolService } from '../../../types';
import { CurrentGameInfoDTO } from 'twisted/dist/models-dto/spectator';
import { SummonerLeagueDto } from 'twisted/dist/models-dto/league/summoner-league/summoner-league.dto';
import {
    MatchV5DTOs,
    MatchV5TimelineDTOs,
} from 'twisted/dist/models-dto/matches/match-v5';

type Region = (typeof Constants.Regions)[keyof typeof Constants.Regions];
type RegionGroup =
    (typeof Constants.RegionGroups)[keyof typeof Constants.RegionGroups];

export class LolService implements ILolService {
    private lolApi: LolApi;

    constructor(apiKey: string) {
        this.lolApi = new LolApi({ key: apiKey });
    }

    async checkConnection(
        region: Region = Constants.Regions.EU_WEST
    ): Promise<boolean> {
        try {
            await this.lolApi.StatusV4.get(region);
            return true;
        } catch {
            return false;
        }
    }

    async getMatchesByPUUID(
        puuid: string,
        count: number = 20,
        regionGroup: RegionGroup = Constants.RegionGroups.EUROPE
    ): Promise<string[]> {
        try {
            const { response } = await this.lolApi.MatchV5.list(
                puuid,
                regionGroup,
                { count }
            );
            return response;
        } catch (error: any) {
            if (error.status === 404) return [];
            else {
                console.error(
                    `[Error] [${puuid}]: ${error.message}`
                );
                throw error;
            }
        }
    }

    async getMatchDataById(
        matchId: string,
        regionGroup: RegionGroup = Constants.RegionGroups.EUROPE
    ): Promise<MatchV5TimelineDTOs.MatchTimelineDto | null> {
        try {
            const { response } = await this.lolApi.MatchV5.timeline(
                matchId,
                regionGroup
            );
            return response;
        } catch (error: any) {
            if (error.status === 404) return null;
            else {
                console.error(
                    `[Error] [${matchId}]: ${error.message}`
                );
                throw error;
            }
        }
    }

    async getMatchSummary(
        matchId: string,
        regionGroup: RegionGroup = Constants.RegionGroups.EUROPE
    ): Promise<MatchV5DTOs.MatchDto | null> {
        try {
            const { response } = await this.lolApi.MatchV5.get(
                matchId,
                regionGroup
            );
            return response;
        } catch (error: any) {
            if (error.status === 404) return null;
            else {
                console.error(
                    `[Error] [${matchId}]: ${error.message}`
                );
                throw error;
            }
        }
    }

    async getRankEntriesByPUUID(
        puuid: string,
        region: Region = Constants.Regions.EU_WEST
    ): Promise<SummonerLeagueDto[] | null> {
        try {
            const { response } = await this.lolApi.League.byPUUID(
                puuid,
                region
            );
            return response;
        } catch (error: any) {
            if (error.status === 404) return null;
            else {
                console.error(
                    `[Error] [${puuid}]: ${error.message}`
                );
                throw error;
            }
        }
    }

    async getActiveGameByPuuid(
        puuid: string,
        region: Region = Constants.Regions.EU_WEST
    ): Promise<CurrentGameInfoDTO | null> {
        try {
            const { response } = await this.lolApi.SpectatorV5.activeGame(
                puuid,
                region
            );
            return response;
        } catch (error: any) {
            if (error.status === 404) return null;
            else {
                console.error(
                    `[Error] [${puuid}]: ${error.message}`
                );
                throw error;
            }
        }
    }
}
