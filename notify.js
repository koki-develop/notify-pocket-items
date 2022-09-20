const _ = require("lodash");
const axios = require("axios").default;
const { WebClient } = require("@slack/web-api");

(async () => {
  const pickCount = 3;
  const pocketConsumerKey = process.env.POCKET_CONSUMER_KEY;
  const pocketAccessToken = process.env.POCKET_ACCESS_TOKEN;
  const slackAccessToken = process.env.SLACK_ACCESS_TOKEN;

  const { data } = await axios.get("https://getpocket.com/v3/get", {
    params: {
      consumer_key: pocketConsumerKey,
      access_token: pocketAccessToken,
    },
  });

  const items = Object.entries(data.list).map(([, item]) => item);
  const pickedItems = _.sampleSize(items, pickCount);

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: "Today's Picked Up Items" },
    },
  ];
  if (pickedItems.length === 0) {
    blocks.push({
      type: "section",
      text: {
        type: "plain_text",
        text: "No items.",
      },
    });
  } else {
    for (const item of pickedItems) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*<${item.given_url}|${
            item.resolved_title ?? item.given_url
          }>* ( <https://getpocket.com/read/${item.item_id}|Pocket> )`,
        },
      });
      if (item.excerpt) {
        blocks.push({
          type: "section",
          text: {
            type: "plain_text",
            text: `${item.excerpt}...`,
          },
        });
      }
      blocks.push({ type: "divider" });
    }
  }

  const slack = new WebClient(slackAccessToken);
  await slack.chat.postMessage({
    channel: "#feeds",
    text: "Today's Picked Up Items",
    blocks,
  });

  if (pickedItems.length > 0) {
    await axios.post(
      "https://getpocket.com/v3/send",
      {
        consumer_key: pocketConsumerKey,
        access_token: pocketAccessToken,
        actions: pickedItems.map((item) => ({
          action: "archive",
          item_id: item.item_id,
        })),
      },
      {
        headers: { "content-type": "application/json" },
      }
    );
  }
})();
