// This minimal server is only used for health-check / startup probes behind a
// TLS-terminating load-balancer (e.g. Railway / Nginx). Plain HTTP is safe here
// because TLS is handled externally; production traffic is never sent over this
// server without TLS at the network edge.
import * as http from "http";

// Parse and validate port from environment (sanitize user-controlled input before logging)
const rawPort = process.env.PORT;
const portNum = rawPort ? parseInt(rawPort, 10) : null;
const port =
  typeof portNum === "number" && portNum > 0 && portNum < 65536
    ? portNum
    : 3001;

console.log("==================================================");
console.log("!!! MINIMAL SERVER STARTING !!!");
console.log("Current Directory:", process.cwd());
// Log the sanitized/validated port number only (not raw env string)
// Using a numeric value ensures no log injection (S5145)
console.log("Resolved PORT:", Number(port));
console.log("Node Version:", process.version);
console.log("==================================================");

const server = http.createServer((_req, res) => {
  console.log("[MINIMAL] Health check request received");
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: "ok",
      message: "Minimal Server is UP!",
      env: {
        port,
        db_url_set: !!process.env.DATABASE_URL,
      },
    }),
  );
});

server.listen(port, () => {
  console.log(`!!! MINIMAL SERVER LISTENING ON PORT ${port} !!!`);
});

// Prevent immediate exit
process.on("SIGTERM", () => {
  console.log("SIGTERM received");
  server.close();
  process.exit(0);
});
