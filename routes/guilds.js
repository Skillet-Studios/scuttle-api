import { Router } from "express";
import { getNumGuilds } from "../models/guilds.js";

const router = Router();

router.get("/count", async (req, res) => {
    {
        try {
            const numGuilds = await getNumGuilds();
            res.json(numGuilds);
        } catch (error) {
            console.error("Error with GET /guilds/count", error);
            res.status(500).json({
                message: "Failed to fetch number of guilds. Please try again later.",
            });
        }
    }
});

export default router;