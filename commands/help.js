module.exports = async function handleHelp(client, event) {

  try {
    const channel = await client.channels.fetch(event.channel_id);
    const message = await channel.messages.fetch(event.message_id);
    const embed = [{
      color: '#3498db',
      title: '🤖 Danh sách lệnh hỗ trợ Strava',
      description: '',
      fields: [
        { name: '🔗 /login', value: 'Đăng nhập Strava để kết nối tài khoản', inline: false },
        { name: '📋 /myactivity', value: 'Xem danh sách hoạt động gần đây của bạn', inline: false },
        { name: '🏆 /ranking', value: 'Xem bảng xếp hạng top 5 quãng đường, thời gian, số lần hoạt động', inline: false },
        { name: '📝 /test_form', value: 'Nhập hoạt động manual cho Strava', inline: false },
        { name: '🧪 /test_message', value: 'Test gửi thông báo hoạt động mẫu', inline: false },
        { name: '❓ /help', value: 'Xem hướng dẫn các lệnh', inline: false }
      ],
      thumbnail: { url: 'https://www.svgrepo.com/show/134313/strava.svg' },
      footer: {
        text: 'Mezon Bot Strava',
        icon_url: 'https://cdn.mezon.ai/0/1940048388468772864/1940048388468772900/1751380011460_photo_1740147886896.jpg'
      }
    }];
    await message.reply({ t: 'Các lệnh hỗ trợ:', embed });
  } catch (err) {
    console.error(err);
  }
}