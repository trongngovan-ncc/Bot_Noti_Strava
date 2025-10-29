module.exports = async function handleDailyLog(client, event) {
  const { EButtonMessageStyle, EMessageComponentType } = require("mezon-sdk");
  const messageid = event.message_id;
  const user_id = event.sender_id;
  const embed = [
    {
      color: 0x00bfff,
      title: "📝 Nhập hoạt động manual cho Strava",
      author: {
        name: event.display_name || event.username || "Mezon User",
        icon_url: event.avatar,
      },
      description: [
            `⚠️ Chỉ được nhập tối đa 1 ngày trước ngày hiện tại.`,
            `⚠️ Các loại hoạt động như Badminton, Football, Tennis, Pickleball không cần nhập khoảng cách.`,
      ].join('\n'),
      thumbnail: { url: event.avatar || "" },
      fields: [
        {
          name: "Tên hoạt động:",
          value: "",
          inputs: {
            id: `input-name-${messageid}-${user_id}`,
            type: EMessageComponentType.INPUT,
            component: {
              placeholder: "Nhập tên hoạt động...",
              required: true,
              textarea: false,
              defaultValue: "",
            },
          },
        },
        {
          name: "Loại hoạt động:",
          value: "",
          inputs: {
            id: `input-type-${messageid}-${user_id}`,
            type: EMessageComponentType.SELECT,
            component: {
              options: [
                { label: "🏃‍♂️ Running", value: "Run" },
                { label: "🚴‍♂️ Bike", value: "Bike" },
                { label: "🏊‍♂️ Swimming", value: "Swim" },
                { label: "🚶‍♂️ Walk", value: "Walk" },
                { label: "⚽ Football", value: "Football" },
                { label: "🥾 Hiking", value: "Hiking" },
                { label: "🏸 Badminton", value: "Badminton" },
                { label: "🎾 Tennis", value: "Tennis" },
                { label: "🥒 Pickleball", value: "Pickleball" },
              ],
              required: true,
              valueSelected: { label: "🏃‍♂️ Running", value: "Run" },
            },
          },
        },
        {
          name: "Thời gian (phút):",
          value: "",
          inputs: {
            id: `input-time-${messageid}-${user_id}`,
            type: EMessageComponentType.INPUT,
            component: {
              placeholder: "Nhập thời gian...",
              required: true,
              textarea: false,
              type: "number",
              defaultValue: "",
            },
          },
        },
        {
          name: "Khoảng cách (km):",
          value: "",
          inputs: {
            id: `input-distance-${messageid}-${user_id}`,
            type: EMessageComponentType.INPUT,
            component: {
              placeholder: "Nhập khoảng cách...",
              required: true,
              textarea: false,
              type: "number",
              defaultValue: "",
            },
          },
        },
        {
          name: "Thời điểm diễn ra hoạt động:",
          value: "",
          inputs: {
            id: `input-date-${messageid}-${user_id}`,
            type: EMessageComponentType.DATEPICKER,
            component: {
              value: "123456789",
            },
          },
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: "Powered by Mezon Bot Strava",
        icon_url: "https://d3nn82uaxijpm6.cloudfront.net/favicon-32x32.png",
      },
    },
  ];

  const components = [
    {
      components: [
        {
          id: `button-cancel-${messageid}-${user_id}`,
          type: EMessageComponentType.BUTTON,
          component: {
            label: "Cancel",
            style: EButtonMessageStyle.SECONDARY,
          },
        },
        {
          id: `button-submit-${messageid}-${user_id}`,
          type: EMessageComponentType.BUTTON,
          component: {
            label: "Submit",
            style: EButtonMessageStyle.SUCCESS,
          },
        },
      ],
    },
  ];

  const channelId = event.channel_id;
  const channel = await client.channels.fetch(channelId);
  const message = await channel.messages.fetch(event.message_id);
  await message.reply({ embed, components });
};
