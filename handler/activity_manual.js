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

      const mezon_user_id = ev.user_id || ev.userId || ev.userID;
      if (!mezon_user_id) {
        await message.update({
          t: `❌ Không xác định được user. Vui lòng thử lại.`
        });
        return;
      }

      const dbPath = path.join(__dirname, '../data/strava_bot.db');
      const db = new sqlite3.Database(dbPath);
      const getAthleteInfo = () => new Promise((resolve, reject) => {
        db.get('SELECT strava_athlete_id, mezon_avatar, athlete_name FROM athletes WHERE mezon_user_id = ?', [mezon_user_id], (err, row) => {
          if (err) return reject(err);
          resolve(row || {});
        });
      });
      let strava_athlete_id, mezon_avatar, athlete_name;
      try {
        const info = await getAthleteInfo();
        if (!info || !info.strava_athlete_id) {
          await message.update({
            t: `❌ Bạn chưa đăng ký hoặc login vào Group Strava trên Mezon. Vui lòng dùng lệnh *strava_register (nếu không có tài khoản Strava) hoặc *strava_login (nếu có tài khoản) trước khi nhập hoạt động.`
          });
          db.close();
          return;
        }
        strava_athlete_id = info.strava_athlete_id;
        mezon_avatar = info.mezon_avatar;
        athlete_name = info.athlete_name;
      } catch (e) {
        await message.update({
          t: `❌ Lỗi truy vấn DB: ${e.message}`
        });
        db.close();
        return;
      }

      const activity_id = String(Date.now()) + String(Math.floor(Math.random()*1000000));

      const activity_name = formData[nameKey];
      const sport_type = formData[typeKey];
      const distance_m = parseFloat(formData[distanceKey]) * 1000;
      const duration_s = parseInt(formData[timeKey]) * 60;


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
      
        const embed = [
          {
            color: 0x00bfff,
            title: '✅ Hoạt động manual đã được lưu',
            author: {
              name:  athlete_name,
              icon_url: mezon_avatar,
            },
            thumbnail: { url: mezon_avatar || '' },
            description: [
                "```",
                `🏅 Name: ${activity_name}`,
                `🚴‍♂️ Type: ${sport_type}`,
                `📏 Distance: ${(distance_m/1000).toFixed(2)} km`,
                `⏱️ During : ${(duration_s/60).toFixed(1)} phút`,
                `📅 Time: ${new Date().toISOString().split('T')[0]}`,
                "```"
            ].join('\n'),
            timestamp: new Date().toISOString(),
            footer: {
              text: 'Powered by Mezon Bot Strava',
              icon_url: 'https://d3nn82uaxijpm6.cloudfront.net/favicon-32x32.png'
            }
          }
        ];
        await message.update({ embed });
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
