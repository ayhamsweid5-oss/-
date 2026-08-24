const serverless = require('serverless-http');
const { app } = require('../../server/src/server');

exports.handler = serverless(app);
