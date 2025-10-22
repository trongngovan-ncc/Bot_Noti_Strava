const path = require('path');
const fs = require('fs');

module.exports = function registerHealthApi(app) {
  app.get('/health', (req, res) => res.json({ ok: true }));

  app.get('/backup/db', (req, res) => {

    const validToken = process.env.BACKUP_TOKEN;
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send('Unauthorized: missing or invalid token');
    }
      const token = authHeader.slice(7).trim();
      if (token !== validToken) {
        return res.status(401).send('Unauthorized: missing or invalid token');
      }
      const dbPath = path.join(__dirname, '../data/strava_bot.db');
      if (!fs.existsSync(dbPath)) {
        return res.status(404).send('DB file not found');
      }
      res.download(dbPath, 'strava_bot.db');
  });
};
