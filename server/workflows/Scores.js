const Coder = require("../models/coding");
const cheerio = require("cheerio");

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 10000 } = options; // 10 second timeout
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);
    return response;
}

async function fetchWithRetry(url, options = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetchWithTimeout(url, options);
            if (res.status === 429) {
                console.warn(`⚠️ Rate limited on ${url}. Retrying in ${2 ** i}s...`);
                await delay((2 ** i) * 1000); // 1s, 2s, 4s...
                continue;
            }
            if (!res.ok && res.status !== 404) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res;
        } catch (error) {
            if (i === retries - 1) throw error;
            await delay((2 ** i) * 1000);
        }
    }
}

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchScoreFromPlatform(platform, handle) {
    if (!handle) return null;

    try {
        // ================= LEETCODE (Using Official GraphQL) =================
        // ================= LEETCODE (Using Official GraphQL) =================
        if (platform === "leetcode") {
            const query = `
                query getUserProfile($username: String!) {
                    matchedUser(username: $username) {
                        submitStats {
                            acSubmissionNum { difficulty count }
                        }
                    }
                    userContestRanking(username: $username) {
                        rating
                    }
                }
            `;

            const res = await fetchWithRetry("https://leetcode.com/graphql", {
                method: "POST",
                headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
                body: JSON.stringify({ query, variables: { username: handle } })
            });

            if (!res || !res.ok) return null;
            const data = await res.json();

            if (!data.data.matchedUser) return 0; // User exists but no stats/invalid

            const stats = data.data.matchedUser.submitStats.acSubmissionNum;
            const easy = stats.find(s => s.difficulty === "Easy")?.count || 0;
            const medium = stats.find(s => s.difficulty === "Medium")?.count || 0;
            const hard = stats.find(s => s.difficulty === "Hard")?.count || 0;

            // Fetch contest rating (defaults to 0 if the user has never participated in a contest)
            const contestRating = data.data.userContestRanking?.rating || 0;

            // Return calculated score + contest rating
            return (easy * 2) + (medium * 4) + (hard * 8) + Math.round(contestRating);
        }

        // ================= GFG (Multi-Strategy Extraction) =================
        if (platform === "gfg") {
            const res = await fetchWithRetry(`https://www.geeksforgeeks.org/profile/${handle}`, {
                headers: { "User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9" }
            });

            if (!res || !res.ok) return null;
            const html = await res.text();

            // Strategy 1: Cheerio targeting standard GFG class names / text
            const $ = cheerio.load(html);
            let scoreText = $('.score_value').text().trim() ||
                $('.scoreCard_head_left--score__XBMuB').text().trim();

            if (!scoreText) {
                // Strategy 2: Fallback Regex looking for JSON props hidden in the DOM
                const match = html.match(/"codingScore":\s*(\d+)/) || html.match(/score["\\]+:(\d+)/);
                if (match) return parseInt(match[1], 10);
                return 0; // User found, but 0 score
            }
            return parseInt(scoreText, 10) || 0;
        }

        // ================= CODECHEF =================
        // ================= CODECHEF =================
        if (platform === "codechef") {
            const res = await fetchWithRetry(`https://www.codechef.com/users/${handle}`, {
                headers: { 
                    "User-Agent": USER_AGENT, 
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Upgrade-Insecure-Requests": "1",
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "none",
                    "Sec-Fetch-User": "?1"
                }
            });

            if (!res || !res.ok) return null;
            const html = await res.text();

            // 🚨 Cloudflare Block Detection
            if (html.includes("Just a moment...") || html.includes("Cloudflare") || html.includes("cf-browser-verification")) {
                console.warn(` CodeChef blocked the request for ${handle} (Cloudflare).`);
                return 0; // Keeps old score if handled downstream, or returns 0
            }

            const $ = cheerio.load(html);

            // Strategy 1: Standard Cheerio selector
            let rating = parseInt($(".rating-number").first().text().trim(), 10);

            // Strategy 2: Fallback Regex (looks directly at the raw HTML if the class changed)
            if (isNaN(rating)) {
                // Matches <div class="rating-number">1234</div> or similar hidden JS variables
                const match = html.match(/rating-number[^>]*>\s*(\d+)/) || html.match(/"rating"\s*:\s*"?(\d+)"?/);
                if (match) {
                    rating = parseInt(match[1], 10);
                }
            }

            return isNaN(rating) ? 0 : rating;
        }

        // ================= GITHUB (Using Official API + Cheerio Fallback) =================
        // ================= GITHUB (Using Official API + Cheerio Fallback) =================
        if (platform === "github") {
            const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "ghp_YOUR_TOKEN_HERE"; 
            
            const apiHeaders = { "User-Agent": USER_AGENT };
            
            if (GITHUB_TOKEN && GITHUB_TOKEN !== "ghp_YOUR_TOKEN_HERE") {
                apiHeaders["Authorization"] = `Bearer ${GITHUB_TOKEN}`;
            }

            const apiRes = await fetchWithRetry(`https://api.github.com/users/${handle}`, {
                headers: apiHeaders
            });

            if (!apiRes || !apiRes.ok) {
                if (apiRes && apiRes.status === 403) {
                     console.warn(` GitHub Rate Limit Hit for ${handle}! You need to add a valid GITHUB_TOKEN.`);
                } else {
                     console.log(`GitHub API failed for ${handle}: ${apiRes ? apiRes.status : 'Unknown'}`);
                }
                return null;
            }
            
            const apiData = await apiRes.json();
            const repos = apiData.public_repos || 0;

            // Fetch contributions via HTML scrape (Web scraping doesn't need the API token)
            const htmlRes = await fetchWithRetry(`https://github.com/${handle}`, {
                headers: { "User-Agent": USER_AGENT }
            });
            
            let contributions = 0;
            if (htmlRes && htmlRes.ok) {
                const html = await htmlRes.text();
                const $ = cheerio.load(html);
                const contribText = $(".js-yearly-contributions h2").text().replace(/[^0-9]/g, "");
                contributions = parseInt(contribText, 10) || 0;
            }

            return (contributions * 2) + (repos * 10);
        }

    } catch (err) {
        console.error(` Error fetching ${platform} for ${handle}:`, err.message);
        return null;
    }
    return null;
}

async function updateLeaderboard() {
    console.log(" Starting leaderboard sync...");

    try {
        const students = await Coder.find({});

        for (const student of students) {
            console.log(`\n--- Processing Roll No: ${student.rollno} ---`);

            let studentTotal = 0;
            // Convert Map/Object to a workable structure safely
            const updatedScores = student.scores instanceof Map ? student.scores : new Map(Object.entries(student.scores || {}));

            // Handle map iterating safely
            const handlesToProcess = student.handles instanceof Map ? Array.from(student.handles.entries()) : Object.entries(student.handles || {});

            for (let [platform, handle] of handlesToProcess) {
                if (!handle) continue;

                console.log(` Fetching ${platform} for handle: ${handle}`);
                const score = await fetchScoreFromPlatform(platform, handle);

                if (score !== null) {
                    updatedScores.set(platform, score);
                    console.log(` ${platform} updated → ${score}`);
                } else {
                    console.log(` ${platform} failed/not found → keeping old score`);
                }

                await delay(1500); // Base delay between platforms for a single user
            }

            // Recalculate total
            for (let value of updatedScores.values()) {
                studentTotal += value || 0;
            }

            student.scores = updatedScores;
            student.totalScore = studentTotal;
            student.lastUpdated = Date.now();

            await student.save();
            console.log(`💾 Saved successfully. Total Score: ${studentTotal}`);

            await delay(2000); // Extra delay between students to respect platform servers
        }

        console.log("\n🎯 Leaderboard successfully updated!");
    } catch (error) {
        console.error("🔥 Critical error during leaderboard update:", error);
    }
}

module.exports = { updateLeaderboard };