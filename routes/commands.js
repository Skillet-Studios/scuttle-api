import { Router } from "express";
import { getNumCommandsSent } from "../models/commands.js";

const router = Router();

router.get("/count", async (req, res) => {
    try {
        const totalCommands = await getNumCommandsSent();
        res.json(totalCommands);
    } catch (error) {
        console.error("Error with GET /commands/count", error);
        res.status(500).json({
            message: "Failed to fetch number of commands sent. Please try again later.",
        });
    }
});

export default router;