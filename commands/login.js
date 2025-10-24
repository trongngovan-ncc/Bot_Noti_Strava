const { generateStravaConnectLink } = require('../handler/oauth_url');

module.exports = async function handleLogin(client, event) {
  try {
    const channel = await client.channels.fetch(event.channel_id);
    const message = await channel.messages.fetch(event.message_id);
    const mezonUserId =  event.sender_id;
    const mezon_avatar = event.avatar;
    const loginLink = generateStravaConnectLink(mezonUserId, mezon_avatar);
    
		const embed = [
			{
				color: 0xf39c12,
				title: '🔗 Đăng nhập Strava và ủy quyền cho Mezon bot',
				url: loginLink,
				author: {
					name: event.display_name || event.username || "Mezon User",
					icon_url: mezon_avatar,
				},
				thumbnail: { url: mezon_avatar || '' },
				description: `⚠️ Link bên trên chỉ ủy quyền cho Mezon Bot đọc dữ liệu hoạt động của bạn!`,
				timestamp: new Date().toISOString(),
				footer: {
					text: "Powered by Mezon Bot Strava",
					icon_url: "https://d3nn82uaxijpm6.cloudfront.net/favicon-32x32.png"
				}
			}
		];
		await message.reply({ embed });
  } catch (err) {
    console.error(err);
  }
}


