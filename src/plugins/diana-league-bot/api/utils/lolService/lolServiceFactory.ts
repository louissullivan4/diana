import { LolService } from './lolService';
import { MockLolService } from './mockLolService';
import { ILolService } from '../../../types';

export function createLolService(): ILolService {
    const useApi = process.env.USE_RIOT_API === 'true';

    if (useApi) {
        const apiKey = process.env.RIOT_API_KEY;
        if (!apiKey) throw new Error('RIOT_API_KEY is not set');
        return new LolService(apiKey);
    } else {
        return new MockLolService();
    }
}
