import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import Express from "express";
import { MongoClient } from "mongodb";
import { configDotenv } from "dotenv";

import setPolling from "./src/setPolling.js";
import { findAll } from "./src/db.js";

configDotenv();
if (!process.env.MONGODB_URI) {
  console.log("mongodb uri absent");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI);

const app = Express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: "*",
    allowedHeaders: "*",
  },
});

app.use(cors());

app.get("/", (_, res) => {
  res.json({ status: "ok" });
});

app.get("/responses", async (_, res) => {
  res.json(await findAll(client));
});

setPolling(io, client);

server.listen(3000, () => {
  console.log("Server started");
});
