const fs = require("fs");
const path = require("path");
const axios = require("axios");
const printBanner = require("./config/banner.js");
const logger = require("./config/logger.js");
const prompt = require("prompt-sync")({ sigint: true });
printBanner();

class Coinsweeper {
  constructor() {
    this.headers = {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language":
        "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
      "Content-Type": "application/json",
      Origin: "https://bybitcoinsweeper.com",
      Referer: "https://bybitcoinsweeper.com/",
      "Sec-Ch-Ua":
        '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36",
    };
    this.info = { score: 0 };
    this.gameConfig = this.promptGameConfig();
  }

  promptGameConfig() {
    console.log("Please enter the game configuration:");
    console.log("Note: Default range for game time is 90 to 300 seconds.");
    console.log("Note: Default range for score is 600 to 900 points.");

    const minGameTime = parseInt(
      prompt("Minimum game time (in seconds, default 90): ") || "90"
    );
    const maxGameTime = parseInt(
      prompt("Maximum game time (in seconds, default 300): ") || "300"
    );
    const minScore = parseInt(prompt("Minimum score (default 600): ") || "600");
    const maxScore = parseInt(prompt("Maximum score (default 900): ") || "900");

    console.log("\nGame Configuration:");
    console.log(`Game Time Range: ${minGameTime} - ${maxGameTime} seconds`);
    console.log(`Score Range: ${minScore} - ${maxScore} points\n`);

    return { minGameTime, maxGameTime, minScore, maxScore };
  }

  async wait(seconds) {
    for (let i = seconds; i > 0; i--) {
      process.stdout.write(`\rWaiting ${i} seconds to continue...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    process.stdout.write("\r" + " ".repeat(40) + "\r");
  }

  async login(userData) {
    const url = "https://api.bybitcoinsweeper.com/api/auth/login";
    const payload = {
      firstName: userData.first_name,
      lastName: userData.last_name || "",
      telegramId: userData.id.toString(),
      userName: userData.username,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      if (response.status === 201) {
        this.headers["Authorization"] = `Bearer ${response.data.accessToken}`;
        return {
          success: true,
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          userId: response.data.id,
        };
      } else {
        return { success: false, error: "Unexpected status code" };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async score() {
    for (let i = 0; i < 3; i++) {
      try {
        const gametime =
          Math.floor(
            Math.random() *
              (this.gameConfig.maxGameTime - this.gameConfig.minGameTime + 1)
          ) + this.gameConfig.minGameTime;
        const score =
          Math.floor(
            Math.random() *
              (this.gameConfig.maxScore - this.gameConfig.minScore + 1)
          ) + this.gameConfig.minScore;

        logger.info(`Starting game ${i + 1}/3. Play time: ${gametime} seconds`);
        await this.wait(gametime);

        const game_data = {
          gameTime: gametime,
          score: score,
        };

        const res = await axios.patch(
          "https://api.bybitcoinsweeper.com/api/users/score",
          game_data,
          { headers: this.headers }
        );

        if (res.status === 200) {
          this.info.score += score;
          logger.info(
            `Game Played Successfully: gained ${score} points | Total: ${this.info.score}`
          );
        } else if (res.status === 401) {
          logger.warn("Token expired, need to login again");
          return false;
        } else {
          logger.error(`An Error Occurred With Code ${res.status}`);
        }

        await this.wait(5);
      } catch (error) {
        logger.warn("Too Many Requests, Please Wait");
        await this.wait(60);
      }
    }
    return true;
  }

  async main() {
    const dataFile = path.join(__dirname, "data.txt");
    const data = fs
      .readFileSync(dataFile, "utf8")
      .replace(/\r/g, "")
      .split("\n")
      .filter(Boolean);

    while (true) {
      for (let i = 0; i < data.length; i++) {
        const initData = data[i];
        const userData = JSON.parse(
          decodeURIComponent(initData.split("user=")[1].split("&")[0])
        );

        logger.info(`Account ${i + 1} | ${userData.first_name}`);

        logger.info(`Logging in account ${userData.id}...`);
        const loginResult = await this.login(userData);
        if (loginResult.success) {
          logger.info("Login successful!");
          const gameResult = await this.score();
          if (!gameResult) {
            logger.warn("Need to login again, switching to next account");
          }
        } else {
          logger.error(`Login failed! ${loginResult.error}`);
        }

        if (i < data.length - 1) {
          await this.wait(3);
        }
      }

      await this.wait(3);
    }
  }
}

const client = new Coinsweeper();
client.main().catch((err) => {
  logger.error(err.message);
  process.exit(1);
});
