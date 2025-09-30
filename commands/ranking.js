const sqlite3 = require('sqlite3').verbose();
const path = require('path');

module.exports = async function handleRanking(client, event) {
  const dbPath = path.join(__dirname, '../data', 'strava_bot.db');
  const db = new sqlite3.Database(dbPath);
  const channel = await client.channels.fetch(event.channel_id);
  const message = await channel.messages.fetch(event.message_id);
  // Lấy tên user từ bảng athletes
  db.get(
     `SELECT ath.athlete_name, SUM(a.distance_m) as total_distance
       FROM athletes ath JOIN activities a ON ath.strava_athlete_id = a.strava_athlete_id
       WHERE (a.deleted IS NULL OR a.deleted = 0)
       GROUP BY ath.athlete_name ORDER BY total_distance DESC LIMIT 1`,
      [],
      (err, longestRow) => {
        // User lâu nhất
        db.get(
          `SELECT ath.athlete_name, SUM(a.duration_s) as total_duration
           FROM athletes ath JOIN activities a ON ath.strava_athlete_id = a.strava_athlete_id
           WHERE (a.deleted IS NULL OR a.deleted = 0)
           GROUP BY ath.athlete_name ORDER BY total_duration DESC LIMIT 1`,
          [],
          (err2, longestTimeRow) => {
            // User nhiều hoạt động nhất
            db.get(
              `SELECT ath.athlete_name, COUNT(a.activity_id) as total_acts
               FROM athletes ath JOIN activities a ON ath.strava_athlete_id = a.strava_athlete_id
               WHERE (a.deleted IS NULL OR a.deleted = 0)
               GROUP BY ath.athlete_name ORDER BY total_acts DESC LIMIT 1`,
              [],
              async (err3, mostActsRow) => {
                let msg = '🏆 BẢNG XẾP HẠNG STRAVA CHO ĐẾN THỜI ĐIỂM HIỆN TẠI\n';
                if (longestRow) msg += `🥇 Đi dài nhất: ${longestRow.athlete_name} (${(longestRow.total_distance/1000).toFixed(2)} km)\n`;
                if (longestTimeRow) msg += `⏱️ Lâu nhất: ${longestTimeRow.athlete_name} (${(longestTimeRow.total_duration/60).toFixed(1)} phút)\n`;
                if (mostActsRow) msg += `🔢 Nhiều hoạt động nhất: ${mostActsRow.athlete_name} (${mostActsRow.total_acts} hoạt động)\n`;
                if (!longestRow && !longestTimeRow && !mostActsRow) msg += 'Chưa có dữ liệu.';
                await message.reply({ t: msg, mk: [ { type: 'pre', s: 0, e: msg.length } ] });
                db.close();
              }
            );
          }
        );
      }
     
  );
}
