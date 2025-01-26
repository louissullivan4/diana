// services/rankService.js
const previousRankState = new Map();

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
  'CHALLENGER'
];

const divisionOrder = {
  IV: 1,
  III: 2,
  II: 3,
  I: 4
};

const getTierValue = (tier) => {
  const index = tierOrder.indexOf(tier.toUpperCase());
  return index !== -1 ? index : -1;
};

const getDivisionValue = (division) => divisionOrder[division.toUpperCase()] || -1;

const getTotalPoints = (tier, division, lp) => {
  const tierValue = getTierValue(tier);
  const divisionValue = getDivisionValue(division);
  if (tierValue === -1 || divisionValue === -1) throw new Error('Invalid tier or division');
  return tierValue * 400 + divisionValue * 100 + lp;
};

const calculateRankChange = (previousRank, currentRank) => {
  if (!previousRank || previousRank.tier === 'Unranked' || previousRank.division === 'N/A') return { direction: 'up', lpChange: currentRank.lp };
  const previousTotalPoints = getTotalPoints(previousRank.tier, previousRank.rank, previousRank.lp);
  const currentTotalPoints = getTotalPoints(currentRank.tier, currentRank.rank, currentRank.lp);
  const lpChange = currentTotalPoints - previousTotalPoints;
  let direction = 'same';
  if (lpChange > 0) direction = 'up';
  else if (lpChange < 0) direction = 'down';
  return { direction, lpChange };
};

const determineRankMovement = (previousRank, currentRank) => {
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

  if (currentRank.lp > previousRank.lp) {
    return 'up';
  } else if (currentRank.lp < previousRank.lp) {
    return 'down';
  }
  return 'no_change';
};

module.exports = {
  calculateRankChange,
  determineRankMovement
};