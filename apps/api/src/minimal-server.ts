import * as http from "http";

console.log("==================================================");
console.log("!!! MINIMAL SERVER STARTING !!!");
console.log("Current Directory:", process.cwd());
console.log("Environment PORT:", process.env.PORT);
console.log("Node Version:", process.version);
console.log("==================================================");

const port = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  const safeMethod = req.method ? req.method.replace(/[\r\n]/g, "") : "";
  const safeUrl = req.url ? encodeURIComponent(req.url) : "";
  console.log(`[MINIMAL] Received request: ${safeMethod} ${safeUrl}`);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: "ok",
      message: "Minimal Server is UP!",
      env: {
        port: process.env.PORT,
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
