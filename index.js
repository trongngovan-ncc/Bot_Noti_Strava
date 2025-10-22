// const startRankingCron = require('./src/cron');
require('dotenv').config();
const express = require('express');
const { MezonClient } = require('mezon-sdk');
const registerHealthApi = require('./api/health');
const handleHelp = require("./commands/help");
const handleLogin = require("./commands/login");
const handleMyActivity = require("./commands/myactivity");
const handleRanking = require("./commands/ranking");
const handleLastActivity = require("./commands/latest_atv");
const handleTest = require("./commands/test_message");
const handleTestForm = require("./commands/test_form");
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const stravaApi = require('./api/strava');

const PORT = process.env.PORT || 8000;
const APP_TOKEN = process.env.APPLICATION_TOKEN;


const dbPath = path.join(__dirname, 'data', 'strava_bot.db');
const db = new sqlite3.Database(dbPath);
const BOT_TOKEN = process.env.APPLICATION_TOKEN_TEST;
const BOT_ID = process.env.APPLICATION_ID_TEST;


(async () => {
  const client = new MezonClient({ botId: BOT_ID, token: BOT_TOKEN});
  await client.login();

  client.onChannelMessage(async (event) => {
    const text = event?.content?.t?.toLowerCase();
    if (!text) return;

    if (text === "*strava_help") {
      return handleHelp(client, event);
    }
    if (text === "*strava_login") {
      return handleLogin(client, event);
    }
    if (text === "*strava_myactivity") {
      return handleMyActivity(client, event);
    }
    if (text === "*strava_ranking") {
      return handleRanking(client, event);
    }
    if (text === "*strava_lastactivity") {
      return handleLastActivity(client, event);
    }

    if(text === "*test") {
      return handleTest(client, event);
    }

    if(text === "*test_form") {
      return handleTestForm(client, event);
    }
  });

  // API logic
  const app = express();  
  registerHealthApi(app);
  app.use('/strava', stravaApi(client)); // Mount all strava API under /strava
  app.listen(PORT, () => {
    console.log(`🚀 Bot listening on port ${PORT}`);
  });
})();

  