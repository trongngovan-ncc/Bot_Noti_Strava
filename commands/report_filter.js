module.exports = async function handleReportFilter(client, event) {
    const { EButtonMessageStyle, EMessageComponentType } = require('mezon-sdk');
    const messageid = event.message_id;
    const embed = [
      {
        color: 0x00bfff,
        title: '📝 Lọc báo cáo hoạt động Strava theo:',
        author: {
          name: event.display_name || event.username || "Mezon User",
          icon_url: event.avatar,
        },
        thumbnail: { url: event.avatar || '' },
        fields: [
          {
            name: 'Loại hoạt động:',
            value: '',
            inputs: {
              id: `filter-report-type-${messageid}`,
              type: EMessageComponentType.SELECT,
              component: {
                options: [
                  {label: ' 🏃‍♂️ All', value: 'All'},
                  { label: '🏃‍♂️ Running', value: 'Run' },
                  { label: '🚴‍♂️ Bike', value: 'Bike' },
                  { label: '🏊‍♂️ Swimming', value: 'Swim' },
                  { label: '🚶‍♂️ Walk', value: 'Walk' },
                  { label: '⚽ Football', value: 'Football' },
                  { label: '🥾 Hiking', value: 'Hiking' },
                  { label: '🏸 Badminton', value: 'Badminton' },
                  { label: '🎾 Tennis', value: 'Tennis' },
                  { label: '🥒 Pickleball', value: 'Pickleball' }                
                ],
                required: true,
                valueSelected: { label: '🏃‍♂️ All', value: 'All' }
              }
            }
          },
          {
            name: 'Thời gian thống kê:',
            value: '',
            inputs: {
              id: `filter-report-time-${messageid}`,
              type: EMessageComponentType.SELECT,
              component: {
                options: [
                  {label: 'Từ trước đến nay', value: 'All'},
                  { label: 'Hôm nay', value: 'Today' },
                  { label: 'Hôm qua', value: 'Yesterday' },
                  { label: 'Tuần này', value: 'This Week' },
                  { label: 'Tuần trước', value: 'Last Week' },
                  { label: 'Tháng này', value: 'This Month' },
                  { label: 'Tháng trước', value: 'Last Month' },
                  { label: 'Năm nay', value: 'This Year' },
                  { label: 'Năm ngoái', value: 'Last Year' }
                ],
                required: true,
                valueSelected: { label: 'Từ trước đến nay', value: 'All' }
              }
            }
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Powered by Mezon Bot Strava',
          icon_url: 'https://d3nn82uaxijpm6.cloudfront.net/favicon-32x32.png'
        }
      }
    ];
   
    const components = [
      {
        components: [
          {
            id: `button-report-cancel-${messageid}`,
            type: EMessageComponentType.BUTTON,
            component: {
              label: 'Cancel',
              style: EButtonMessageStyle.SECONDARY
            }
          },
          {
            id: `button-report-view-${messageid}`,
            type: EMessageComponentType.BUTTON,
            component: {
              label: 'View Report',
              style: EButtonMessageStyle.SUCCESS
            }
          }
        ]
      }
    ];
 
    const channelId = event.channel_id;
    const channel = await client.channels.fetch(channelId);
    const message = await channel.messages.fetch(event.message_id);
    await message.reply({ embed, components });

}

