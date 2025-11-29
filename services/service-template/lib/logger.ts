/**
 * Structured logging utility for consistent log formatting across the service
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogContext {
  [key: string]: unknown;
}

export class Logger {
  constructor(private readonly serviceName: string) {}

  /**
   * Create a child logger with a specific component name
   */
  child(componentName: string): Logger {
    return new Logger(`${this.serviceName}:${componentName}`);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      error: error instanceof Error ? error.message : String(error),
      ...(error instanceof Error && { stack: error.stack }),
    };
    this.log(LogLevel.ERROR, message, errorContext);
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const logEntry = {
      level,
      service: this.serviceName,
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };

    const logMethod = level === LogLevel.ERROR ? console.error : console.log;
    logMethod(JSON.stringify(logEntry));
  }
}

/**
 * Request logger for tracking HTTP requests with timing
 */
export class RequestLogger {
  private startTime: number;
  private context: LogContext;

  constructor(
    private readonly logger: Logger,
    initialContext?: LogContext,
  ) {
    this.startTime = Date.now();
    this.context = initialContext || {};
  }

  /**
   * Add context to the request logger
   */
  addContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Get elapsed time in milliseconds
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Log request start
   */
  logStart(message: string, context?: LogContext): void {
    this.logger.info(message, {
      ...this.context,
      ...context,
    });
  }

  /**
   * Log successful request completion
   */
  logSuccess(message: string, context?: LogContext): void {
    this.logger.info(message, {
      ...this.context,
      ...context,
      responseTime: this.getElapsedTime(),
    });
  }

  /**
   * Log request error
   */
  logError(message: string, error?: Error | unknown, context?: LogContext): void {
    this.logger.error(message, error, {
      ...this.context,
      ...context,
      responseTime: this.getElapsedTime(),
    });
  }

  /**
   * Log request warning
   */
  logWarn(message: string, context?: LogContext): void {
    this.logger.warn(message, {
      ...this.context,
      ...context,
      responseTime: this.getElapsedTime(),
    });
  }
}

/**
 * Create a logger instance for a service
 */
export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}

/**
 * Create a request logger for tracking a specific request
 */
export function createRequestLogger(logger: Logger, initialContext?: LogContext): RequestLogger {
  return new RequestLogger(logger, initialContext);
}
