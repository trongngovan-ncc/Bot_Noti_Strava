

const ALLOWED_CHANNELS = [
  "1978358966857502720",
  "1967169865718435840",
  "1971995230311813120", 
];
const ALLOWED_CLANS = [
  "1779484504377790464",
  "1969101240251977728",
  "1840699528626311168",
];

module.exports = async function filterCommand(client, event) {
  const channel = await client.channels.fetch(event.channel_id);
  const message = await channel.messages.fetch(event.message_id);
  const clanId = event.clan_id;
  if(!clanId){
    await message.reply({ t: 'Không hỗ trợ DM' });
    return false;
  }else if(clanId == "0"){
    await message.reply({ t: 'Không hỗ trợ DM' });
    return false;
  }
  if(!ALLOWED_CLANS.includes(clanId)){
    await message.reply({ t: 'Lệnh này chỉ được phép sử dụng trong Clan Komu!' });
    return false;
  }

  // const channelId = event.channel_id;
  // if(!ALLOWED_CHANNELS.includes(channelId)){
  //   await message.reply({ t: 'Lệnh này chỉ được phép sử dụng trong kênh thể thao!' });
  //   return false;
  // }

  return true;
}

