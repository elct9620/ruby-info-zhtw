type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogEntry = {
  level: LogLevel;
  message: string;
  component: string;
  [key: string]: unknown;
};

export class Logger {
  constructor(private readonly component: string) {}

  debug(message: string, fields?: Record<string, unknown>): void {
    this.log('debug', message, fields);
  }

  info(message: string, fields?: Record<string, unknown>): void {
    this.log('info', message, fields);
  }

  warn(message: string, fields?: Record<string, unknown>): void {
    console.warn(this.entry('warn', message, fields));
  }

  error(message: string, fields?: Record<string, unknown>): void {
    console.error(this.entry('error', message, fields));
  }

  private log(level: 'debug' | 'info', message: string, fields?: Record<string, unknown>): void {
    console.log(this.entry(level, message, fields));
  }

  private entry(level: LogLevel, message: string, fields?: Record<string, unknown>): LogEntry {
    return { level, message, component: this.component, ...fields };
  }
}
