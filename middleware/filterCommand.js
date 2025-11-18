const ALLOWED_CLANS = [
  "1779484504377790464",
  "1969101240251977728",
  "1840699528626311168",
  "1990680749602246656",
];


module.exports = async function filterCommand(client, event) {
  const channel = await client.channels.fetch(event.channel_id);
  const message = await channel.messages.fetch(event.message_id);
  const clanId = event.clan_id;

  if(!ALLOWED_CLANS.includes(clanId)){
    await message.reply({ t: 'Lệnh này chỉ được phép sử dụng trong Clan Komu!' });
    return false;
  }

  return true;
}

