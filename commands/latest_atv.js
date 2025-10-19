
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
      const activityId = '16190674564';
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
      // 5. Dùng polyline để vẽ map và chụp ảnh bằng Puppeteer
      const polyline = require('@mapbox/polyline');
      let mapImageUrl = '';
      try {
        // Lấy polyline từ activity
        const encodedPolyline = activity.map.summary_polyline;
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
        await page.screenshot({ path: `image/map/${activityId}.png` });
        await browser.close();
        // // 6. Upload lên Cloudinary
        // const uploadRes = await cloudinary.uploader.upload(`image/map/${activityId}.png`, { folder: 'strava-maps', public_id: `activity_map_${activityId}` });
        // mapImageUrl = uploadRes.secure_url;
        mapImageUrl = `https://botnotistrava-production.up.railway.app/data/map/${activityId}.png`; // Thay your_domain bằng domain thật của bạn
        // // Xóa file ảnh tạm sau khi upload
        // try {
        //   require('fs').unlinkSync(`image/map/${activityId}.png`);
        // } catch (e) {
        //   console.warn('Không thể xóa file tạm:', e);
        // }
        console.log('Đã chụp ảnh bản đồ thành công!');
      } catch (err) {
        console.error('Puppeteer/polyline error:', err);
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
