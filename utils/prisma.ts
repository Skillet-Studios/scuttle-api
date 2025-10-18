import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client singleton instance.
 *
 * In development, this prevents creating multiple instances during hot reloads.
 * In production, creates a single instance for the application lifecycle.
 */

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log:
            process.env.NODE_ENV === "development"
                ? ["query", "error", "warn"]
                : ["error"],
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export default prisma;
