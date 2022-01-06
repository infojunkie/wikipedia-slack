const assert = require('assert');
const sinon = require('sinon');
const axios = require('axios');
const fs = require('fs');

// Set testing environment variables before we include the module.
process.env['TARGET_URIS'] = 'wiki/User:InternetArchiveBot,wiki/User_talk:InternetArchiveBot,wiki/InternetArchiveBot,wiki/Talk:InternetArchiveBot,wiki/User_talk:Infojunkie71';
process.env['SLACK_CHANNEL'] = 'channel';
process.env['SLACK_WEBHOOK'] = 'webhook';
process.env['PROMETHEUS_PORT'] = null;

const { handleEvent } = require('../index.js');

describe('wikipedia-slack', function() {
  it ('handles basic edit event', async function() {
    const event = JSON.parse(fs.readFileSync('test/basic.json'));
    const axiosMock = sinon.mock(axios);
    const expectationPost = axiosMock.expects('post');
    expectationPost.once();
    expectationPost.withArgs('webhook', {
      channel: 'channel',
      text: `Wikipedia user *${event.user}* has edited <${event.meta.uri}|${event.title}>`,
    });
    await handleEvent({ data: JSON.stringify(event)});
    axiosMock.verify();
  });

  it ('ignores unwanted events', async function() {
    const events = JSON.parse(fs.readFileSync('test/unwanted.json'));
    const axiosMock = sinon.mock(axios);
    const expectationPost = axiosMock.expects('post');
    expectationPost.never();
    for (const event of events) {
      await handleEvent({ data: JSON.stringify(event)});
    }
    axiosMock.verify();
  });

  it ('is not fooled by 3-letter trailing path', async function() {
    const event = JSON.parse(fs.readFileSync('test/not-country.json'));
    const axiosMock = sinon.mock(axios);
    const expectationPost = axiosMock.expects('post');
    expectationPost.once();
    expectationPost.withArgs('webhook', {
      channel: 'channel',
      text: `Wikipedia user *${event.user}* has edited <${event.meta.uri}|${event.title}>`,
    });
    await handleEvent({ data: JSON.stringify(event)});
    axiosMock.verify();
  });
});
