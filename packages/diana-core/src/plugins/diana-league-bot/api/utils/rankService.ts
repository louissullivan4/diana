import { Constants } from 'twisted';
import { Rank } from '../../types';

const tierOrder = [
    'IRON',
    'BRONZE',
    'SILVER',
    'GOLD',
    'PLATINUM',
    'EMERALD',
    'DIAMOND',
    'MASTER',
    'GRANDMASTER',
    'CHALLENGER',
];

const normalize = (value?: string | null) =>
    typeof value === 'string' ? value.toUpperCase() : null;

const getTierValue = (tier?: string | null) => {
    const normalizedTier = normalize(tier);
    if (!normalizedTier) return -1;
    const index = tierOrder.indexOf(normalizedTier);
    return index !== -1 ? index : -1;
};

const getDivisionValue = (division?: string | null) => {
    const normalizedDivision = normalize(division);
    if (!normalizedDivision) return -1;
    const divisionOrderMap = new Map<string, number>([
        [Constants.Divisions.IV, 1],
        [Constants.Divisions.III, 2],
        [Constants.Divisions.II, 3],
        [Constants.Divisions.I, 4],
    ]);
    return divisionOrderMap.get(normalizedDivision) ?? -1;
};

const getTotalPoints = (
    tier: string,
    division: string,
    lp: number | undefined
) => {
    const tierValue = getTierValue(tier);
    const divisionValue = getDivisionValue(division);
    if (tierValue === -1 || divisionValue === -1) return null;
    const normalizedLp = typeof lp === 'number' ? lp : 0;
    return tierValue * 400 + divisionValue * 100 + normalizedLp;
};

const hasCalculableRank = (rank?: Rank | null) => {
    if (!rank) return false;
    const tierValue = getTierValue(rank.tier);
    const divisionValue = getDivisionValue(rank.rank ?? rank.division);
    return tierValue !== -1 && divisionValue !== -1;
};

const asDivision = (rank: Rank) => rank.rank ?? rank.division ?? '';

export const calculateRankChange = (
    previousRank: Rank | null | undefined,
    currentRank: Rank | null | undefined
) => {
    if (!currentRank) return { direction: 'same', lpChange: 0 };

    const currentDivision = asDivision(currentRank);
    if (!hasCalculableRank(currentRank)) {
        return { direction: 'same', lpChange: 0 };
    }

    if (
        !previousRank ||
        previousRank.tier === 'Unranked' ||
        previousRank.division === 'N/A' ||
        !hasCalculableRank(previousRank)
    ) {
        return {
            direction: 'up',
            lpChange: typeof currentRank.lp === 'number' ? currentRank.lp : 0,
        };
    }

    const previousTotalPoints = getTotalPoints(
        previousRank.tier,
        asDivision(previousRank),
        previousRank.lp
    );
    const currentTotalPoints = getTotalPoints(
        currentRank.tier,
        currentDivision,
        currentRank.lp
    );

    if (
        previousTotalPoints === null ||
        currentTotalPoints === null ||
        typeof previousTotalPoints !== 'number' ||
        typeof currentTotalPoints !== 'number'
    ) {
        return {
            direction: 'same',
            lpChange: 0,
        };
    }

    const lpChange = currentTotalPoints - previousTotalPoints;

    const direction = getDirection(lpChange);
    return { direction, lpChange };
};

const getDirection = (lpChange: number) => {
    if (lpChange == 0) {
        return 'same';
    }
    return lpChange > 0 ? 'up' : 'down';
};

export const determineRankMovement = (
    previousRank: Rank,
    currentRank: Rank
) => {
    if (!previousRank || !currentRank) {
        return 'no_change';
    }

    const previousTierValue = getTierValue(previousRank.tier);
    const currentTierValue = getTierValue(currentRank.tier);

    const previousDivisionValue = getDivisionValue(
        previousRank.rank ?? previousRank.division
    );
    const currentDivisionValue = getDivisionValue(
        currentRank.rank ?? currentRank.division
    );

    if (
        previousTierValue === -1 ||
        currentTierValue === -1 ||
        previousDivisionValue === -1 ||
        currentDivisionValue === -1
    ) {
        return 'no_change';
    }

    if (currentTierValue > previousTierValue) {
        return 'promoted';
    } else if (currentTierValue < previousTierValue) {
        return 'demoted';
    }

    if (currentDivisionValue > previousDivisionValue) {
        return 'promoted';
    } else if (currentDivisionValue < previousDivisionValue) {
        return 'demoted';
    }
    return 'no_change';
};

export function calculateWinRatePercentage(
    wins: number,
    losses: number
): number | null {
    const totalGames = wins + losses;
    if (totalGames === 0) return null;

    return (wins / totalGames) * 100;
}
