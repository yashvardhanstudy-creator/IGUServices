var Service = require('node-windows').Service;

var svc = new Service({
  name: 'NIRF_Server',
  description: 'Internal Tool for IGU Student Data Management',
  script: require('path').join(__dirname, 'index.js'),  // Path to your Express app's main file
  nodeOptions: [
    '--max-old-space-size=4096',
    '--optimize_for_size',
  ],
  wait: 5,
  grow: .25,
  maxRetries: 10,
  maxRestarts: 5,
  abortOnError: false,
});

svc.on('install', function() {
  svc.start();
});

svc.install();
