const path = require("path");
// Explicitly point to the .env file so the Windows Service can find it
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { spawn, execSync } = require("child_process");

const port = 3005;
const domain = process.env.NGROK_DOMAIN;

if (!domain) {
  console.error(
    "❌ NGROK_DOMAIN is missing! The .env file was not loaded correctly.",
  );
  process.exit(1);
}

// Clean up any orphaned ngrok CLI processes before starting to prevent "already exists" errors
try {
  if (process.platform === "win32") {
    execSync("taskkill /f /im ngrok.exe", { stdio: "ignore" });
  } else {
    execSync("pkill -9 ngrok", { stdio: "ignore" });
  }
  console.log("🧹 Cleaned up orphaned ngrok processes.");
} catch (e) {
  // Safe to ignore if no ngrok process was found
}

console.log(
  `🚀 Starting ngrok CLI tunnel for port ${port} with domain ${domain}...`,
);

// This spawns the exact same CLI command that works for you, plus your static domain:
// ngrok http --domain=vice-gaffe-undercoat.ngrok-free.dev 3005
const ngrokProcess = spawn("ngrok", ["http", `--domain=${domain}`, port], {
  stdio: "pipe", // "inherit" will crash a Windows Service since there is no visible terminal
  shell: true,
});

ngrokProcess.stdout.on("data", (data) => {
  console.log(`ngrok stdout: ${data.toString().trim()}`);
});

ngrokProcess.stderr.on("data", (data) => {
  console.error(`ngrok stderr: ${data.toString().trim()}`);
});

ngrokProcess.on("error", (error) => {
  console.error("❌ Failed to start ngrok CLI process:", error);
});

ngrokProcess.on("close", (code) => {
  console.log(`🛑 ngrok process exited with code ${code}`);
  process.exit(code || 1); // Exit Node so node-windows knows to restart it
});
