import type { IApexService, ApexBridgeResponse, ApexPredatorResponse } from '../../types.js';
import { ApexService } from './apexService.js';

class MockApexService implements IApexService {
    async checkConnection(): Promise<boolean> {
        return true;
    }

    async getPlayerByName(name: string, platform: string): Promise<ApexBridgeResponse> {
        return buildMockBridgeResponse(name, platform);
    }

    async getPlayerByUid(uid: string, platform: string): Promise<ApexBridgeResponse> {
        return buildMockBridgeResponse(`Player_${uid}`, platform);
    }

    async getUidByName(name: string, _platform: string): Promise<string> {
        return `mock_uid_${name.toLowerCase().replace(/\s+/g, '_')}`;
    }

    async getPredatorRanks(): Promise<ApexPredatorResponse> {
        const entry = { val: 15000, uid: 0, updateTimestamp: Date.now() };
        return {
            RP: { PC: entry, PS4: entry, SWITCH: entry, X1: entry },
            AP: { PC: entry, PS4: entry, SWITCH: entry, X1: entry },
        };
    }
}

function buildMockBridgeResponse(name: string, platform: string): ApexBridgeResponse {
    return {
        global: {
            name,
            uid: 123456789,
            platform,
            level: 500,
            toNextLevelPercent: 50,
            rank: {
                rankScore: 1500,
                rankName: 'Platinum',
                rankDiv: 2,
                rankImg: '',
                rankedSeason: 'season25',
            },
        },
        legends: {
            selected: {
                Pathfinder: {
                    data: [
                        { name: 'Kills', value: 1000, key: 'kills' },
                        { name: 'Damage', value: 500000, key: 'damage' },
                    ],
                    ImgAssets: { icon: '', banner: '' },
                },
            },
            all: {},
        },
    };
}

export function createApexService(): IApexService {
    if (process.env.MOCK_APEX_SERVICE === 'true') {
        console.log('[Apex] Using mock Apex service');
        return new MockApexService();
    }
    const apiKey = process.env.APEX_API_KEY;
    if (!apiKey) {
        console.warn('[Apex] APEX_API_KEY not set - falling back to mock service');
        return new MockApexService();
    }
    return new ApexService(apiKey);
}
