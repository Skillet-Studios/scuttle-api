import express from "express";
import cors from "cors";;

import guilds from "./routes/guilds.js";
import commands from "./routes/commands.js";
import summoners from "./routes/summoners.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    credentials: true,
    origin: [
      "http://localhost:3000",
      /\.scuttle\.gg%/,
      "https://www.scuttle.gg",
      "https://api.scuttle.gg",
      "https://scuttle-website-aa38f423d608.herokuapp.com",
    ],
  })
);

app.use("/guilds", guilds);
app.use("/commands", commands);
app.use("/summoners", summoners);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
