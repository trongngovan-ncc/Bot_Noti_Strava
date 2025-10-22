module.exports = async function sendStravaActivityToChannel(client, activity, channelId, mentionUserId, mentionName) {
    const mentionTag = `@${mentionName}`;
    const tMsg = `${mentionTag} vừa hoàn thành một hoạt động mới trên Strava!`;
    const offset = 0;
    const mentionsArr = [{ user_id: mentionUserId, s: offset, e: mentionTag.length }];

    const embed = {
        color: "#f39c12",
        title: `🚴 Hoạt động mới của ${activity.username} -- Link hoạt động`,
        url: activity.strava_url,
        author: {
            name: activity.username + "'s profile in Strava",
            icon_url: activity.avatar,
            url: activity.strava_profile_url || activity.strava_url,
        },
        description: [
            "```",
            `🏷️ Title: ${activity.name}`,
            `🚴 Type: ${activity.sport_type}`,
            `📏 Distance: ${(activity.distance/1000).toFixed(2)} km`,
            `⏱️ Moving Time: ${(activity.moving_time/60).toFixed(1)} minutes`,
            `📅 Date: ${activity.start_date_local}`,
            "```"
        ].join('\n'),
        thumbnail: { url: activity.photos?.[0] || '' },
        fields: [
            { name: "Bản đồ quá trình hoạt động", value: ``, inline: false }
        ],
        image: { url: activity.mapImageUrl },
        timestamp: new Date().toISOString(),
        footer: {
            text: "Powered by Mezon Bot Strava",
            icon_url: "https://d3nn82uaxijpm6.cloudfront.net/favicon-32x32.png"
        }
    };

    const messagePayload = {
        t: tMsg,
        embed: [embed]
    };
    const channel = await client.channels.fetch(channelId);
    await channel.send(messagePayload, mentionsArr);
}
