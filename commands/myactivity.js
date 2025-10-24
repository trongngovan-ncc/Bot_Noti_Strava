const sqlite3 = require('sqlite3').verbose();
const path = require('path');

module.exports = async function handleMyActivity(client, event) {
  const mezonUserId = event.sender_id;
  const dbPath = path.join(__dirname, '../data', 'strava_bot.db');
  const db = new sqlite3.Database(dbPath);
  const channel = await client.channels.fetch(event.channel_id);
  const message = await channel.messages.fetch(event.message_id);

  db.get(
    `SELECT athlete_name FROM athletes WHERE mezon_user_id = ? LIMIT 1`,
    [mezonUserId],
    (err, userRow) => {
      if (err || !userRow) {
        message.reply({ t: '🙁 Không tìm thấy thông tin tài khoản Strava.' });
        db.close();
        return;
      }
      const username = userRow.athlete_name;
      db.all(
        `SELECT a.activity_id, a.activity_name, a.sport_type, a.distance_m, a.duration_s, a.start_date_local
         FROM athletes ath
         JOIN activities a ON ath.strava_athlete_id = a.strava_athlete_id
         WHERE ath.mezon_user_id = ? AND (a.deleted IS NULL OR a.deleted = 0)
         ORDER BY a.start_date_local DESC LIMIT 10`,
        [mezonUserId],
        async (err, rows) => {
          if (err) {
            await message.reply({ t: '❌ Lỗi truy vấn hoạt động.' });
            db.close();
            return;
          }
          if (!rows || rows.length === 0) {
            await message.reply({ t: `🙁 ${username} chưa có hoạt động Strava nào được lưu.` });
            db.close();
            return;
          }

          const header = `📋🏃‍♂️ Danh sách hoạt động gần đây của ${username}:`;
          let list = '';
          rows.forEach((act, idx) => {
            const icon = act.sport_type === 'Run' ? '🏃‍♂️' : act.sport_type === 'Ride' ? '🚴‍♂️' : '🏅';
            list += `${icon} ${act.activity_name} | ${act.sport_type} | ${(act.distance_m/1000).toFixed(2)}km | ${(act.duration_s/60).toFixed(1)} phút | ${act.start_date_local}\n`;
          });
          await message.reply({
            t: `${header}\n${list}`,
            mk: [ { type: 'pre', s: header.length + 1, e: header.length + 1 + list.length } ]
          });
          db.close();
        }
      );
    }
  );
}
