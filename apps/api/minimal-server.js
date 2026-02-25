// Minimal health-check server behind a TLS-terminating load-balancer.
// Plain HTTP is safe here; TLS is handled at the network edge.
/* eslint-disable @typescript-eslint/no-var-requires */
const http = require("http");

console.log("==================================================");
console.log("!!! JS MINIMAL SERVER STARTING !!!");
console.log("Node:", process.version);
console.log("DIR:", __dirname);
console.log("FILES:", require("fs").readdirSync(__dirname));
console.log("==================================================");

const port = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  console.log("Request:", req.url ? encodeURIComponent(req.url) : "");
  res.writeHead(200);
  res.end("JS Minimal Server OK");
});

server.listen(port, "0.0.0.0", () => {
  console.log(`LISTENING ON ${port}`);
});

process.on("SIGTERM", () => process.exit(0));
