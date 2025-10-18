import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client singleton instance.
 *
 * In development, this prevents creating multiple instances during hot reloads.
 * In production, creates a single instance for the application lifecycle.
 *
 * @type {PrismaClient}
 */
let prisma;

if (process.env.NODE_ENV === "production") {
    prisma = new PrismaClient();
} else {
    // In development, use a global variable to preserve the client across hot reloads
    if (!global.prisma) {
        global.prisma = new PrismaClient();
    }
    prisma = global.prisma;
}

/**
 * Returns the Prisma Client instance.
 *
 * @returns {PrismaClient} The Prisma Client instance
 */
export function getPrisma() {
    return prisma;
}

export default prisma;
