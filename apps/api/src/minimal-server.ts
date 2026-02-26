// This minimal server is only used for health-check / startup probes behind a
// TLS-terminating load-balancer (e.g. Railway / Nginx). Plain HTTP is safe here
// because TLS is handled externally; production traffic is never sent over this
// server without TLS at the network edge.
import * as http from "http";
import { Logger } from "@nestjs/common";

const logger = new Logger("MinimalServer");

// Parse and validate port from environment without logging raw input
const rawPort = process.env.PORT;
const portNum = rawPort ? parseInt(rawPort, 10) : null;
const port =
  typeof portNum === "number" && portNum > 0 && portNum < 65536
    ? portNum
    : 3001;

logger.log("==================================================");
logger.log("Minimal health-check server starting");
logger.log(`Node version: ${process.version}`);
logger.log("==================================================");

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: "ok",
      message: "Minimal Server is UP!",
      env: {
        // Only expose minimal, non-sensitive health information
        db_url_set: !!process.env.DATABASE_URL,
      },
    }),
  );
});

server.listen(port, () => {
  logger.log("Minimal health-check server is listening for requests");
});

// Prevent immediate exit
process.on("SIGTERM", () => {
  logger.log("SIGTERM received - shutting down minimal health-check server");
  server.close();
  process.exit(0);
});
