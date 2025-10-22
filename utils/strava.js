
const { generateToken } = require('../middleware/authentication');

function generateStravaConnectLink(mezonUserId, mezon_avatar) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.STRAVA_REDIRECT_URI);
  const scope = encodeURIComponent("activity:read_all");
  const tokenPayload = {
    mezon_user_id: mezonUserId,
    mezon_avatar: mezon_avatar
  };
  const token = generateToken(tokenPayload);
  // Truyền token qua state (hoặc query) để xác thực sau này
  const state = encodeURIComponent(token);
  return `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
}

module.exports = { generateStravaConnectLink };
