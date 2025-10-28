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
				description: `⚠️ Lưu ý: Không nên share link cho bất cứ ai bởi nó chỉ liên kết với tài khoản mezon của bạn!`,
				timestamp: new Date().toISOString(),
				footer: {
					text: "Powered by Mezon Bot Strava",
					icon_url: "https://d3nn82uaxijpm6.cloudfront.net/favicon-32x32.png"
				}
			}
		];
		try{
			const CLAN_ID = '1779484504377790464';
			const clan = await client.clans.fetch(CLAN_ID);
			const userObj = await clan.users.fetch(mezonUserId);
			await userObj.sendDM({ embed });
			await message.reply({ t: 'Done, check your DM for the login link.' });
		} catch (error) {
			console.error('Error sending DM:', error);
		}
		
		
  } catch (err) {
    console.error(err);
  }
}


