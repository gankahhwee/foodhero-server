// Locate your certificate
var join = require('path').join
  , pfx = join(__dirname, '../_cert/oct15.p12');

// Create a new agent
var apnagent = require('apnagent')
  , agent = module.exports = new apnagent.Agent();

agent.set('pfx file', pfx);
//agent.set('cert file', join(__dirname, '../_
agent.enable('sandbox');


agent.connect(function (err) {
  // gracefully handle auth problems
  if (err && err.name === 'GatewayAuthorizationError') {
    console.log('Authentication Error: %s', err.message);
    process.exit(1);
  }

  // handle any other err (not likely)
  else if (err) {
    throw err;
  }

  // it worked!
  var env = agent.enabled('sandbox')
    ? 'sandbox'
    : 'production';

  console.log('apnagent [%s] gateway connected', env);
});
