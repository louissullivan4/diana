// discord/rankService.js
const previousRankState = new Map();

/**
 * Sets the previous rank information for a user identified by puuid.
 * @param {string} puuid - The unique identifier for the user.
 * @param {Object} rankInfo - The rank information (tier, rank, lp).
 */
function setPreviousRank(puuid, rankInfo) {
  previousRankState.set(puuid, rankInfo);
}

/**
 * Retrieves the previous rank information for a user.
 * @param {string} puuid - The unique identifier for the user.
 * @returns {Object|null} The previous rank information or null if not found.
 */
function getPreviousRank(puuid) {
  return previousRankState.get(puuid) || null;
}

/**
 * Clears the previous rank information for a user.
 * @param {string} puuid - The unique identifier for the user.
 */
function clearPreviousRank(puuid) {
  previousRankState.delete(puuid);
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
  'IV': 1,
  'III': 2,
  'II': 3,
  'I': 4
};

/**
 * Converts tier name to its corresponding numerical value.
 * @param {string} tier - The name of the tier.
 * @returns {number} The numerical value of the tier.
 */
function getTierValue(tier) {
  const index = tierOrder.indexOf(tier.toUpperCase());
  return index !== -1 ? index : -1;
}

/**
 * Converts division name to its corresponding numerical value.
 * @param {string} division - The name of the division.
 * @returns {number} The numerical value of the division.
 */
function getDivisionValue(division) {
  return divisionOrder[division.toUpperCase()] || -1;
}

/**
 * Calculates the total points based on tier, division, and LP.
 * @param {string} tier - The name of the tier.
 * @param {string} division - The name of the division.
 * @param {number} lp - The League Points.
 * @returns {number} The total points.
 * @throws Will throw an error if tier or division is invalid.
 */
function getTotalPoints(tier, division, lp) {
  const tierValue = getTierValue(tier);
  const divisionValue = getDivisionValue(division);
  
  if (tierValue === -1 || divisionValue === -1) {
    throw new Error('Invalid tier or division');
  }
  
  return (tierValue * 400) + (divisionValue * 100) + lp;
}

/**
 * Calculates the rank change between previous and current rank.
 * @param {Object|null} previousRank - The previous rank information.
 * @param {Object} currentRank - The current rank information.
 * @returns {Object} An object containing the direction and LP change.
 */
function calculateRankChange(previousRank, currentRank) {
  if (!previousRank) {
    return {
      direction: 'new',
      lpChange: currentRank.lp
    };
  }

  const previousTotalPoints = getTotalPoints(previousRank.tier, previousRank.rank, previousRank.lp);
  const currentTotalPoints = getTotalPoints(currentRank.tier, currentRank.rank, currentRank.lp);

  const lpChange = currentTotalPoints - previousTotalPoints;
  let direction = 'same';

  if (lpChange > 0) {
    direction = 'up';
  } else if (lpChange < 0) {
    direction = 'down';
  }

  console.log({
    direction,
    lpChange
  });

  return {
    direction,
    lpChange
  };
}

/**
 * Determines the rank movement status: 'promoted', 'demoted', or 'no_change'.
 * This function uses getTierValue and getDivisionValue to accurately assess movement.
 * @param {Object|null} previousRank - The previous rank information.
 * @param {Object} currentRank - The current rank information.
 * @returns {string} The rank movement status.
 */
function determineRankMovement(previousRank, currentRank) {
  if (!previousRank) {
    return 'promoted';
  }
  const previousTierValue = getTierValue(previousRank.tier);
  const currentTierValue = getTierValue(currentRank.tier);

  if (currentTierValue > previousTierValue) {
    return 'promoted';
  } else if (currentTierValue < previousTierValue) {
    return 'demoted';
  } else {
      return 'no_change';
  }
}

module.exports = {
  setPreviousRank,
  getPreviousRank,
  clearPreviousRank,
  calculateRankChange,
  determineRankMovement
};
