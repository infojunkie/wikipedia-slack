const EventSource = require('eventsource');
const axios = require('axios');
const Prometheus = require('prom-client');
const express = require('express');
const lookup = require('country-code-lookup')

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'); // $& means the whole matched string
}

// https://stackoverflow.com/a/54577682/209184
function isMochaRunning(context) {
  return ['afterEach','after','beforeEach','before','describe','it'].every(function(functionName) {
    return context[functionName] instanceof Function;
  });
}

async function handleEvent(event) {
  // Parse the RecentChanges Wikipedia message
  // https://www.mediawiki.org/wiki/Manual:RCFeed
  const rcMessage = JSON.parse(event.data);
  if (shouldProcess(rcMessage)) {
    await sendToSlack(eventToSlack(rcMessage));
  }
}

// Conditions for sending a Slack notification
function shouldProcess(rcMessage) {
  const parts = rcMessage.meta.uri.split('/');
  let country;
  try {
    country = lookup.byIso(parts[parts.length - 1]);
  }
  catch (e) {
    country = null;
  }
  return rcMessage.meta.uri.match(targetUris) // Match one of the given target URI fragments
      && !rcMessage.bot // NOT made by a bot
      && (rcMessage.type !== 'edit' || !rcMessage.minor) // NOT a minor edit
      && (['edit', 'log'].includes(rcMessage.type)) // Change event is either edit or log
      && !country // NOT a translation page
}

function eventToSlack(rcMessage) {
  let text = `Wikipedia user *${rcMessage.user}* has edited <${rcMessage.meta.uri}|${rcMessage.title}>`;
  if (rcMessage.comment) {
    text = text + `:\n> ${rcMessage.comment}`
  }
  // Format a Slack message
  // https://api.slack.com/messaging/composing
  return {
    text
  }
}

async function sendToSlack(slackMessage) {
  return axios.post(process.env['SLACK_WEBHOOK'], {
    channel: process.env['SLACK_CHANNEL'],
    ...slackMessage
  }, { headers: {
    'Content-Type': 'application/json'
  }});
}

const targetUris = process.env['TARGET_URIS'].split(',').map(u => escapeRegExp(u.trim())).join('|');

if (!isMochaRunning(global)) {
  console.log('Monitoring', targetUris);

  const eventSource = new EventSource('https://stream.wikimedia.org/v2/stream/recentchange');
  eventSource.onopen = function(event) {
    console.log('--- Opened connection.');
  };

  eventSource.onerror = function(event) {
    console.error('--- Encountered error:', event);
  };

  eventSource.onmessage = handleEvent;

  if (process.env['PROMETHEUS_PORT']) {
    Prometheus.collectDefaultMetrics();
    const register = Prometheus.register;
    const server = express();
    server.get('/', async (req, res) => {
      res.send('Good day sunshine!');
    });
    server.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
      } catch (ex) {
        res.status(500).end(ex);
      }
    });
    console.log(`Server listening on port ${process.env['PROMETHEUS_PORT']}, metrics exposed on /metrics endpoint`);
    server.listen(process.env['PROMETHEUS_PORT']);
  }
}

module.exports = {
  handleEvent
}