import { ILolService } from '../../../types';
import { LolApiError } from './lolService';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SummonerLeagueDto } from 'twisted/dist/models-dto/league/summoner-league/summoner-league.dto';
import { AccountDto } from 'twisted/dist/models-dto/account/account.dto';
import { AccountRegionDto } from 'twisted/dist/models-dto/account/account-region.dto';
import {
    MatchV5DTOs,
    MatchV5TimelineDTOs,
} from 'twisted/dist/models-dto/matches/match-v5';

class JsonLoader {
    private static readonly basePath = join('data/riot');

    static load<T>(filename: string): T {
        const filePath = join(this.basePath, filename);
        const data = readFileSync(filePath, 'utf-8');
        return JSON.parse(data) as T;
    }
}

export class MockLolService implements ILolService {
    async checkConnection(): Promise<boolean> {
        return true;
    }

    async getMatchesByPUUID(
        puuid: string,
        count?: number,
        regionGroup?: string
    ): Promise<string[]> {
        return JsonLoader.load<string[]>('riot_matches_by_puuid.json');
    }

    async getMatchDataById(
        matchId: string,
        _regionGroup?: string
    ): Promise<MatchV5TimelineDTOs.MatchTimelineDto> {
        return JsonLoader.load<MatchV5TimelineDTOs.MatchTimelineDto>(
            'riot_match_timeline_by_match_id.json'
        );
    }

    async getMatchSummary(
        matchId: string,
        _regionGroup?: string
    ): Promise<MatchV5DTOs.MatchDto> {
        return JsonLoader.load<MatchV5DTOs.MatchDto>(
            'riot_match_data_by_match_id.json'
        );
    }

    async getRankEntriesByPUUID(puuid: string): Promise<SummonerLeagueDto[]> {
        return JsonLoader.load<SummonerLeagueDto[]>(
            'riot_league_account_info.json'
        );
    }

    async getAccountByPUUID(puuid: string): Promise<AccountDto> {
        return {
            puuid,
            gameName: 'MockGame',
            tagLine: 'MOCK',
        };
    }

    async getActiveRegionByPUUID(puuid: string): Promise<AccountRegionDto> {
        return {
            puuid,
            game: 'lol',
            region: 'EUW1',
        };
    }
}
