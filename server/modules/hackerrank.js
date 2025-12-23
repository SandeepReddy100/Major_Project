const axios = require("axios");
const puppeteer = require("puppeteer");

async function scrapeCertificatesWithPuppeteer(username) {
  const url = `https://www.hackerrank.com/${username}`;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle2" });

  // Wait for the certificates section to load
  await page.waitForSelector(".profile-badges, .certification-card, .badge-card");

  const counts = await page.evaluate(() => {
    const certCards = document.querySelectorAll(
      ".certification-card, .badge-card, .profile-badges .badge"
    );

    const counts = {
      Basic: 0,
      Intermediate: 0,
      Advanced: 0,
      Unknown: 0,
    };

    certCards.forEach((el) => {
      const text = el.innerText.toLowerCase();
      if (text.includes("basic")) counts.Basic++;
      else if (text.includes("intermediate")) counts.Intermediate++;
      else if (text.includes("advanced")) counts.Advanced++;
      else counts.Unknown++;
    });

    return counts;
  });

  await browser.close();
  return counts;
}

async function fetchHackerRankStars(username) {
  try {
    const res = await axios.get(`https://www.hackerrank.com/rest/hackers/${username}/badges`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json, text/plain, */*",
        Referer: `https://www.hackerrank.com/${username}`,
      },
      timeout: 5000,
    });

    const data = res.data;

    if (!data || !Array.isArray(data.models)) {
      throw new Error("Invalid API response or 'models' missing");
    }

    const totalStars = data.models.reduce(
      (sum, badge) => sum + (typeof badge.stars === "number" ? badge.stars : 0),
      0
    );

    return { stars: totalStars };
  } catch (err) {
    console.error(`❌ Error fetching HackerRank stars for ${username}:`, err.message);
    return { stars: 0 };
  }
}

module.exports = {
  scrapeCertificatesWithPuppeteer,
  fetchHackerRankStars,
};
