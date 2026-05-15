var Service = require("node-windows").Service;
var path = require("path");

// Create a new service object
var svc = new Service({
  name: "IGUServices Tunnel",
  description:
    "Ngrok CLI tunnel for exposing IGU Syllabus Data Management globally",
  script: path.join(__dirname, "tunnel.js"), // This points to your tunnel.js wrapper
  wait: 5,
  grow: 0.25,
  maxRetries: 10,
  maxRestarts: 5,
  abortOnError: false,
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on("install", function () {
  console.log("✅ Service installed successfully!");
  svc.start();
  console.log("🚀 Service started in the background.");
});

// Install the script as a service
svc.install();
