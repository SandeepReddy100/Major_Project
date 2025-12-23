const axios = require("axios");

async function fetchLeetCode(username) {
  const query = {
    query: `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          submitStats: submitStatsGlobal {
            acSubmissionNum {
              difficulty
              count
            }
          }
        }
      }
    `,
    variables: { username }
  };

  try {
    const res = await axios.post(
      "https://leetcode.com/graphql",
      query,
      {
        headers: {
          "Content-Type": "application/json",
          "Referer": `https://leetcode.com/${username}/`,
        }
      }
    );

    const submissions = res.data.data.matchedUser.submitStats.acSubmissionNum;

    const result = {
      easy: 0,
      medium: 0,
      hard: 0,
      total: 0
    };

    for (const stat of submissions) {
      const diff = stat.difficulty.toLowerCase();
      result[diff] = stat.count;
      result.total += stat.count;
    }

    return result;

  } catch (err) {
    console.error("Error fetching LeetCode stats:", err.message);
    return {
      easy: 0,
      medium: 0,
      hard: 0,
      total: 0
    };
  }
}

module.exports = fetchLeetCode;
