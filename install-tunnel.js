var Service = require("node-windows").Service;
var path = require("path");

var svc = new Service({
  name: "IGUServices Tunnel",
  description: "Ngrok Tunnel for IGU Syllabus Data Management",
  script: path.join(__dirname, "tunnel.js"),
  wait: 5,
  grow: 0.25,
  maxRetries: 10,
  maxRestarts: 5,
  abortOnError: false,
});

svc.on("install", function () {
  svc.start();
  console.log(
    "✅ Service 'IGUServices Tunnel' installed and started successfully.",
  );
});

svc.on("alreadyinstalled", function () {
  console.log("⚠️ Service 'IGUServices Tunnel' is already installed.");
});

svc.install();
