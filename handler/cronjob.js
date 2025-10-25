const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cron = require("node-cron");

const CHANNEL_ID = "1971995230311813120";

module.exports = function startRankingCron(client) {
  cron.schedule(
    "30 36 15 * * *",
    async () => {
      const dbPath = path.join(__dirname, "../data", "strava_bot.db");
      const db = new sqlite3.Database(dbPath);
      const channel = await client.channels.fetch(CHANNEL_ID);

      const nowVN = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })
      );
      const yesterdayVN = new Date(nowVN);
      yesterdayVN.setDate(nowVN.getDate() - 1);

      const yesterdayStr = yesterdayVN.toISOString().split("T")[0];
      const query = `SELECT act.sport_type, GROUP_CONCAT(DISTINCT ath.athlete_name) as athletes, COUNT(act.activity_id) as total_acts
                  FROM activities act
                  JOIN athletes ath ON act.strava_athlete_id = ath.strava_athlete_id
                  WHERE (act.deleted IS NULL OR act.deleted = 0)
                    AND date(act.start_date_local) = ?
                  GROUP BY act.sport_type
                  HAVING total_acts > 0
                  ORDER BY total_acts DESC`;
      db.all(query, [yesterdayStr], async (err, rows) => {
        if (err) {
          await channel.send({
            t: `❌ Lỗi thống kê hoạt động hôm qua: ${err.message}`,
          });
          db.close();
          return;
        }
        if (!rows || rows.length === 0) {
          await channel.send({
            t: "⛔️ Không có hoạt động nào được ghi nhận trong ngày hôm qua.",
          });
          db.close();
          return;
        }

        const embed = [
          {
            color: 0x00bfff,
            title: `📅 Báo cáo hoạt động Strava ngày ${yesterdayStr}`,
            description: rows
              .map((row) =>
                [
                  `🏷️ Loại: ${row.sport_type}`,
                  `🔢 Số hoạt động: ${row.total_acts}`,
                  `� Người tham gia: ${row.athletes
                    .split(",")
                    .map((n) => n.trim())
                    .join(", ")}`,
                ].join("\n")
              )
              .join("\n\n"),
            timestamp: new Date().toISOString(),
            footer: {
              text: "Powered by Mezon Bot Strava",
              icon_url:
                "https://d3nn82uaxijpm6.cloudfront.net/favicon-32x32.png",
            },
          },
        ];
        await channel.send({ embed });
        db.close();
      });
    },
    {
      timezone: "Asia/Ho_Chi_Minh",
    }
  );
};
