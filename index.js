const startRankingCron = require('./handler/cronjob');
require('dotenv').config();
const express = require('express');
const { MezonClient } = require('mezon-sdk');
const registerHealthApi = require('./api/health');
const handleHelp = require("./commands/help");
const handleLogin = require("./commands/login");
const handleMyActivity = require("./commands/myactivity");
const handleRanking = require("./commands/ranking");
const handleDailyLog = require("./commands/daily_log");
const handleRegister = require("./commands/register");
const handleReportFilter = require("./commands/report_filter");
const submitManualActivity = require('./handler/activity_manual');
const viewReportActivity = require('./handler/report');
const handleTest = require("./commands/test");
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
  startRankingCron(client);
  client.onMessageButtonClicked(async (ev) => {
    const buttonId = ev.button_id || '';
    if (buttonId.startsWith('button-submit-') || buttonId.startsWith('button-cancel-')) {
      await submitManualActivity(client, ev);
    }
    if (buttonId.startsWith('button-report-view') || buttonId.startsWith('button-report-cancel') ) {
      await viewReportActivity(client, ev);
    }
  });

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

    if(text === "*strava_daily") {
      return handleDailyLog(client, event);
    }

    if(text === "*strava_register"){
      return handleRegister(client, event);
    }
    
    if(text === "*strava_report"){
      return handleReportFilter(client, event);
    }

    if(text === "*test"){
     return handleTest(client, event);
    }
    
  });

  const app = express();  
  registerHealthApi(app);
  app.use('/strava', stravaApi(client)); 
  app.listen(PORT, () => {
    console.log(`🚀 Bot listening on port ${PORT}`);
  });
})();

  