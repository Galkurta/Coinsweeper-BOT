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
      authority: "api.bybitcoinsweeper.com",
      accept: "*/*",
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "en-US,en;q=0.9,vi;q=0.8",
      clienttype: "web",
      lang: "en",
      origin: "https://bybitcoinsweeper.com",
      referer: "https://bybitcoinsweeper.com/",
      "sec-ch-ua":
        '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      priority: "u=1, i",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    };
    this.currentInitData = null;
    this.info = { score: 0 };
    this.gameConfig = this.promptGameConfig();
    this.axiosInstance = axios.create({
      baseURL: "https://api.bybitcoinsweeper.com",
      timeout: 5000,
      headers: this.headers,
    });
    this.winRate = this.gameConfig.winRate;
  }

  promptGameConfig() {
    console.log("Please enter the game configuration:");
    console.log("Note: Default range for game time is 90 to 300 seconds.");
    console.log("Note: Default range for score is 600 to 900 points.");
    console.log("Note: Default win rate is 0.7 (70% chance of winning).");

    const minGameTime = parseInt(
      prompt("Minimum game time (in seconds, default 90): ") || "90"
    );
    const maxGameTime = parseInt(
      prompt("Maximum game time (in seconds, default 300): ") || "300"
    );
    const minScore = parseInt(prompt("Minimum score (default 600): ") || "600");
    const maxScore = parseInt(prompt("Maximum score (default 900): ") || "900");
    const winRate = parseFloat(
      prompt("Win rate (0.0 to 1.0, default 0.7): ") || "0.7"
    );

    console.log("\nGame Configuration:");
    console.log(`Game Time Range: ${minGameTime} - ${maxGameTime} seconds`);
    console.log(`Score Range: ${minScore} - ${maxScore} points`);
    console.log(`Win Rate: ${winRate * 100}%\n`);

    return { minGameTime, maxGameTime, minScore, maxScore, winRate };
  }

  async wait(seconds) {
    for (let i = seconds; i > 0; i--) {
      process.stdout.write(`\rWaiting ${i} seconds to continue`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    process.stdout.write("\r" + " ".repeat(40) + "\r");
  }

  async request(method, url, data = null, retryCount = 0) {
    const headers = { ...this.headers };
    if (method === "POST" && data) headers["content-type"] = "application/json";
    try {
      const response = await this.axiosInstance({ method, url, data, headers });
      return { success: true, data: response.data };
    } catch (error) {
      if (error.response && error.response.status === 401 && retryCount < 1) {
        logger.warn("Token might be expired. Attempting to relogin...");
        const loginResult = await this.login(this.currentInitData);
        if (loginResult.success) {
          logger.info("Relogin successful. Retrying the original request...");
          return this.request(method, url, data, retryCount + 1);
        }
      }
      logger.error(`Request error: ${error.message}`, "error");
      if (error.response) {
        logger.error(`Response status: ${error.response.status}`);
        logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      return { success: false, message: error.message, error };
    }
  }

  async login(initData) {
    this.currentInitData = initData;
    const payload = {
      initData: initData,
    };

    logger.info(`Attempting to log in with initData`);

    const response = await this.request("POST", "api/auth/login", payload);
    if (response.success) {
      this.headers["Authorization"] = `Bearer ${response.data.accessToken}`;
      this.axiosInstance.defaults.headers[
        "Authorization"
      ] = `Bearer ${response.data.accessToken}`;
      this.axiosInstance.defaults.headers["tl-init-data"] = initData;
      logger.info("Login successful, token received");
      return {
        success: true,
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        userId: response.data.id,
      };
    } else {
      logger.error(`Login failed: ${response.message}`);
      if (response.error && response.error.response) {
        logger.error(
          `Response data: ${JSON.stringify(response.error.response.data)}`
        );
      }
      return { success: false, error: response.message };
    }
  }

  async me() {
    const response = await this.request("GET", "api/users/me");
    if (response.success) {
      this.user_info = response.data;
      return true;
    } else {
      logger.error(`Failed to get user info: ${response.message}`);
      return false;
    }
  }

  async start() {
    const response = await this.request("POST", "api/games/start", {});
    if (response.success) {
      this.game = response.data;
      return true;
    } else {
      logger.error(`Failed to start game!`);
      return false;
    }
  }

  async lose() {
    const response = await this.request("POST", "api/games/lose", {
      bagCoins: this.game.rewards.bagCoins,
      bits: this.game.rewards.bits,
      gifts: this.game.rewards.gifts,
      gameId: this.game.id,
    });
    return response.success;
  }

  async win({ score, gameTime }) {
    const response = await this.request("POST", "api/games/win", {
      bagCoins: this.game.rewards.bagCoins,
      bits: this.game.rewards.bits,
      gifts: this.game.rewards.gifts,
      gameId: this.game.id,
      score,
      gameTime,
    });
    if (response.success) {
      this.game = response.data;
      return true;
    } else {
      logger.error(`Failed game!`);
      return false;
    }
  }

  async playGame(index) {
    logger.info(`Account ${index} | ${this.user_info.firstName}`);

    for (let i = 0; i < 3; i++) {
      try {
        logger.info(`Account ${index} | Play the game for time ${i + 1}`);
        const start = await this.start();
        if (!start) return false;

        const gameTime =
          Math.floor(
            Math.random() *
              (this.gameConfig.maxGameTime - this.gameConfig.minGameTime + 1)
          ) + this.gameConfig.minGameTime;
        const score =
          Math.floor(
            Math.random() *
              (this.gameConfig.maxScore - this.gameConfig.minScore + 1)
          ) + this.gameConfig.minScore;

        await this.wait(gameTime);

        const isWin = Math.random() < this.winRate;

        if (isWin) {
          const winResult = await this.win({ gameTime, score });
          if (winResult) {
            this.info.score += score;
            logger.info(
              `Account ${index} | Win game earn: ${score} | Total: ${this.info.score}`
            );
          } else {
            return false;
          }
        } else {
          const loseResult = await this.lose();
          if (loseResult) {
            logger.info(`Account ${index} | Lose`);
          } else {
            return false;
          }
        }

        await this.wait(5);
      } catch (error) {
        logger.warn(`Account ${index} | Too Many Requests, Please Wait`);
        await this.wait(60);
      }
    }
    return true;
  }

  async main() {
    const dataFile = path.join(__dirname, "data.txt");
    let data;

    try {
      data = fs
        .readFileSync(dataFile, "utf8")
        .replace(/\r/g, "")
        .split("\n")
        .filter(Boolean);
    } catch (error) {
      logger.error(`Failed to read data file: ${error.message}`);
      process.exit(1);
    }

    if (data.length === 0) {
      logger.error("No valid data found in the data file.");
      process.exit(1);
    }

    while (true) {
      logger.info("Starting a new cycle for all accounts");
      for (let i = 0; i < data.length; i++) {
        const initData = data[i];
        try {
          if (!initData) {
            logger.error(
              `Invalid data format for account ${i + 1}: empty line`
            );
            continue;
          }

          logger.info(`Processing account ${i + 1}`);
          const loginResult = await this.login(initData);
          if (loginResult.success) {
            logger.info("Login successful!");
            const infoResult = await this.me();
            if (infoResult) {
              const gameResult = await this.playGame(i + 1);
              if (!gameResult) {
                logger.warn("Game session ended, switching to next account");
              }
            }
          } else {
            logger.error(
              `Login failed for account ${i + 1}! ${loginResult.error}`
            );
          }
        } catch (error) {
          logger.error(`Error processing account ${i + 1}: ${error.message}`);
          logger.info("Continuing with the next account");
        } finally {
          if (i < data.length - 1) {
            logger.info("Waiting before processing the next account");
            await this.wait(3);
          }
        }
      }

      logger.info(
        "Finished processing all accounts. Starting a new cycle after a short delay."
      );
      await this.wait(3);
    }
  }
}

const client = new Coinsweeper();
client.main().catch((err) => {
  logger.error(`Fatal error in main loop: ${err.message}`);
  logger.info("Attempting to restart the main loop...");
  setTimeout(() => {
    client.main().catch((err) => {
      logger.error(`Failed to restart. Fatal error: ${err.message}`);
      process.exit(1);
    });
  }, 5000);
});
