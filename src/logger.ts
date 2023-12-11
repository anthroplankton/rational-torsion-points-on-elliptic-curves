import chalk from 'chalk'
import { createLogger, format, transports } from 'winston'

const { combine, timestamp, printf, colorize } = format

export default createLogger({
  level: 'debug',
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    printf(info => {
      return `${chalk.bgMagenta(info.timestamp)} [${info.level}] : ${info.message}`
    })
  ),
  transports: [new transports.Console()],
})
