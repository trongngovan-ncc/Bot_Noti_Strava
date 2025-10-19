const express = require('express');
let clientGlobal = null;
function createStravaRouter(client) {
  clientGlobal = client;
  const router = express.Router();
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// SQLite DB setup (simple, inline for demo)
const dbPath = path.join(__dirname, '../data', 'strava_bot.db');
const db = new sqlite3.Database(dbPath);

// Hàm đăng ký webhook Strava (chỉ gọi 1 lần)
async function ensureStravaWebhook(callbackUrl, verifyToken) {
  const axios = require('axios');
  try {
    // Kiểm tra đã có subscription chưa
    const listRes = await axios.get('https://www.strava.com/api/v3/push_subscriptions', {
      params: {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET
      }
    });
    if (Array.isArray(listRes.data) && listRes.data.length > 0) {
      return { already: true, id: listRes.data[0].id };
    }
    // Đăng ký mới
    const res = await axios.post('https://www.strava.com/api/v3/push_subscriptions', null, {
      params: {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        callback_url: callbackUrl,
        verify_token: verifyToken
      }
    });
    return { created: true, id: res.data.id };
  } catch (err) {
    console.error('Đăng ký webhook Strava thất bại:', err?.response?.data || err.message);
    return { error: true, message: err?.response?.data || err.message };
  }
}

// Strava OAuth callback
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.status(400).send('Missing code or state');
  }
  try {
    // Exchange code for tokens
    const tokenRes = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code'
    });
    const { access_token, refresh_token, expires_at, athlete } = tokenRes.data;
    // Save to DB (upsert)
    db.run(
      `INSERT OR REPLACE INTO athletes (strava_athlete_id, mezon_user_id, access_token, refresh_token, token_expires_at, athlete_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [athlete.id, state, access_token, refresh_token, new Date(expires_at * 1000).toISOString(), `${athlete.firstname} ${athlete.lastname}`],
      async (err) => {
        let webhookMsg = '';
        if (err) {
          console.error('DB error:', err);
          return res.status(500).send('Lỗi lưu thông tin user vào DB.');
        } else {
          // Đăng ký webhook nếu chưa có
          const callbackUrl = `${process.env.STRAVA_WEBHOOK_URI}?token=${process.env.WEBHOOK_SECRET_TOKEN}`;
          const webhookRes = await ensureStravaWebhook(callbackUrl, process.env.WEBHOOK_SECRET_TOKEN);
          if (webhookRes.error) {
            webhookMsg = `<p>Đăng ký webhook Strava thất bại: ${JSON.stringify(webhookRes.message)}</p>`;
          } else if (webhookRes.already) {
            webhookMsg = '<p>Webhook Strava đã được đăng ký trước đó.</p>';
          } else if (webhookRes.created) {
            webhookMsg = '<p>Đăng ký webhook Strava thành công!</p>';
          }
        }
        res.send(`
          <html>
            <head><title>Strava Connected</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>🎉 Kết nối thành công!</h1>
              <p>Tài khoản Strava của <strong>${athlete.firstname} ${athlete.lastname}</strong> đã được kết nối.</p>
              ${webhookMsg}
              <p>Bạn có thể đóng trang này và quay lại Mezon.</p>
            </body>
          </html>
        `);
      }
    );
  } catch (err) {
    console.error('Strava OAuth error:', err?.response?.data || err.message);
    res.status(500).send('Kết nối Strava thất bại. Vui lòng thử lại.');
  }
});

// Webhook verification (GET) and event handler (POST)
router.get('/webhook', (req, res) => {
  // Strava sends a challenge for verification
  const challenge = req.query['hub.challenge'] || req.query['challenge'];
  if (challenge) return res.status(200).json({ "hub.challenge": challenge });
  res.status(200).send('ok');
});

router.post('/webhook', express.json({ limit: '1mb' }), async (req, res) => {
  // Quick ACK
  res.status(200).send('ok');

  // Optional: verify token in callback URL
  const token = req.query.token;
  if (token && token !== process.env.WEBHOOK_SECRET_TOKEN) {
    console.warn('Webhook token mismatch');
    return;
  }

  const event = req.body;
  // Only handle activity events
  if (event.object_type !== 'activity') return;

  const { object_id, owner_id, aspect_type } = event;
  // Find athlete in DB
  db.get('SELECT * FROM athletes WHERE strava_athlete_id = ?', [owner_id], async (err, athlete) => {
    if (err || !athlete) {
      console.warn('No athlete found for owner_id:', owner_id);
      return;
    }
    if (aspect_type === 'delete') {
      db.run('UPDATE activities SET deleted = 1 WHERE activity_id = ?', [String(object_id)]);
      return;
    }
    // Fetch activity detail from Strava
    let data;
    let accessToken = athlete.access_token;
    try {
      const r = await axios.get(`https://www.strava.com/api/v3/activities/${object_id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } });
      data = r.data;
    } catch (err) {
      // Nếu lỗi 401, thử refresh token
      if (err.response && err.response.status === 401 && athlete.refresh_token) {
        try {
          const refreshRes = await axios.post('https://www.strava.com/oauth/token', {
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: athlete.refresh_token
          });
          accessToken = refreshRes.data.access_token;
          // Lưu lại access_token và refresh_token mới vào DB
          db.run(`UPDATE athletes SET access_token = ?, refresh_token = ?, token_expires_at = ? WHERE strava_athlete_id = ?`,
            [refreshRes.data.access_token, refreshRes.data.refresh_token, new Date(refreshRes.data.expires_at * 1000).toISOString(), athlete.strava_athlete_id]
          );
          // Thử lại lấy activity
          const r2 = await axios.get(`https://www.strava.com/api/v3/activities/${object_id}`,
            { headers: { Authorization: `Bearer ${accessToken}` } });
          data = r2.data;
        } catch (err2) {
          console.error('Error refreshing token or fetching activity:', err2?.response?.data || err2.message);
          return;
        }
      } else {
        console.error('Error fetching activity from Strava:', err?.response?.data || err.message);
        return;
      }
    }
    // Upsert activity nếu lấy được data và gửi thông báo có ảnh map
    if (data) {
      const polyline = require('@mapbox/polyline');
      const puppeteer = require('puppeteer');
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });
      let mapImageUrl = '';
      try {
        const encodedPolyline = data.map && (data.map.summary_polyline || data.map.polyline);
        if (!encodedPolyline) throw new Error('Không có polyline trong activity');
        const coordinates = polyline.decode(encodedPolyline);
        const leafletHtml = `<!DOCTYPE html>
        <html>
        <head>
          <meta charset=\"UTF-8\">
          <title>Strava Activity Map</title>
          <link rel=\"stylesheet\" href=\"https://unpkg.com/leaflet/dist/leaflet.css\" />
          <style>#map { width: 800px; height: 600px; }</style>
        </head>
        <body>
          <div id=\"map\"></div>
          <script src=\"https://unpkg.com/leaflet/dist/leaflet.js\"></script>
          <script>
            const coordinates = ${JSON.stringify(coordinates)};
            const map = L.map('map').setView(coordinates[0], 17);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            L.polyline(coordinates, {color: 'red', weight: 4}).addTo(map);
            map.fitBounds(coordinates);
          </script>
        </body>
        </html>`;
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setViewport({ width: 800, height: 600 });
        await page.setContent(leafletHtml, { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        const imgPath = `activity_map_${data.id}.png`;
        await page.screenshot({ path: imgPath });
        await browser.close();
        // Upload lên Cloudinary
        const uploadRes = await cloudinary.uploader.upload(imgPath, { folder: 'strava-maps', public_id: `activity_map_${data.id}` });
        mapImageUrl = uploadRes.secure_url;
        // Xóa file tạm
        try { require('fs').unlinkSync(imgPath); } catch(e){}
      } catch (err) {
        console.error('Puppeteer/polyline error:', err);
        mapImageUrl = '';
      }
      // Gửi thông báo lên channel cố định
      try {
        const client = clientGlobal;
        const CHANNEL_ID = '1979045736288882688';
        if (client) {
          const channel = await client.channels.fetch(CHANNEL_ID);
          let msg = `🏅 Hoạt động mới của ${athlete.athlete_name || athlete.firstname || ''}:\n`;
          msg += `Tên: ${data.name}\nLoại: ${data.sport_type}\nQuãng đường: ${(data.distance/1000).toFixed(2)} km\nThời gian: ${(data.moving_time/60).toFixed(1)} phút\nNgày: ${data.start_date_local}\n`;
          const attachmentsArr = mapImageUrl ? [
            {
              filename: 'strava_map.png',
              url: mapImageUrl,
              filetype: 'image/png'
            }
          ] : [];
          await channel.send({ t: msg, mk: [ { type: 'pre', s: 0, e: msg.length } ] }, [], attachmentsArr);
        }
      } catch (err) {
        console.error('Gửi thông báo lên channel lỗi:', err);
      }
      db.run(`INSERT OR REPLACE INTO activities (activity_id, source, strava_athlete_id, sport_type, activity_name, distance_m, duration_s, start_date_local, timezone, private, deleted, created_at)
        VALUES (?, 'strava', ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
        [String(data.id), athlete.strava_athlete_id, data.type, data.name, data.distance, data.moving_time, data.start_date_local, data.timezone, data.private ? 1 : 0]
      );
    }
  });
});

  return router;
}
module.exports = createStravaRouter;
