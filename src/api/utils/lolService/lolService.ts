import { LolApi, Constants } from 'twisted';
import { ILolService } from '../../../types';
import { SummonerLeagueDto } from 'twisted/dist/models-dto/league/summoner-league/summoner-league.dto';
import {
    MatchV5DTOs,
    MatchV5TimelineDTOs,
} from 'twisted/dist/models-dto/matches/match-v5';

type Region = (typeof Constants.Regions)[keyof typeof Constants.Regions];
type RegionGroup =
    (typeof Constants.RegionGroups)[keyof typeof Constants.RegionGroups];

export class LolApiError extends Error {
    constructor(
        public status: number,
        message: string
    ) {
        super(message);
        this.name = 'LolApiError';
    }
}

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
            throw new LolApiError(
                error?.status ?? 500,
                error?.message ?? 'Unknown error'
            );
        }
    }

    async getMatchDataById(
        matchId: string,
        regionGroup: RegionGroup = Constants.RegionGroups.EUROPE
    ): Promise<MatchV5TimelineDTOs.MatchTimelineDto> {
        try {
            const { response } = await this.lolApi.MatchV5.timeline(
                matchId,
                regionGroup
            );
            return response;
        } catch (error: any) {
            throw new LolApiError(
                error?.status ?? 500,
                error?.message ?? 'Unknown error'
            );
        }
    }

    async getMatchSummary(
        matchId: string,
        regionGroup: RegionGroup = Constants.RegionGroups.EUROPE
    ): Promise<MatchV5DTOs.MatchDto> {
        try {
            const { response } = await this.lolApi.MatchV5.get(
                matchId,
                regionGroup
            );
            return response;
        } catch (error: any) {
            throw new LolApiError(
                error?.status ?? 500,
                error?.message ?? 'Unknown error'
            );
        }
    }

    async getRankEntriesByPUUID(
        puuid: string,
        region: Region = Constants.Regions.EU_WEST
    ): Promise<SummonerLeagueDto[]> {
        try {
            const { response } = await this.lolApi.League.byPUUID(
                puuid,
                region
            );
            return response;
        } catch (error: any) {
            throw new LolApiError(
                error?.status ?? 500,
                error?.message ?? 'Unknown error'
            );
        }
    }

}
