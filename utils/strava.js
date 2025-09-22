function generateStravaConnectLink(mezonUserId) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.STRAVA_REDIRECT_URI);
  const scope = encodeURIComponent("activity:read_all");
  const state = encodeURIComponent(mezonUserId);
  return `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
}

module.exports = { generateStravaConnectLink };
