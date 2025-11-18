const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { EButtonMessageStyle, EMessageComponentType } = require('mezon-sdk');
const SORT_TYPE_LABELS = {
  Distance: 'Tổng quãng đường',
  Duration: 'Tổng thời gian',
  Number: 'Số hoạt động'
};

const TIME_RANGE_LABELS = {
  'Today': 'Hôm nay',
  'Yesterday': 'Cách đây 1 ngày',
  'This Week': 'Tuần này',
  'Last Week': 'Cách đây 1 tuần',
  'This Month': 'Tháng này',
  'Last Month': 'Cách đây 1 tháng',
  'This Year': 'Năm nay',
  'Last Year': 'Cách đây 1 năm',
  'All': 'Từ trước đến nay'
};

const SPORT_TYPE_LABELS = {
  All: 'Tất cả bộ môn',
  Run: 'Chạy bộ',
  Bike: 'Đạp xe',
  Swim: 'Bơi lội',
  Walk: 'Đi bộ',
  Football: 'Bóng đá',
  Hiking: 'Leo núi',
  Badminton: 'Cầu lông',
  Tennis: 'Quần vợt',
  Pickleball: 'Pickleball'
};

module.exports = async function viewReportActivity(client, ev) {
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
  const timeKey = Object.keys(formData).find(k => k.startsWith('filter-report-time'));
  const typeKey = Object.keys(formData).find(k => k.startsWith('filter-report-type'));
  const sortKey = Object.keys(formData).find(k => k.startsWith('filter-report-sort'));
  const limitKey = Object.keys(formData).find(k => k.startsWith('filter-report-limit'));


  const channel = await client.channels.fetch(channelId);
  const message = await channel.messages.fetch(messageId);
  const mezon_user_id = ev.user_id || ev.userId || ev.userID;
  if (!buttonId.endsWith(`-${mezon_user_id}`)) {
      return;
  }

  if (buttonId.startsWith('button-report-view')) {


      const dbPath = path.join(__dirname, '../data/strava_bot.db');
      const db = new sqlite3.Database(dbPath);

      const time_range = formData[timeKey];
      const sport_type = formData[typeKey];
      const sort_type = formData[sortKey];
      const limit_count = parseInt(formData[limitKey]) || 5;

      // Không cho xếp hạng theo quãng đường với các bộ môn không phù hợp
      const noDistanceSports = ['Football', 'Hiking', 'Badminton', 'Tennis', 'Pickleball'];
      if (noDistanceSports.includes(sport_type) && sort_type === 'Distance') {
        return;
      }
      let start_time, end_time;
      const now = new Date();
      switch (time_range) {
        case 'Yesterday':
          start_time = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
          end_time = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          break;
        case 'Last Week':
          const dayOfWeek = now.getDay();
          start_time = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek - 7, 0, 0, 0);
          end_time = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0);
          break;
        case 'Last Month':
          start_time = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
          end_time = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
          break;
        case 'Last Year':
          start_time = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0);
          end_time = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
          break;
        default:
          start_time = null;
          end_time = null;
      }

  let query = `SELECT a.mezon_user_id, a.athlete_name, a.strava_athlete_id, a.mezon_avatar, SUM(act.distance_m) as total_distance, SUM(act.duration_s) as total_duration, COUNT(act.activity_id) as total_activities
       FROM athletes a
       JOIN activities act ON a.mezon_user_id = act.mezon_user_id
       WHERE act.deleted IS NULL OR act.deleted = 0`;
      let params = [];
      if (sport_type && sport_type !== 'All') {
        query += ' AND act.sport_type = ?';
        params.push(sport_type);
      }
      if (start_time && end_time) {
        query += ' AND act.start_date_local >= ? AND act.start_date_local < ?';
        params.push(start_time.toISOString());
        params.push(end_time.toISOString());
      }
      query += ' GROUP BY a.mezon_user_id, a.athlete_name, a.strava_athlete_id, a.mezon_avatar';
      let orderBy = 'total_distance DESC';
      if (sort_type === 'Duration') {
        orderBy = 'total_duration DESC';
      } else if (sort_type === 'Number') {
        orderBy = 'total_activities DESC';
      }
      query += ` ORDER BY ${orderBy} LIMIT ?`;
      params.push(limit_count);

      db.all(query, params, async (err, rows) => {
        if (err) {
          await message.update({ t: `❌ Lỗi truy vấn thống kê: ${err.message}` });
          db.close();
          return;
        }
        if (!rows || rows.length === 0) {
          await message.update({ t: 'Không có dữ liệu hoạt động phù hợp với bộ lọc.' });
          db.close();
          return;
        }
        const cupIcons = ['🥇', '🥈', '🥉', '🏅', '🏅'];
        const embeds = rows.map((row, idx) => ({
          color: '#00bfff',
          title: `${cupIcons[idx] || ''} Top ${idx+1} - ${row.athlete_name}`,
          url: row.strava_athlete_id ? `https://www.strava.com/athletes/${row.strava_athlete_id}` : undefined,
          description:
            `🏅 Tổng quãng đường: ${(row.total_distance/1000).toFixed(2)} km\n` +
            `⏱️ Tổng thời gian: ${(row.total_duration/60).toFixed(1)} phút\n` +
            `🔢 Số hoạt động: ${row.total_activities}`,
          thumbnail: { url: row.mezon_avatar || '' },
        }));
        await message.update({
          t: `📊 BÁO CÁO HOẠT ĐỘNG STRAVA (${SPORT_TYPE_LABELS[sport_type] || sport_type || 'Tất cả bộ môn'}) - ${TIME_RANGE_LABELS[time_range] || time_range || 'Từ trước đến này'} - Xếp hạng theo ${SORT_TYPE_LABELS[sort_type] || sort_type || 'Tổng quãng đường'}`,
          embed: embeds
        });
        db.close();
      });
  } else if (buttonId.startsWith('button-cancel-')) {
    await message.update({
      t: '⛔️ Đã hủy xem báo cáo.'
    });
  }
}
