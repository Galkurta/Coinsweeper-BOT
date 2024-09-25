const winston = require("winston");

const customTimestampFormat = winston.format((info) => {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  info.timestamp = `${day}:${month}:${year} | ${hours}:${minutes}:${seconds}`;
  return info;
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    customTimestampFormat(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} | ${level.toUpperCase()} | ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
