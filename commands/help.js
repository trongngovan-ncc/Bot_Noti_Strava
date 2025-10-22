module.exports = async function handleHelp(client, event) {

  try {
    const channel = await client.channels.fetch(event.channel_id);
    const message = await channel.messages.fetch(event.message_id);
  const introText =
`🤖 Xin chào! Tôi là bot hỗ trợ thông báo các hoạt động trên Strava`;
    await message.reply({
      t: introText,
      mk: [
        { type: 'pre', s: 0, e: introText.length }
      ]
    });
  } catch (err) {
    console.error(err);
  }
}