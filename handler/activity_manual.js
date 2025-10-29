const sqlite3 = require("sqlite3").verbose();
const path = require("path");

module.exports = async function submitManualActivity(client, ev) {
  const buttonId = ev.button_id || "";
  const messageId = ev.message_id;
  const channelId = ev.channel_id;
  let formData = ev.extra_data || {};
  if (typeof formData === "string") {
    try {
      formData = JSON.parse(formData);
    } catch (e) {
      formData = {};
    }
  }

  const nameKey = Object.keys(formData).find((k) => k.startsWith("input-name"));
  const typeKey = Object.keys(formData).find((k) => k.startsWith("input-type"));
  const timeKey = Object.keys(formData).find((k) => k.startsWith("input-time"));
  const distanceKey = Object.keys(formData).find((k) =>
    k.startsWith("input-distance")
  );
  const dateKey = Object.keys(formData).find((k) => k.startsWith("input-date"));

  let missing = [];
  if (!nameKey || !formData[nameKey]) missing.push("input-name");
  if (!typeKey || !formData[typeKey]) missing.push("input-type");
  if (!timeKey || !formData[timeKey]) missing.push("input-time");
  const sportType = formData[typeKey];
  const optionalDistanceTypes = [
    "Badminton",
    "Football",
    "Pickleball",
    "Tennis",
  ];
  if (!optionalDistanceTypes.includes(sportType)) {
    if (!distanceKey || !formData[distanceKey]) missing.push("input-distance");
  }

  let activityDate;
  function toVNDateString(dateObj) {
    return new Date(
      dateObj.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })
    )
      .toISOString()
      .slice(0, 10);
  }
  if (dateKey && formData[dateKey]) {
    const inputYMD = toVNDateString(new Date(formData[dateKey]));
    const nowYMD = toVNDateString(new Date());
    const diffDays =
      (Date.parse(nowYMD) - Date.parse(inputYMD)) / (1000 * 60 * 60 * 24);
    if (isNaN(Date.parse(inputYMD))) {
      missing.push("input-date");
    } else if (diffDays < 0 || diffDays > 1) {
      missing.push("input-date");
    } else {
      activityDate = inputYMD;
    }
  } else {
    activityDate = toVNDateString(new Date());
  }

  const channel = await client.channels.fetch(channelId);
  const message = await channel.messages.fetch(messageId);
  const mezon_user_id = ev.user_id || ev.userId || ev.userID;
  // console.log('Mezon User ID:', mezon_user_id);
  // console.log('Form Data:', formData);
  // console.log('buttonId:', buttonId);
  if (!buttonId.endsWith(`-${mezon_user_id}`)) {
    return;
  }

  if (buttonId.startsWith("button-submit-")) {
    if (missing.length > 0) {
      // await message.update({
      //   t: `❌ Thiếu thông tin: ${missing.join(', ')}. Vui lòng nhập đầy đủ.`
      // });
      return;
    }

    if (!mezon_user_id) {
      await message.update({
        t: `❌ Không xác định được user. Vui lòng thử lại.`,
      });
      return;
    }

    const dbPath = path.join(__dirname, "../data/strava_bot.db");
    const db = new sqlite3.Database(dbPath);
    const getAthleteInfo = () =>
      new Promise((resolve, reject) => {
        db.get(
          "SELECT mezon_avatar, athlete_name FROM athletes WHERE mezon_user_id = ?",
          [mezon_user_id],
          (err, row) => {
            if (err) return reject(err);
            resolve(row || {});
          }
        );
      });
    let mezon_avatar, athlete_name;
    try {
      const info = await getAthleteInfo();
      if (!info || !info.athlete_name) {
        await message.update({
          t: `❌ Bạn chưa đăng ký hoặc login vào Group Strava trên Mezon. Vui lòng dùng lệnh *strava_register (nếu không có tài khoản Strava) hoặc *strava_login (nếu có tài khoản) trước khi nhập hoạt động.`,
        });
        db.close();
        return;
      }
      mezon_avatar = info.mezon_avatar;
      athlete_name = info.athlete_name;
    } catch (e) {
      await message.update({
        t: `❌ Lỗi truy vấn DB: ${e.message}`,
      });
      db.close();
      return;
    }

    const activity_id =
      String(Date.now()) + String(Math.floor(Math.random() * 1000000));
    const activity_name = formData[nameKey];
    const sport_type = formData[typeKey];
    let distance_m = null;
    if (!optionalDistanceTypes.includes(sport_type)) {
      distance_m = parseFloat(formData[distanceKey]) * 1000;
    }
    const duration_s = parseInt(formData[timeKey]) * 60;

    const start_date_local = activityDate;

    const insertActivity = () =>
      new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO activities (activity_id, source, mezon_user_id, sport_type, activity_name, distance_m, duration_s, start_date_local) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [
            activity_id,
            "manual",
            mezon_user_id,
            sport_type,
            activity_name,
            distance_m,
            duration_s,
            start_date_local,
          ],
          function (err) {
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
          title: "✅ Hoạt động manual đã được lưu",
          author: {
            name: athlete_name,
            icon_url: mezon_avatar,
          },
          thumbnail: { url: mezon_avatar || "" },
          description: [
            "```",
            `🏅 Name: ${activity_name}`,
            `🚴‍♂️ Type: ${sport_type}`,
            `📏 Distance: ${
              distance_m !== null
                ? (distance_m / 1000).toFixed(2) + " km"
                : "Nothing"
            }`,
            `⏱️ During : ${(duration_s / 60).toFixed(1)} phút`,
            `📅 Time: ${activityDate}`,
            "```",
          ].join("\n"),
          timestamp: new Date().toISOString(),
          footer: {
            text: "Powered by Mezon Bot Strava",
            icon_url: "https://d3nn82uaxijpm6.cloudfront.net/favicon-32x32.png",
          },
        },
      ];
      await message.update({ embed });
    } catch (e) {
      await message.update({
        t: `❌ Lỗi lưu hoạt động: ${e.message}`,
      });
    }
    db.close();
  } else if (buttonId.startsWith("button-cancel-")) {
    await message.update({
      t: "⛔️ Đã hủy nhập hoạt động.",
    });
  }
};
