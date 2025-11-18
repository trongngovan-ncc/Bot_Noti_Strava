module.exports = async function handleHelp(client, event) {

  try {
    const channel = await client.channels.fetch(event.channel_id);
    const message = await channel.messages.fetch(event.message_id);
    const embed = [{
      color: '#3498db',
      title: '🤖 Danh sách lệnh hỗ trợ Strava',
      author: {
				name:  'Mezon Bot Strava',
				icon_url: 'https://d3nn82uaxijpm6.cloudfront.net/favicon-32x32.png',
			},
      // thumbnail: { url:'https://d3nn82uaxijpm6.cloudfront.net/favicon-32x32.png' },
      fields: [
        { name: '🔗 *strava_login', value: '-> Đăng nhập Strava để kết nối tài khoản', inline: false },
        { name: '🔐 *strava_register', value: '-> Đăng ký vào group của Strava - NCC Sport ( cho user không dùng Strava )', inline: false },
        { name: '📋 *strava_myactivity', value: '-> Xem danh sách 10 hoạt động gần đây của bạn', inline: false },
        { name: '🏆 *strava_ranking', value: '-> Xem bảng xếp hạng top 5 thời gian hoạt động nhiều nhất cho đến thời điểm hiện tại', inline: false },
        { name: '📊 *strava_report', value: '-> Xem báo cáo hoạt động theo các loại thể thao và khoảng thời gian(ngày/tuần/tháng/năm)', inline: false },
        { name: '📝 *strava_daily', value: '-> Nhập hoạt động manual cho Strava', inline: false },
        { name: '🌐 *strava', value: '-> Reply người khác với lệnh này để xem activity của họ', inline: false },
        { name: '❓ *strava_help', value: '-> Xem hướng dẫn các lệnh', inline: false },
        {name: 'Lưu ý', value: 'Các lệnh (trừ *strava_help ) chỉ hợp lệ khi bạn sử dụng nó trong clan Komu.', inline: false }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Mezon Bot Strava',
        icon_url: 'https://d3nn82uaxijpm6.cloudfront.net/favicon-32x32.png'
      }
    }];
    await message.reply({ t: 'Các lệnh hỗ trợ:', embed });
  } catch (err) {
    console.error(err);
  }
}