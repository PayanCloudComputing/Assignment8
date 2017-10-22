'use strict';

const lodash = require('lodash');
const Promise = require('bluebird');
const AWS = require('aws-sdk');
const cloudWatchLogs = new AWS.CloudWatchLogs({'region': 'us-east-1'});
const dynamodb = new AWS.DynamoDB({'region': 'us-east-1'});

module.exports.post = (event, context) => {
  setTimeout(logEvents, 20000);

  function logEvents() {
    getLambdaMemoryLogs(event.requestId).then(function(memory) {
      let item = {
        'Id': {S: 'log-' + event.requestId},
        'StartTime': {N: event.start},
        'EndTime': {N: event.end},
        'SingleQuantity': {N: event.lambdaCount},
        'Character1': {N: event.character1},
        'Character2': {N: event.character2},
        'MemoryReserved': {S: memory.memorySize},
        'MemoryUsed': {S: memory.memoryUsed}
      };
      let params = {
        TableName: 'payan-marvel-logs',
        Item: item
      }
      putItem(params);
    }).catch(function(error) {
      console.log(error);
    });
  }
}

var getLambdaMemoryLogs = Promise.method(function(requestId) {
  return new Promise(function(resolve) {
    var params = {
      logGroupName: '/aws/lambda/payan-marvel-service-dev-get-common',
      filterPattern: 'REPORT',
      interleaved: true
    };
    
    cloudWatchLogs.filterLogEvents(params, function(err, data) {
      if (err) console.log(err, err.stack);
      else {
        let logStreams = data.events;
        let lambdaLog = lodash.filter(logStreams, log => log.message.includes(requestId))[0];
    
        let memorySize = lambdaLog.message.match(/Memory Size: (.*)\tM/)[1];
        let memoryUsed = lambdaLog.message.match(/Memory Used: (.*)\t/)[1];
        resolve({'memorySize': memorySize, 'memoryUsed': memoryUsed});
      }
    });
  });
});

var putItem = Promise.method(function(params) {
  return new Promise(function(resolve) {
    dynamodb.putItem(params, function(err, data) {
      if (err) console.log(err);
      else     resolve(data);
    });
  });
});
