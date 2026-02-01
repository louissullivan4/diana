const setupModule = () => {
    jest.resetModules();
    const axiosGet = jest.fn();

    jest.doMock('axios', () => ({
        get: axiosGet,
    }));

    const service = require('../src/plugins/diana-league-bot/api/utils/dataDragonService');
    const axios = require('axios');
    return { service, axiosGet: axios.get };
};

describe('dataDragonService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('fetches and caches champion data', async () => {
        const { service, axiosGet } = setupModule();
        axiosGet.mockResolvedValueOnce({ data: ['15.2.1'] });
        axiosGet.mockResolvedValueOnce({
            data: {
                data: {
                    Ahri: { key: '103', name: 'Ahri', tags: ['Mage'] },
                },
            },
        });

        const first = await service.fetchChampionData();
        const second = await service.fetchChampionData();

        expect(first).toBe(second);
        expect(axiosGet).toHaveBeenCalledTimes(2);
        expect(axiosGet.mock.calls[0][0]).toContain('versions');
        expect(axiosGet.mock.calls[1][0]).toContain('champion.json');
    });

    it('builds champion id map and resolves champion info', async () => {
        const { service, axiosGet } = setupModule();
        axiosGet.mockResolvedValueOnce({ data: ['15.2.1'] });
        axiosGet.mockResolvedValueOnce({
            data: {
                data: {
                    Ahri: { key: '103', name: 'Ahri', tags: ['Mage'] },
                },
            },
        });

        await service.fetchChampionData();
        const map = await service.buildChampionIdMap();
        expect(map['103'].name).toBe('Ahri');

        const championInfo = await service.getChampionInfoById('103');
        expect(championInfo).toEqual({ name: 'Ahri', tagString: 'Mage' });
    });

    it('returns fallback info for unknown champion id', async () => {
        const { service, axiosGet } = setupModule();
        axiosGet.mockResolvedValueOnce({ data: ['15.2.1'] });
        axiosGet.mockResolvedValueOnce({
            data: { data: {} },
        });

        await service.fetchChampionData();
        const result = await service.getChampionInfoById('999');
        expect(result).toEqual({
            name: 'Unknown Champion',
            tagString: 'Unknown',
        });
    });

    it('translates queues and roles with fallbacks', () => {
        const { service } = setupModule();
        expect(service.getQueueNameById(420)).toBe('Ranked Solo');
        expect(service.getQueueNameById(9999)).toBe('Unknown Queue (ID: 9999)');

        expect(service.getRoleNameTranslation('MIDDLE')).toBe('Mid');
        expect(service.getRoleNameTranslation('UNKNOWN')).toBe('Unknown Role');
    });
});
