// discord/rankService.js
const previousRankState = new Map();

function setPreviousRank(puuid, rankInfo) {
  previousRankState.set(puuid, rankInfo);
}

function getPreviousRank(puuid) {
  return previousRankState.get(puuid) || null;
}

function clearPreviousRank(puuid) {
  previousRankState.delete(puuid);
}

function calculateRankChange(previousRank, currentRank) {
  if (!previousRank) {
    return {
      direction: 'new',
      lpChange: currentRank.lp
    };
  }

  const previousTierValue = getTierValue(previousRank.tier);
  const currentTierValue = getTierValue(currentRank.tier);

  const previousDivisionValue = getDivisionValue(previousRank.rank);
  const currentDivisionValue = getDivisionValue(currentRank.rank);

  let direction = 'same';
  let lpChange = currentRank.lp - previousRank.lp;

  if (currentTierValue > previousTierValue) {
    direction = 'up';
    lpChange += (currentTierValue - previousTierValue) * 4 * 100;
    lpChange += (currentDivisionValue - previousDivisionValue) * 100;
  } else if (currentTierValue < previousTierValue) {
    direction = 'down';
    lpChange += (currentTierValue - previousTierValue) * 4 * 100;
    lpChange += (currentDivisionValue - previousDivisionValue) * 100;
  } else {
    if (currentDivisionValue > previousDivisionValue) {
      direction = 'up';
    } else if (currentDivisionValue < previousDivisionValue) {
      direction = 'down';
    } else {
      direction = lpChange >= 0 ? 'up' : 'down';
    }
  }

  return {
    direction,
    lpChange
  };
}
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
  'I': 4,
  'II': 3,
  'III': 2,
  'IV': 1
};

function getTierValue(tier) {
  const index = tierOrder.indexOf(tier.toUpperCase());
  return index !== -1 ? index : -1;
}

function getDivisionValue(division) {
  return divisionOrder[division.toUpperCase()] || -1;
}

module.exports = {
  setPreviousRank,
  getPreviousRank,
  clearPreviousRank,
  calculateRankChange
};
