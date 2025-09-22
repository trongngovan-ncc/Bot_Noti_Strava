const { generateStravaConnectLink } = require('../utils/strava');

module.exports = async function handleLoginStrava(client, event) {
  try {
    const channel = await client.channels.fetch(event.channel_id);
    const message = await channel.messages.fetch(event.message_id);
    const mezonUserId =  event.sender_id;
    const loginLink = generateStravaConnectLink(mezonUserId);
    const header = `🔗 Đăng nhập Strava để kết nối tài khoản của bạn:`;
    await message.reply({
      t: header + '\n' + loginLink,
      mk: [
        { type: 'lk', s: header.length + 1, e: header.length + 1 + loginLink.length }
      ]

    });
  } catch (err) {
    console.error(err);
  }
}