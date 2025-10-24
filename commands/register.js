const sqlite3 = require('sqlite3').verbose();
const path = require('path');

module.exports = async function handleRegister(client, event) {
  try {
    const channel = await client.channels.fetch(event.channel_id);
    const message = await channel.messages.fetch(event.message_id);
    const mezonUserId = event.sender_id;
    const mezon_avatar = event.avatar;
    const athlete_name = event.display_name || event.username || "";

    const dbPath = path.join(__dirname, '../data/strava_bot.db');
    const db = new sqlite3.Database(dbPath);
    db.get('SELECT strava_athlete_id FROM athletes WHERE mezon_user_id = ?', [mezonUserId], function(err, row) {
      if (err) {
        message.reply({ t: `❌ Lỗi kiểm tra tài khoản: ${err.message}` });
        db.close();
        return;
      }
      if (row && row.strava_athlete_id) {
        message.reply({ t: `⚠️ Tài khoản này đã đăng ký trước đó. Bạn không cần đăng ký lại!` });
        db.close();
        return;
      }

      const strava_athlete_id = Date.now() + Math.floor(Math.random() * 1000000);
      db.run(
        `INSERT INTO athletes (strava_athlete_id, mezon_user_id, athlete_name, mezon_avatar, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))`,
        [strava_athlete_id, mezonUserId, athlete_name, mezon_avatar],
        function(err2) {
          if (err2) {
            message.reply({ t: `❌ Đăng ký thất bại: ${err2.message}` });
          } else {
            message.reply({ t: `✅ Đăng ký thành công! Bạn đã có thể sử dụng các tính năng của bot.` });
          }
          db.close();
        }
      );
    });
  } catch (err) {
    console.error(err);
  }
}


