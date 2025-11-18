const sqlite3 = require('sqlite3').verbose();
const path = require('path');

module.exports = async function handleRanking(client, event) {
  const dbPath = path.join(__dirname, '../data', 'strava_bot.db');
  const db = new sqlite3.Database(dbPath);
  const channel = await client.channels.fetch(event.channel_id);
  const message = await channel.messages.fetch(event.message_id);

  db.all(
    `SELECT ath.mezon_user_id, ath.athlete_name, ath.mezon_avatar,
            SUM(a.duration_s) as total_duration,
            COUNT(a.activity_id) as total_acts,
            SUM(a.distance_m) as total_distance
     FROM athletes ath JOIN activities a ON ath.mezon_user_id = a.mezon_user_id
     WHERE (a.deleted IS NULL OR a.deleted = 0)
     GROUP BY ath.mezon_user_id
     ORDER BY total_duration DESC, total_acts DESC
     LIMIT 5`,
    [],
    async (err, rows) => {
      if (err || !rows || rows.length === 0) {
        await message.reply({ t: 'Chưa có dữ liệu bảng xếp hạng.', mk: [ { type: 'pre', s: 0, e: 25 } ] });
        db.close();
        return;
      }

      const cupIcons = ['🥇', '🥈', '🥉', '🏅', '🏅'];
      const embed = rows.map((row, idx) => ({
        color: '#e67e22',
        title: `${cupIcons[idx] || ''} Top ${idx+1} - ${row.athlete_name}`,
        url:  `https://www.strava.com/athletes/${row.strava_athlete_id}`,
        description:
          `⏱️ Tổng thời gian: ${(row.total_duration/60).toFixed(1)} phút\n` +
          `🔢 Số lần hoạt động: ${row.total_acts}\n` +
          `🏃 Tổng quãng đường: ${(row.total_distance/1000).toFixed(2)} km`,
        thumbnail: { url: row.mezon_avatar || '' }
      }));
      await message.reply({ t: '🏆 TOP 5 BẢNG XẾP HẠNG STRAVA (Theo tổng thời gian hoạt động)', embed });
      db.close();
    }
  );
}
