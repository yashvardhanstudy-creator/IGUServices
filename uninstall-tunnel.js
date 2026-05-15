var Service = require("node-windows").Service;
var path = require("path");

// Create a new service object with the exact same name and script path
// as defined in install-tunnel.js. This is crucial for node-windows
// to correctly identify and uninstall the service.
var svc = new Service({
  name: "IGUServices Tunnel",
  script: path.join(__dirname, "tunnel.js"),
});

// Listen for the "uninstall" event and log a message
svc.on("uninstall", function () {
  console.log("✅ Service 'IGUServices Tunnel' uninstalled successfully.");
});

// Listen for errors during uninstallation
svc.on("error", function (err) {
  console.error("❌ Error during uninstallation:", err.message);
});

// Uninstall the service
svc.uninstall();
