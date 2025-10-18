type LogLevel = "info" | "warn" | "error" | "success" | "debug";

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    data?: unknown;
}

class Logger {
    private formatTimestamp(): string {
        return new Date().toISOString();
    }

    private log(level: LogLevel, message: string, data?: unknown): void {
        const entry: LogEntry = {
            timestamp: this.formatTimestamp(),
            level,
            message,
            data,
        };

        const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;

        switch (level) {
            case "error":
                console.error(prefix, message, data || "");
                break;
            case "warn":
                console.warn(prefix, message, data || "");
                break;
            default:
                console.log(prefix, message, data || "");
        }
    }

    info(message: string, data?: unknown): void {
        this.log("info", message, data);
    }

    warn(message: string, data?: unknown): void {
        this.log("warn", message, data);
    }

    error(message: string, data?: unknown): void {
        this.log("error", message, data);
    }

    success(message: string, data?: unknown): void {
        this.log("success", message, data);
    }

    debug(message: string, data?: unknown): void {
        if (process.env.NODE_ENV === "development") {
            this.log("debug", message, data);
        }
    }
}

export const logger = new Logger();
