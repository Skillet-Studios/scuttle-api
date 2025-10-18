import { Response } from "express";

interface SuccessResponse {
    success: true;
    message?: string;
    data?: unknown;
}

interface ErrorResponse {
    success: false;
    message: string;
}

export function respondWithSuccess(
    res: Response,
    statusCode: number = 200,
    message?: string,
    data?: unknown
): Response {
    const response: SuccessResponse = {
        success: true,
    };

    if (message) {
        response.message = message;
    }

    if (data !== undefined) {
        response.data = data;
    }

    return res.status(statusCode).json(response);
}

export function respondWithError(
    res: Response,
    statusCode: number,
    message: string
): Response {
    const response: ErrorResponse = {
        success: false,
        message,
    };

    return res.status(statusCode).json(response);
}
