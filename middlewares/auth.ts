import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { respondWithError } from "../utils/responses.js";

dotenv.config();

const API_KEY = process.env.SCUTTLE_API_KEY;

if (!API_KEY) {
    throw new Error("SCUTTLE_API_KEY environment variable is required");
}

export function verifyApiKey(req: Request, res: Response, next: NextFunction) {
    const receivedApiKey = req.headers["x-api-key"] as string | undefined;

    if (!receivedApiKey) {
        return respondWithError(res, 401, "Missing API key");
    }

    if (receivedApiKey !== API_KEY) {
        return respondWithError(res, 403, "Invalid API key");
    }

    return next();
}
