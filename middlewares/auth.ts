import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.SCUTTLE_API_KEY;

/**
 * Middleware to verify the API key in request headers.
 */
export function verifyApiKey(req: Request, res: Response, next: NextFunction) {
    const receivedApiKey = req.headers["x-api-key"] as string | undefined;

    if (!receivedApiKey) {
        return res.status(401).json({
            success: false,
            message: "Missing API key.",
        });
    }

    if (receivedApiKey !== API_KEY) {
        return res.status(403).json({
            success: false,
            message: "Invalid API key.",
        });
    }

    next(); // Proceed to the next middleware or route handler
}
