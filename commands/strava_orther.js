
const sqlite3 = require('sqlite3').verbose();
const path = require('path');


module.exports = async function viewStravaOrther(client, event) {
  const channel = await client.channels.fetch(event.channel_id);
  const message = await channel.messages.fetch(event.message_id);
  let referenceUserId;
  if (event.references && event.references.length > 0) {
      let refArr = event.references;
      if (typeof refArr === 'string') {
        try { refArr = JSON.parse(refArr); } catch {}
      }
      if (Array.isArray(refArr) && refArr.length > 0 && refArr[0].message_sender_id) {
        referenceUserId = refArr[0].message_sender_id;
      }
   }
   if(!referenceUserId){
    return;
   }
   const dbPath = path.join(__dirname, '../data', 'strava_bot.db');
   const db = new sqlite3.Database(dbPath);
   db.get(
    `SELECT athlete_name, mezon_avatar FROM athletes WHERE mezon_user_id = ? LIMIT 1`,
    [referenceUserId],
    (err, userRow) => {
      if (err || !userRow) {
        message.reply({ t: '🙁 Người mà bạn reply chưa đăng ký vào group strava.' });
        db.close();
        return;
      }
      const username = userRow.athlete_name;
      const avatar = userRow.mezon_avatar || '';
      db.all(
        `SELECT a.activity_id, a.activity_name, a.sport_type, a.distance_m, a.duration_s, a.start_date_local
         FROM activities a
         WHERE a.mezon_user_id = ? AND (a.deleted IS NULL OR a.deleted = 0)
         ORDER BY a.start_date_local DESC LIMIT 10`,
        [referenceUserId],
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

          const desc = rows.map((act, idx) => {
            const icon = act.sport_type === 'Run' ? '🏃‍♂️' : act.sport_type === 'Ride' ? '🚴‍♂️' : act.sport_type === 'Swim' ? '🏊‍♂️' : act.sport_type === 'Walk' ? '🚶‍♂️' : '🏅';
            return `${icon} ${act.activity_name} | ${act.sport_type} | ${(act.distance_m/1000).toFixed(2)}km | ${(act.duration_s/60).toFixed(1)} phút | ${act.start_date_local}`;
          }).join('\n');
          const embed = {
            color: '#00bfff',
            title: `🏃‍♂️ Bạn đang quan tâm đến hoạt động của ${username}`,
            author: {
              name: username,
              icon_url: avatar
            },
            description: [
              '```',
              desc,
              '```'
            ].join('\n'),
            thumbnail: { url: avatar },
            timestamp: new Date().toISOString(),
            footer: {
              text: 'Powered by Mezon Bot Strava',
              icon_url: 'https://d3nn82uaxijpm6.cloudfront.net/favicon-32x32.png'
            }
          };
          await message.reply({ embed: [embed] });
          db.close();
        }
      );
    }
  );
}
