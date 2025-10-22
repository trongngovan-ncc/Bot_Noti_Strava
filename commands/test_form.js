module.exports = async function handleTestForm(client, event) {
    // Import enum từ mezon-sdk
    const { EButtonMessageStyle, EMessageComponentType } = require('mezon-sdk');
    const messageid = event.message_id;
    const embed = [
      {
        color: 0x00bfff,
        title: 'Nhập hoạt động manual cho Strava',
        fields: [
          {
            name: 'Tên hoạt động:',
            value: '',
            inputs: {
              id: `strava-${messageid}-name`,
              type: EMessageComponentType.INPUT,
              component: {
                placeholder: 'Nhập tên hoạt động...',
                required: true,
                textarea: false,
                defaultValue: ''
              }
            }
          },
          {
            name: 'Loại hoạt động:',
            value: '',
            inputs: {
              id: `strava-${messageid}-type`,
              type: EMessageComponentType.SELECT,
              component: {
                options: [
                  { label: 'Run', value: 'run' },
                  { label: 'Ride', value: 'ride' },
                  { label: 'Swim', value: 'swim' },
                  { label: 'Walk', value: 'walk' }
                ],
                required: true,
                valueSelected: { label: 'Run', value: 'run' }
              }
            }
          },
          {
            name: 'Thời gian (phút):',
            value: '',
            inputs: {
              id: `strava-${messageid}-time`,
              type: EMessageComponentType.INPUT,
              component: {
                placeholder: 'Nhập thời gian...',
                required: true,
                textarea: false,
                type: 'number',
                defaultValue: ''
              }
            }
          },
          {
            name: 'Khoảng cách (km):',
            value: '',
            inputs: {
              id: `strava-${messageid}-distance`,
              type: EMessageComponentType.INPUT,
              component: {
                placeholder: 'Nhập khoảng cách...',
                required: true,
                textarea: false,
                type: 'number',
                defaultValue: ''
              }
            }
          },
          {
            name: 'Ghi chú:',
            value: '',
            inputs: {
              id: `strava-${messageid}-note`,
              type: EMessageComponentType.INPUT,
              component: {
                placeholder: 'Thêm ghi chú...',
                required: false,
                textarea: true,
                defaultValue: ''
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
    // Nút Submit/Cancel
    const components = [
      {
        components: [
          {
            id: `strava_${messageid}_cancel`,
            type: EMessageComponentType.BUTTON,
            component: {
              label: 'Cancel',
              style: EButtonMessageStyle.SECONDARY
            }
          },
          {
            id: `strava_${messageid}_submit`,
            type: EMessageComponentType.BUTTON,
            component: {
              label: 'Submit',
              style: EButtonMessageStyle.SUCCESS
            }
          }
        ]
      }
    ];
    // Gửi message
    const channelId = event.channel_id;
    const channel = await client.channels.fetch(channelId);
    const message = await channel.messages.fetch(event.message_id);
    await message.reply({ embed, components });

}

