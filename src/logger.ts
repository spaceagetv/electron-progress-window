export enum LogLevel {
  SILENT = 0,
  ERROR,
  WARN,
  INFO,
  VERBOSE,
  DEBUG,
  SILLY,
}

const LogLevelMap = {
  silent: LogLevel.SILENT,
  error: LogLevel.ERROR,
  warn: LogLevel.WARN,
  info: LogLevel.INFO,
  verbose: LogLevel.VERBOSE,
  debug: LogLevel.DEBUG,
  silly: LogLevel.SILLY,
} as const

export type LogLevelName = keyof typeof LogLevelMap

export class Logger {
  private static instance: Logger
  private level: LogLevel

  private constructor() {
    this.level = LogLevel.SILENT
    if (process.env.ELECTRON_PROGRESS_WINDOW_LOG_LEVEL) {
      this.level =
        LogLevelMap[
          process.env.ELECTRON_PROGRESS_WINDOW_LOG_LEVEL as LogLevelName
        ]
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  public setLevel(level: LogLevel): void {
    this.level = level
  }

  public error(message: string, ...optionalParams: unknown[]): void {
    if (this.level >= LogLevel.ERROR) {
      console.error(message, ...optionalParams)
    }
  }

  public warn(message: string, ...optionalParams: unknown[]): void {
    if (this.level >= LogLevel.WARN) {
      console.warn(message, ...optionalParams)
    }
  }

  public info(message: string, ...optionalParams: unknown[]): void {
    if (this.level >= LogLevel.INFO) {
      console.info(message, ...optionalParams)
    }
  }

  public log = this.info

  public debug(message: string, ...optionalParams: unknown[]): void {
    if (this.level >= LogLevel.DEBUG) {
      console.log(message, ...optionalParams)
    }
  }

  public silly(message: string, ...optionalParams: unknown[]): void {
    if (this.level >= LogLevel.SILLY) {
      console.log(message, ...optionalParams)
    }
  }
}

export const logger = Logger.getInstance()
