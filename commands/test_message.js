module.exports = async function handleTest(client, event) {
	const activity = {
		username: "Trọng Ngọ Văn",
		name: "Đi làm về chiều tối NCC - 20/10/2025",
		sport_type: "Ride",
		distance: 4370,
		moving_time: 900,
		start_date_local: "2025-10-20T19:07:23Z",
		mapImageUrl: "https://res.cloudinary.com/derzv88vp/image/upload/v1761038188/strava-maps/activity_map_test2_16200209245.png",
		photos: [
			"https://dgtzuqphqg23d.cloudfront.net/oqPbWBEVOtHGNP94P49-wuyYNN5EnCVjkJFOkm97eGs-576x768.jpg"
		],
		avatar: "https://imgproxy.mezon.ai/K0YUZRIosDOcz5lY6qrgC6UIXmQgWzLjZv7VJ1RAA8c/rs:fit:300:300:1/mb:2097152/plain/https://cdn.mezon.ai/0/1940048388468772864/1940048388468772900/1751380011460_photo_1740147886896.jpg",
		strava_url: "https://www.strava.com/activities/16200209245"
	};
	const mentionUserId = "1940048388468772864";
	const mentionName = "Trọng Ngọ Văn";
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
                url:'https://www.strava.com/athletes/187212452',
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
			thumbnail: { url: activity.photos[0]},
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
    const channelId = event.channel_id;
	const channel = await client.channels.fetch(channelId);
	await channel.send(messagePayload, mentionsArr);
}

