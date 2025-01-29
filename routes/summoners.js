import { Router } from "express";
import { getNumSummoners } from "../models/summoners.js";

const router = Router();

router.get("/count", async (req, res) => {
    try {
        const totalSummoners = await getNumSummoners();
        res.json(totalSummoners);
    } catch (error) {
        console.error("Error with GET /summoners/count", error);
        res.status(500).json({
            message: "Failed to fetch number of summoners. Please try again later.",
        });
    }
});

export default router;
