import winston from 'winston';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Production: structured JSON to stdout (captured by Render/Docker)
// Development: human-readable colored output
const format = NODE_ENV === 'production'
  ? winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
  : winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ level, message, timestamp, service: _s, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level}]: ${message}${metaStr}`;
      })
    );

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format,
  defaultMeta: { service: 'alpha-groups-backend' },
  transports: [
    new winston.transports.Console(),
  ],
  // Prevent winston from exiting on uncaught errors
  exitOnError: false,
});
