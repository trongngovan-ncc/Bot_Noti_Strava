// const startRankingCron = require('./src/cron');
require('dotenv').config();
const express = require('express');
const { MezonClient } = require('mezon-sdk');
const registerHealthApi = require('./api/health');
const handleIntro = require("./commands/intro");
const handleLoginStrava = require("./commands/loginStrava");
const handleMyActivities = require("./commands/myActivities");
const handleRanking = require("./commands/ranking");
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const stravaApi = require('./api/strava');

const PORT = process.env.PORT || 8000;
const APP_TOKEN = process.env.APPLICATION_TOKEN;

// SQLite DB setup (simple, inline for demo)
const dbPath = path.join(__dirname, 'data', 'strava_bot.db');
const db = new sqlite3.Database(dbPath);

(async () => {
  const client = new MezonClient(APP_TOKEN);
  await client.login();
  // startRankingCron(client);
  // Bot chat logic
  client.onChannelMessage(async (event) => {
    const text = event?.content?.t?.toLowerCase();
    if (!text) return;

    if (text.startsWith("*intro_strava")) {
      return handleIntro(client, event);
    }
    if(text.startsWith("*loginstrava")){
      return handleLoginStrava(client, event);
    }
    if(text.startsWith("*myactivities")){
      return handleMyActivities(client, event);
    }

    if(text.startsWith("*ranking")){
      return handleRanking(client, event);
    }
      

  });

  // API logic
  const app = express();  
  registerHealthApi(app);
  app.use('/strava', stravaApi); // Mount all strava API under /strava
  
  app.listen(PORT, () => {
    console.log(`🚀 Bot listening on port ${PORT}`);
    
  });
})();
