# Bot_Noti_Strava
Tổng quan flow (1 câu)

Người dùng yêu cầu kết nối → bot sinh link OAuth → user authorize Strava → bot nhận access_token + refresh_token → bot đăng ký webhook (1 lần cho app) → Strava gửi event (chỉ id + owner_id) → bot nhận event → gọi Strava API lấy chi tiết activity bằng token của user → lưu DB → cron job tổng hợp → bot gửi noti lên Mezon.

1) Chuẩn bị (trước khi code)

Đăng ký Strava app: lấy CLIENT_ID, CLIENT_SECRET, khai báo REDIRECT_URI (ví dụ https://your-bot.com/strava/callback).

Server bot phải có 1 URL public (HTTPS) để Strava gọi webhook.

DB (Postgres/Mysql) sẵn sàng để lưu athletes + activities.

Môi trường: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI, WEBHOOK_SECRET_TOKEN, MEZON_API_KEY lưu trong env.

2) DB schema gợi ý (Postgres)
-- athletes: lưu token/user mapping
CREATE TABLE athletes (
  id BIGSERIAL PRIMARY KEY,
  mezon_user_id TEXT NOT NULL,   -- ID trong Mezon (state)
  strava_athlete_id BIGINT UNIQUE,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- activities: lưu tất cả activity (strava + manual)
CREATE TABLE activities (
  id BIGSERIAL PRIMARY KEY,
  activity_id TEXT NOT NULL,      -- strava id (as text) or manual-<uuid>
  source TEXT NOT NULL,           -- 'strava' | 'manual'
  athlete_id BIGINT NOT NULL,     -- strava_athlete_id or mapped
  sport_type TEXT,
  distance_m DOUBLE PRECISION,
  duration_s INTEGER,
  start_date_local TIMESTAMP WITH TIME ZONE,
  timezone TEXT,
  private BOOLEAN DEFAULT false,
  deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(activity_id)
);

3) Bot sinh link OAuth & user flow (command + callback)
Hàm sinh link (khi user gõ /connect strava)
function generateStravaConnectLink(mezonUserId) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.STRAVA_REDIRECT_URI);
  const scope = encodeURIComponent("activity:read_all"); // hoặc activity:read
  const state = encodeURIComponent(mezonUserId);
  return `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
}


Bot gửi link này (DM hoặc reply) cho user.

Callback endpoint: đổi code lấy token
app.get("/strava/callback", async (req, res) => {
  const { code, state } = req.query; // state = mezonUserId
  try {
    const r = await axios.post("https://www.strava.com/oauth/token", {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code"
    });
    const { access_token, refresh_token, expires_at, athlete } = r.data;
    // Lưu vào DB: map athlete.id -> mezonUserId với token
    // respond success to user
    res.send("Connected! You can close this page.");
  } catch (err) {
    res.status(500).send("Error connecting Strava");
  }
});


Ghi chú: lưu athlete.id (Strava athlete id) kèm mezon_user_id để khi Strava gửi owner_id bạn biết map sang user.

4) Đăng ký Webhook (một lần cho app)

Strava push subscriptions endpoint: (POST). Ví dụ curl:

curl -X POST "https://www.strava.com/api/v3/push_subscriptions" \
  -F client_id=YOUR_CLIENT_ID \
  -F client_secret=YOUR_CLIENT_SECRET \
  -F callback_url=https://your-bot.com/strava/webhook?token=YOUR_WEBHOOK_TOKEN \
  -F verify_token=YOUR_VERIFY_TOKEN


callback_url có thể chứa ?token=... để bạn kiểm tra query token khi Strava gọi.

Strava sẽ gửi verification request (GET challenge) đến URL — server phải trả lại challenge (xem phần webhook handler).

Lưu subscription_id response nếu cần quản lý (xóa subscription sau).

5) Webhook handler (Express) — verify + nhanh ack + queue
app.use(express.json({limit: '1mb'}));

app.get('/strava/webhook', (req, res) => {
  // Verification during subscription: Strava sends a challenge (param name may vary)
  // Echo challenge back (support common names)
  const challenge = req.query['hub.challenge'] || req.query['challenge'];
  if (challenge) return res.status(200).send(challenge);
  return res.status(200).send('ok');
});

app.post('/strava/webhook', async (req, res) => {
  // Quick ACK
  res.status(200).send('ok');

  // Optional: verify token in callback URL (if you registered callback with ?token=)
  const token = req.query.token;
  if (token !== process.env.WEBHOOK_SECRET_TOKEN) {
    console.warn('Webhook token mismatch');
    return; // ignore
  }

  // req.body contains event(s)
  const event = req.body; // {object_type, object_id, aspect_type, owner_id, subscription_id, updates?}
  // Push event into a job queue (Bull/Redis/RabbitMQ) for background processing
  await eventsQueue.add(event);
});


Lý do: trả 200 nhanh, xử lý nặng (gọi API Strava) trong worker/queue để không timeout webhook.

6) Xử lý event (worker): fetch activity detail, upsert DB

Worker logic (pseudocode):

Parse event: require object_type === 'activity'.

Map owner_id → strava_athlete_id → get saved access_token from athletes table.

If no token → skip (user chưa connect) or schedule retry/alert.

Call Strava API:
GET https://www.strava.com/api/v3/activities/{activity_id}
Authorization: Bearer <access_token>

If 401 (token expired) → call refresh token flow, retry fetch.

If 200 → parse fields (distance, moving_time, type, start_date_local, private, timezone, ...) → if private and you don't have activity:read_all scope, skip.

Upsert into activities table keyed by activity_id. (On aspect_type === 'delete' mark deleted = true).

Node worker sample (simplified):

async function processEvent(event) {
  const { object_type, object_id, owner_id, aspect_type } = event;
  if (object_type !== 'activity') return;

  if (aspect_type === 'delete') {
    // mark deleted in DB
    await db.query('UPDATE activities SET deleted = true WHERE activity_id = $1', [String(object_id)]);
    return;
  }

  const athlete = await db.getAthleteByStravaId(owner_id);
  if (!athlete) { console.log('no token for', owner_id); return; }

  let token = athlete.access_token;
  let data;
  try {
    data = await fetchActivity(object_id, token);
  } catch (err) {
    if (err.status === 401) {
      // refresh token
      const refreshed = await refreshToken(athlete.refresh_token);
      await db.updateAthleteToken(athlete.id, refreshed);
      data = await fetchActivity(object_id, refreshed.access_token);
    } else {
      // retry/backoff later
      throw err;
    }
  }

  // data contains detailed activity; upsert into DB
  await upsertActivityInDB(data, athlete);
}


Helper fetchActivity:

async function fetchActivity(activityId, accessToken) {
  const r = await axios.get(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return r.data;
}


Refresh token flow:

async function refreshToken(refreshToken) {
  const r = await axios.post('https://www.strava.com/oauth/token', {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });
  return r.data; // includes access_token, refresh_token, expires_at
}

7) Manual logging (slash command /activity log)

Bot receives /activity log with params (sport, distance, unit, datetime, duration).

Validate inputs, normalize:

Distance → meters.

Duration → seconds.

start_date_local parse + timezone.

Insert to activities with activity_id = manual-<uuid>, source = 'manual'.

Reply to user confirm and optionally post summary.

8) Cron jobs — daily summary (07:30 VN)

Use node-cron, bull delayed job, or Kubernetes CronJob. Timezone: Asia/Bangkok.

Query DB for activities with start_date_local within yesterday (consider activity.timezone).

Aggregate per mezon_user_id: total distance, total duration, count, breakdown per sport.

Build message and use Mezon SDK to post message into #theducbuoisang.
Example message format:

📅 Báo cáo 2025-09-18
@A: chạy 5.2 km (30m)
@B: đạp 15.0 km (45m)
Tổng: 2 người, 20.2 km, 75m


Do similar for weekly/monthly/quarterly/yearly with ranking queries.