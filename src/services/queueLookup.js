// services/queueLookup.js
const queueMap = {
    0: 'Custom Game',
    420: 'Ranked Solo',
    430: 'Normal Blind',
    440: 'Ranked Flex',
    450: 'ARAM',
    700: 'Clash',
  };
  
  function getQueueNameById(queueId) {
    return queueMap[queueId] || `Unknown Queue (ID: ${queueId})`;
  }
  
  module.exports = {
    getQueueNameById,
  };
  