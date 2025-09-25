const { getDutyList } = require('../src/dutyListService');

module.exports = async function handleList(client, event) {
  try {
    const channel = await client.channels.fetch(event.channel_id);
    const message = await channel.messages.fetch(event.message_id);
    // Lấy danh sách trực nhật từ service
    let dutyList;
    try {
      dutyList = await getDutyList();
    } catch (err) {
      await message.reply({
        t: 'Không thể lấy danh sách trực nhật. Vui lòng thử lại sau!',
        mk: []
      });
      console.error('Lỗi khi lấy danh sách trực nhật:', err);
      return;
    }
    let listText = 'Danh sách trực nhật:\n';
    listText += dutyList.map(d => `${d.stt}. ${d.name} (${d.email}) - ${d.date}`).join('\n');
    await message.reply({
      t: listText,
      mk: [
        { type: 'pre', s: 0, e: listText.length }
      ]
    });
  } catch (err) {
    console.error('Lỗi khi xử lý command /list:', err);
  }
}