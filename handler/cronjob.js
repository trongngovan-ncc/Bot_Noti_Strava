const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cron = require("node-cron");

const CHANNEL_ID = process.env.CHANNEL_NOTI_REPORT;
const CRON_SCHEDULE = process.env.CRONJOB_SCHEDULER;

module.exports = function startRankingCron(client) {
  cron.schedule(CRON_SCHEDULE,
    async () => {
      const dbPath = path.join(__dirname, "../data", "strava_bot.db");
      const db = new sqlite3.Database(dbPath);
      const channel = await client.channels.fetch(CHANNEL_ID);

      // Get current VN time
      const nowVN = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })
      );
      // 7 days ago
      const sevenDaysAgoVN = new Date(nowVN);
      sevenDaysAgoVN.setDate(nowVN.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgoVN.toISOString().split("T")[0];

      // Motivational messages
      const messages = [
        // 💬 Friendly & Playful
        "Giày thể thao của bạn vẫn còn ngủ kìa 😴 — Đánh thức chúng bằng một buổi vận động nhé! 🏃‍♂️💨",
        "Strava của bạn yên tĩnh quá rồi 👀 — Cùng làm nóng không khí bằng một buổi chạy/chèo/cưỡi xe nhẹ nào!",
        "Không mồ hôi, không câu chuyện 💪 — 15 phút vận động cũng tuyệt vời lắm!",
        "Bảng xếp hạng đang nhớ bạn đấy! 🏆 Mau vận động để tên mình sáng lên nào!",
        "Hoạt động cuối cùng của bạn đang cô đơn lắm… Thêm một cái mới đi chứ 😄",
        "Chỉ 10 phút thôi cũng đủ tạo khác biệt! 🚶",
        "Nhóm sáng nay đang đốt cháy calories 🔥 — Đừng để họ lấy hết vinh quang nhé!",
        "Thời tiết đẹp quá, ra ngoài vận động một chút rồi log lại trên Mezon nhé ☀️",
        "Nhà vô địch được tạo nên từ những buổi tập nhỏ 💪",
        "Vẫn chưa tham gia tuần này à? Cả nhóm cổ vũ bạn đó! 🎉",
        // 💬 Encouraging & Team-Spirit
        "Mỗi bước chân đều có ý nghĩa — Cùng nhau vận động tuần này nhé! 🚴‍♀️🏃‍♀️",
        "Không ai bắt đầu là số 1, nhưng ai cũng có thể bắt đầu hôm nay! 💫",
        "Cả nhóm đang chờ tên bạn xuất hiện trên bảng vàng 🏅",
        "Không cần nhanh, chỉ cần tham gia là được! 🙌",
        "Khó nhất là bắt đầu, khó nhì là dừng lại 😆 Cố lên!",
        // 💬 Funny / Meme-style (giữ tiếng Anh cho tự nhiên)
        "Calories are afraid of you. Prove it. 😎🔥",
        "No activity detected... are you charging your legs? ⚡",
        "When was your last run? The blockchain says: ‘too long ago’ 🧾😂",
        "Running late to meetings doesn’t count as cardio 🏃‍♂️💼",
        "Fitness bot says: 404 Activity Not Found — please fix ASAP!"
      ];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];

      // Query all users
      const userQuery = `SELECT mezon_user_id, athlete_name FROM athletes`;
      db.all(userQuery, [], async (err, users) => {
        if (err) {
          await channel.send(`❌ Lỗi truy vấn danh sách user: ${err.message}`);
          db.close();
          return;
        }
        if (!users || users.length === 0) {
          await channel.send(`⛔️ Không tìm thấy user nào trong hệ thống.`);
          db.close();
          return;
        }

        // Query users with activity in last 7 days
        const activeQuery = `SELECT DISTINCT mezon_user_id FROM activities WHERE (deleted IS NULL OR deleted = 0) AND date(start_date_local) >= ?`;
        db.all(activeQuery, [sevenDaysAgoStr], async (err2, activeRows) => {
          if (err2) {
            await channel.send(`❌ Lỗi truy vấn hoạt động: ${err2.message}`);
            db.close();
            return;
          }
          const activeIds = (activeRows || []).map(u => u.mezon_user_id);
          const inactiveUsers = (users || []).filter(u => !activeIds.includes(u.mezon_user_id));

          if (!inactiveUsers || inactiveUsers.length === 0) {
            db.close();
            return;
          }

          // Build mention string and mentions array for Mezon
          let tMsg = "Xin chào ";
          let mentionsArr = [];
          let offset = 9; // "Xin chào "
          inactiveUsers.forEach((u, idx) => {
            const mentionTag = `@${u.athlete_name}`;
            tMsg += mentionTag;
            mentionsArr.push({ user_id: u.mezon_user_id, s: offset, e: offset + mentionTag.length });
            offset += mentionTag.length;
            if (idx < inactiveUsers.length - 1) {
              tMsg += ", ";
              offset += 2;
            }
          });
          tMsg += " — anh em chưa có hoạt động nào trong 7 ngày gần nhất đâu nhé!";
          tMsg += "\n";
          tMsg += `👉 ${randomMsg}`;

          await channel.send({ t: tMsg }, mentionsArr);
          db.close();
        });
      });
    },
    {
      timezone: "Asia/Ho_Chi_Minh",
    }
  );
};
