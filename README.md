# Wikipedia-Slack
Monitor changes to Wikipedia URLs and notify a Slack channel.

## Usage
- Create a Slack app in your workspace and equip it with the Incoming Webhook feature
- Copy `.env.example` to `.env` and edit it to suit your settings:
  - Set `SLACK_WEBHOOK` as per the Slack Webhook URL obtained above
  - Set `SLACK_CHANNEL` with the target Slack channel that will receive notifications, including leading `#` or `@`
  - Set `TARGET_URIS` with a comma-separated list of Wikipedia URLs (or fragments thereof) that should be monitored for changes
  - (Optional) Set `PROMETHEUS_PORT` to specify a port at which [Prometheus](https://prometheus.io/) metrics will be served on the `/metrics` endpoint
- `docker-compose build && docker-compose up`
- `docker-compose exec app npm test`
