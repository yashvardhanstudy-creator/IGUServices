const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { spawn } = require("child_process");

const port = process.env.PORT_REAL || 3005;
const url = process.env.NGROK_DOMAIN;
const authtoken = process.env.NGROK_AUTHTOKEN;

if (!url) {
  console.error("❌ NGROK_DOMAIN is missing in .env file.");
  process.exit(1);
}

console.log(`🚀 Starting ngrok tunnel on port ${port} for ${url}...`);

const authFlag = authtoken ? `--authtoken=${authtoken}` : "";
const ngrokProcess = spawn(`ngrok http ${authFlag} --url=${url} ${port}`, {
  shell: true,
});

ngrokProcess.stdout.on("data", (data) => console.log(data.toString().trim()));
ngrokProcess.stderr.on("data", (data) => console.error(data.toString().trim()));
ngrokProcess.on("close", (code) => process.exit(code || 1));
