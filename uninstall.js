var Service = require("node-windows").Service;

// Create a new service object with the same name and script path
// as defined in install.js. This is crucial for node-windows
// to correctly identify and uninstall the service.
var svc = new Service({
  name: "IGUServices Server",
  script: require("path").join(__dirname, "index.js"),
});

// Listen for the "uninstall" event and log a message
svc.on("uninstall", function () {
  console.log("Service 'IGUServices Server' uninstalled successfully.");
  console.log("The service exists:", svc.exists);
});

// Listen for errors during uninstallation
svc.on("error", function (err) {
  console.error("Error during uninstallation:", err.message);
});

// Uninstall the service
svc.uninstall();
