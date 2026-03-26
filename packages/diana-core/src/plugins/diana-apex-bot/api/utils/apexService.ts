import type {
    IApexService,
    ApexBridgeResponse,
    ApexUidResponse,
    ApexPredatorResponse,
} from '../../types.js';

const BASE_URL = 'https://api.mozambiquehe.re';

export class ApexService implements IApexService {
    private readonly apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private async fetch<T>(
        path: string,
        params: Record<string, string> = {}
    ): Promise<T> {
        const url = new URL(`${BASE_URL}${path}`);
        url.searchParams.set('auth', this.apiKey);
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }

        const response = await fetch(url.toString(), {
            headers: { Authorization: this.apiKey },
        });

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw Object.assign(
                new Error(`Apex API error ${response.status}: ${body}`),
                {
                    status: response.status,
                }
            );
        }

        return response.json() as Promise<T>;
    }

    async checkConnection(): Promise<boolean> {
        try {
            await this.fetch('/servers');
            return true;
        } catch {
            return false;
        }
    }

    async getPlayerByName(
        name: string,
        platform: string
    ): Promise<ApexBridgeResponse> {
        return this.fetch<ApexBridgeResponse>('/bridge', {
            player: name,
            platform,
        });
    }

    async getPlayerByUid(
        uid: string,
        platform: string
    ): Promise<ApexBridgeResponse> {
        return this.fetch<ApexBridgeResponse>('/bridge', { uid, platform });
    }

    async getUidByName(name: string, platform: string): Promise<string> {
        const result = await this.fetch<ApexUidResponse>('/nametouid', {
            player: name,
            platform,
        });
        return String(result.uid);
    }

    async getPredatorRanks(): Promise<ApexPredatorResponse> {
        return this.fetch<ApexPredatorResponse>('/predator');
    }
}
