/**
 * Centralized logging system with file and console output
 */

import { LogEntry } from './types';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private minLevel: LogLevel;
  private module: string;
  private logs: LogEntry[] = [];

  constructor(module: string, minLevel: LogLevel = 'info') {
    this.module = module;
    this.minLevel = minLevel;
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const entry: LogEntry = {
      timestamp,
      level,
      module: this.module,
      message,
      data,
    };

    this.logs.push(entry);

    const colorCodes: Record<LogLevel, string> = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
    };

    const reset = '\x1b[0m';
    const color = colorCodes[level];

    const formattedMessage = `${color}[${timestamp}] [${level.toUpperCase()}] [${this.module}]${reset} ${message}`;

    if (data !== undefined) {
      console.log(formattedMessage, data);
    } else {
      console.log(formattedMessage);
    }
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export default Logger;
