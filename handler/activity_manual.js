// Xử lý submit/cancel form nhập hoạt động manual cho Strava
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

module.exports = async function submitManualActivity(client, ev) {
  const buttonId = ev.button_id || '';
  const messageId = ev.message_id;
  const channelId = ev.channel_id;
  let formData = ev.extra_data || {};
  if (typeof formData === 'string') {
    try {
      formData = JSON.parse(formData);
    } catch (e) {
      formData = {};
    }
  }

  const nameKey = Object.keys(formData).find(k => k.startsWith('input-name'));
  const typeKey = Object.keys(formData).find(k => k.startsWith('input-type'));
  const timeKey = Object.keys(formData).find(k => k.startsWith('input-time'));
  const distanceKey = Object.keys(formData).find(k => k.startsWith('input-distance'));
  const noteKey = Object.keys(formData).find(k => k.startsWith('input-note'));

  let missing = [];
  if (!nameKey || !formData[nameKey]) missing.push('input-name');
  if (!typeKey || !formData[typeKey]) missing.push('input-type');
  if (!timeKey || !formData[timeKey]) missing.push('input-time');
  if (!distanceKey || !formData[distanceKey]) missing.push('input-distance');

  const channel = await client.channels.fetch(channelId);
  const message = await channel.messages.fetch(messageId);

  if (buttonId.startsWith('button-submit-')) {
    if (missing.length > 0) {
      await message.update({
        t: `❌ Thiếu thông tin: ${missing.join(', ')}. Vui lòng nhập đầy đủ.`
      });
      return;
    }
      // Lấy mezon_user_id từ event
      const mezon_user_id = ev.user_id || ev.userId || ev.userID;
      if (!mezon_user_id) {
        await message.update({
          t: `❌ Không xác định được user. Vui lòng thử lại.`
        });
        return;
      }
      // Mở DB và kiểm tra strava_athlete_id
      const dbPath = path.join(__dirname, '../data/strava_bot.db');
      const db = new sqlite3.Database(dbPath);
      const getAthleteId = () => new Promise((resolve, reject) => {
        db.get('SELECT strava_athlete_id FROM athletes WHERE mezon_user_id = ?', [mezon_user_id], (err, row) => {
          if (err) return reject(err);
          resolve(row ? row.strava_athlete_id : null);
        });
      });
      let strava_athlete_id;
      try {
        strava_athlete_id = await getAthleteId();
      } catch (e) {
        await message.update({
          t: `❌ Lỗi truy vấn DB: ${e.message}`
        });
        db.close();
        return;
      }
      if (!strava_athlete_id) {
        await message.update({
          t: `❌ Bạn chưa đăng ký Strava. Vui lòng dùng lệnh *strava_register trước khi nhập hoạt động.`
        });
        db.close();
        return;
      }
    // Tạo activity_id là một dãy số ngẫu nhiên, chỉ gồm số, đảm bảo không trùng
    const activity_id = String(Date.now()) + String(Math.floor(Math.random()*1000000));
      // Chuyển đổi dữ liệu
      const activity_name = formData[nameKey];
      const sport_type = formData[typeKey];
      const distance_m = parseFloat(formData[distanceKey]) * 1000;
      const duration_s = parseInt(formData[timeKey]) * 60;
      const note = noteKey ? formData[noteKey] : '';
      // Lưu vào DB
      const insertActivity = () => new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO activities (activity_id, source, strava_athlete_id, sport_type, activity_name, distance_m, duration_s, start_date_local) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))',
          [activity_id, 'manual', strava_athlete_id, sport_type, activity_name, distance_m, duration_s],
          function(err) {
            if (err) return reject(err);
            resolve();
          }
        );
      });
      try {
        await insertActivity();
        await message.update({
          t: `✅ Đã nhận hoạt động: ${activity_name} (${sport_type}) - ${formData[distanceKey]}km, ${formData[timeKey]} phút. Ghi chú: ${note}\nHoạt động đã được lưu vào hệ thống.`
        });
      } catch (e) {
        await message.update({
          t: `❌ Lỗi lưu hoạt động: ${e.message}`
        });
      }
      db.close();
  } else if (buttonId.startsWith('button-cancel-')) {
    await message.update({
      t: '⛔️ Đã hủy nhập hoạt động.'
    });
  }
}
