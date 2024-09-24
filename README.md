# Coinsweeper B0T

Coinsweeper Bot is an automated script for playing the Bybit Coinsweeper game. It allows you to configure game parameters and automatically play games for multiple accounts.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- You have installed Node.js (version 12 or higher)
- You have a basic understanding of how to use the command line

## Installation

1. Clone this repository or download the source code.
2. Navigate to the project directory in your terminal.
3. Run the following command to install the required dependencies:

```
npm install
```

## Configuration

1. Edit `data.txt` in the project root directory.
2. In `data.txt`, add your Telegram user data for each account you want to use, one per line. The format should be:

```
query_id=
user=
```

Replace the values with your actual Telegram user data.

## Usage

To run the Coinsweeper Bot:

1. Open a terminal and navigate to the project directory.
2. Run the following command:

```
node main.js
```

3. Follow the prompts to configure the game parameters:
   - Minimum game time (in seconds)
   - Maximum game time (in seconds)
   - Minimum score
   - Maximum score

The bot will then start playing games automatically using the accounts specified in `data.txt`.

## Registration

To use this bot, you need to register with Bybit Coinsweeper. You can do so by clicking on the following link:

[Register for Bybit Coinsweeper](https://t.me/BybitCoinsweeper_Bot?start=referredBy=6944804952)

## Disclaimer

This bot is for educational purposes only. Use it at your own risk. Be aware that automated botting might be against the terms of service of Bybit Coinsweeper. The authors are not responsible for any consequences resulting from the use of this bot.

## Contributing

Contributions to the Coinsweeper Bot are welcome. Please feel free to submit a Pull Request.

## License

This project uses the following license: [MIT License](https://opensource.org/licenses/MIT).
