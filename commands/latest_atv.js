
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');
const puppeteer = require('puppeteer');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = async function handleLastActivity(client, event) {
  console.log('handleLastActivity START', { sender_id: event.sender_id, channel_id: event.channel_id });
  const mezonUserId = event.sender_id;
  const dbPath = path.join(__dirname, '../data', 'strava_bot.db');
  const db = new sqlite3.Database(dbPath);
  const channel = await client.channels.fetch(event.channel_id);
  const message = await channel.messages.fetch(event.message_id);

  // 1. Lấy access token từ DB
  db.get(
    `SELECT athlete_name, access_token, refresh_token, strava_athlete_id FROM athletes WHERE mezon_user_id = ? LIMIT 1`,
    [mezonUserId],
    async (err, userRow) => {
      if (err) console.error('DB error:', err);
      if (err || !userRow) {
        await message.reply({ t: '🙁 Không tìm thấy thông tin tài khoản Strava.' });
        db.close();
        return;
      }
      const username = userRow.athlete_name;
      let accessToken = userRow.access_token;
      let refreshToken = userRow.refresh_token;
      const stravaAthleteId = userRow.strava_athlete_id;

      // 2. Dùng activity_id fix cứng
      const activityId = '16186963028';
      let activity;

      // 3. Gọi API lấy chi tiết activity
  try {
        const r = await axios.get(`https://www.strava.com/api/v3/activities/${activityId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } });
        activity = r.data;
      } catch (err) {
        // Nếu lỗi 401, thử refresh token
        if (err.response && err.response.status === 401 && refreshToken) {
          try {
            const refreshRes = await axios.post('https://www.strava.com/oauth/token', {
              client_id: process.env.STRAVA_CLIENT_ID,
              client_secret: process.env.STRAVA_CLIENT_SECRET,
              grant_type: 'refresh_token',
              refresh_token: refreshToken
            });
            accessToken = refreshRes.data.access_token;
            refreshToken = refreshRes.data.refresh_token;
            // Cập nhật lại DB
            db.run(`UPDATE athletes SET access_token = ?, refresh_token = ?, token_expires_at = ? WHERE mezon_user_id = ?`,
              [accessToken, refreshToken, new Date(refreshRes.data.expires_at * 1000).toISOString(), mezonUserId]
            );
            // Thử lại lấy activity
            const r2 = await axios.get(`https://www.strava.com/api/v3/activities/${activityId}`,
              { headers: { Authorization: `Bearer ${accessToken}` } });
            activity = r2.data;
          } catch (err2) {
            await message.reply({ t: '❌ Lỗi refresh token hoặc lấy activity.' });
            db.close();
            return;
          }
        } else {
          await message.reply({ t: '❌ Lỗi lấy activity từ Strava.' });
          db.close();
          return;
        }
      }
  
      // 4. Lấy embed_token
      const embedToken = activity.embed_token;
      console.log('Embed token:', embedToken);
      // 5. Dùng Puppeteer chụp ảnh embedded map
      let mapImageUrl = '';
      try {
        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
                    const page = await browser.newPage();
        await page.setViewport({ width: 600, height: 405 });
        const embedUrl = `https://www.strava.com/activities/${activityId}/embed/${embedToken}`;
        await page.goto(embedUrl, { waitUntil: 'networkidle2' });
        await page.waitForSelector('.activity-map img', { timeout: 6000 });
        const imgElement = await page.$('.activity-map img');
        await imgElement.screenshot({ path: 'strava_map_auto.png' });
        console.log('Screenshot captured');
        await browser.close();
        // 6. Upload lên Cloudinary 
        const uploadRes = await cloudinary.uploader.upload('strava_map_auto.png', { folder: 'strava-maps' });
        mapImageUrl = uploadRes.secure_url;
        console.log('Image uploaded to Cloudinary:', mapImageUrl);
      } catch (err) {
        console.error('Puppeteer/Cloudinary error:', err);
        mapImageUrl = '';
      }

      // 7. Reply lại user với mention, text, ảnh map, block code mezon
        const displayName = event.display_name || event.username || "Người dùng";
        const mentionTag = `@${displayName}`;
        const mentionsArr = mezonUserId ? [{ user_id: mezonUserId, e: mentionTag.length }] : [];

      // Ảnh bản đồ gửi kèm
      const attachmentsArr = mapImageUrl ? [
        {
          filename: "strava_map.png",
          url: mapImageUrl,
          filetype: "image/png"
        }
      ] : [];

      // Nội dung text và block code mezon
      const infoText = `🏅 Hoạt động mới nhất của ${username}:\n` +
        `Tên: ${activity.name}\n` +
        `Loại: ${activity.sport_type}\n` +
        `Quãng đường: ${(activity.distance/1000).toFixed(2)} km\n` +
        `Thời gian: ${(activity.moving_time/60).toFixed(1)} phút\n` +
        `Ngày: ${activity.start_date_local}`;
      const tMention = `${mentionTag}\n${infoText}`;
      const mkMention = [
        { type: "pre", s: tMention.indexOf(infoText), e: tMention.length }
      ];

      await message.reply(
        { t: tMention, mk: mkMention },
        mentionsArr,
        attachmentsArr
      );
      db.close();
      console.log('handleLastActivity END', { sender_id: event.sender_id });
    }
  );
}
