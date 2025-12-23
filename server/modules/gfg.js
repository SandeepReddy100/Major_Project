const axios = require("axios");

async function fetchGfgStats(username) {
  try {
    const res = await axios.get(`https://geeks-for-geeks-api.vercel.app/${username}`);
    const data = res.data;

    if (!data || !data.info) {
      throw new Error("Invalid API response or user not found.");
    }

    const info = data.info;
    const stats = data.solvedStats;

    const codingScore = parseInt(info.codingScore) || 0;
    const totalSolved = parseInt(info.totalProblemsSolved) || 0;
    const easy = stats.easy?.count || 0;
    const medium = stats.medium?.count || 0;
    const hard = stats.hard?.count || 0;
    const basic = stats.basic?.count || 0;

    return {
      codingScore,
      problemsSolved: totalSolved,
      difficultyWise: {
        basic,
        easy,
        medium,
        hard
      }
    };

  } catch (err) {
    console.error(`❌ Error fetching GFG stats:`, err.message);
    return {
      codingScore: 0,
      problemsSolved: 0,
      difficultyWise: {
        basic: 0,
        easy: 0,
        medium: 0,
        hard: 0
      }
    };
  }
}

module.exports = fetchGfgStats;
