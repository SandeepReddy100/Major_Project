const axios = require("axios");
const cheerio = require("cheerio");

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchCodeChefStats(username, retries = 3, delayMs = 2000) {
  try {
    const res = await axios.get(`https://www.codechef.com/users/${username}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    const $ = cheerio.load(res.data);

    const rating = parseInt($(".rating-number").first().text()) || 0;

    // Extract problems solved
    let totalSolved = 0;
    $("section.problems-solved h5").each((i, elem) => {
      const text = $(elem).text();
      const match = text.match(/\d+/);
      if (match) {
        totalSolved += parseInt(match[0]);
      }
    });

    return {
      rating,
      problemsSolved: totalSolved,
    };

  } catch (err) {
    if (err.response && err.response.status === 429 && retries > 0) {
      console.warn(`Rate limited. Retrying in ${delayMs}ms... (${retries} retries left)`);
      await delay(delayMs);
      return fetchCodeChefStats(username, retries - 1, delayMs * 2); // exponential backoff
    }

    console.error("Error fetching CodeChef stats:", err.message);
    return {
      rating: 0,
      problemsSolved: 0,
    };
  }
}

module.exports = fetchCodeChefStats;
