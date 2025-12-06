import { GlobalLogger, LoggerContext } from './global-logger.service';

export class Logger {
  private static globalLogger = new GlobalLogger();
  private context: LoggerContext;

  constructor(source: string) {
    this.context = { source };
    // 绑定方法到实例，确保 this 上下文正确
    this.verbose = this.verbose.bind(this);
    this.debug = this.debug.bind(this);
    this.log = this.log.bind(this);
    this.warn = this.warn.bind(this);
    this.error = this.error.bind(this);
  }

  verbose(...args: any[]) {
    Logger.globalLogger.verbose(args, this.context);
  }

  debug(...args: any[]) {
    Logger.globalLogger.debug(args, this.context);
  }

  log(...args: any[]) {
    Logger.globalLogger.log(args, this.context);
  }

  warn(...args: any[]) {
    Logger.globalLogger.warn(args, this.context);
  }

  error(...args: any[]) {
    Logger.globalLogger.error(args, this.context);
  }
}
