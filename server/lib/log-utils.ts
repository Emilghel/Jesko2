/**
 * Logging utilities
 * 
 * This module provides consistent logging functionality across the application.
 */

// Log levels for application logs
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR'
}

/**
 * Standard log function that formats messages consistently
 * @param level Log level
 * @param source Source of the log (component/module name)
 * @param message Log message
 */
export function log(level: LogLevel, source: string, message: string) {
  const timestamp = new Date().toISOString();
  
  switch (level) {
    case LogLevel.DEBUG:
      console.debug(`[${timestamp}] [${level}] [${source}] ${message}`);
      break;
    case LogLevel.INFO:
      console.info(`[${timestamp}] [${level}] [${source}] ${message}`);
      break;
    case LogLevel.WARNING:
      console.warn(`[${timestamp}] [${level}] [${source}] ${message}`);
      break;
    case LogLevel.ERROR:
      console.error(`[${timestamp}] [${level}] [${source}] ${message}`);
      break;
    default:
      console.log(`[${timestamp}] [${level}] [${source}] ${message}`);
  }
  
  // In a production app, we would also write logs to a database or file
  // and potentially trigger alerts for ERROR level logs
}