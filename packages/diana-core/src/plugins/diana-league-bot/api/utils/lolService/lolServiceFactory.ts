import { LolService } from './lolService';
import { MockLolService } from './mockLolService';
import { ILolService } from '../../../types';

export function createLolService(): ILolService {
    if (process.env.USE_MOCK_RIOT_API === 'true') {
        return new MockLolService();
    }

    const apiKey = process.env.RIOT_API_KEY;
    if (!apiKey) throw new Error('RIOT_API_KEY is not set');
    return new LolService(apiKey);
}
