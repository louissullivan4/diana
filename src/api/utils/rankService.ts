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

const getTierValue = (tier: string) => {
    const index = tierOrder.indexOf(tier.toUpperCase());
    return index !== -1 ? index : -1;
};

const getDivisionValue = (division: string) => {
    const divisionOrderMap = new Map<string, number>([
        [Constants.Divisions.IV, 1],
        [Constants.Divisions.III, 2],
        [Constants.Divisions.II, 3],
        [Constants.Divisions.I, 4],
    ]);
    return divisionOrderMap.get(division.toUpperCase()) || -1;
};
const getTotalPoints = (tier: string, division: string, lp: number) => {
    const tierValue = getTierValue(tier);
    const divisionValue = getDivisionValue(division);
    if (tierValue === -1 || divisionValue === -1)
        throw new Error('Invalid tier or division');
    return tierValue * 400 + divisionValue * 100 + lp;
};

export const calculateRankChange = (previousRank: Rank, currentRank: Rank) => {
    if (
        !previousRank ||
        previousRank.tier === 'Unranked' ||
        previousRank.division === 'N/A'
    )
        return { direction: 'up', lpChange: currentRank.lp };
    const previousTotalPoints = getTotalPoints(
        previousRank.tier,
        previousRank.rank,
        previousRank.lp
    );
    const currentTotalPoints = getTotalPoints(
        currentRank.tier,
        currentRank.rank,
        currentRank.lp
    );
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

    const previousDivisionValue = getDivisionValue(previousRank.rank);
    const currentDivisionValue = getDivisionValue(currentRank.rank);

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
