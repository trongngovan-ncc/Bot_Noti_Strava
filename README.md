

# Bot_Noti_Strava

## Giới thiệu
Bot_Noti_Strava là một hệ thống bot tích hợp Strava dành cho cộng đồng Mezon, giúp tự động nhận thông tin hoạt động từ ứng dụng Strava khi user ủy quyền cho mezon bot; tổng hợp, báo cáo, nhắc nhở và tạo động lực cho các thành viên tham gia hoạt động thể thao. Bot hỗ trợ nhiều bộ môn, lọc/xếp hạng linh hoạt, giao diện báo cáo đẹp, và tích hợp sâu với nền tảng Mezon.

## Tính năng chính
- **Login và ủy quyền Strava của người dùng cho Mezon Bot**: Chỉ cần Login Oauth2 thông qua 1 bước.
- **Đồng bộ hoạt động Strava**: Tự động nhận webhook, lưu trữ và xử lý dữ liệu hoạt động từ Strava.
- **Báo cáo & xếp hạng**: Cho phép lọc báo cáo theo thời gian, bộ môn, tiêu chí xếp hạng (quãng đường, thời gian, số lần), giới hạn top N, hiển thị bảng xếp hạng đẹp với icon, avatar, link Strava.
- **Nhắc nhở động viên**: Cronjob tự động tag các thành viên chưa có hoạt động, gửi thông điệp động viên sinh động, hỗ trợ tiếng Việt và tiếng Anh.
- **Bảo mật & xác thực**: Hỗ trợ xác thực OAuth2 với Strava, bảo vệ endpoint webhook bằng token .
- **Tùy biến linh hoạt**: Cấu hình thời gian cronjob, kênh thông báo, bộ lọc báo cáo qua filter.



## Hướng dẫn cài đặt nhanh
1. Clone repo về máy
2. Cài đặt package: `npm install`
3. Tạo file `.env` theo mẫu và điền các thông tin cần thiết (token, channel, Strava API...)
4. Chạy bot: `npm start`



## Hướng dẫn sử dụng & Danh sách lệnh

Sau khi cài đặt, bạn có thể sử dụng các lệnh sau trong clan Komu hoặc giao diện Mezon:

| Lệnh | Chức năng |
|------|-----------|
| `*strava_login` | Đăng nhập Strava để kết nối tài khoản |
| `*strava_register` | Đăng ký vào group của Strava - NCC Sport (cho user không dùng Strava) |
| `*strava_myactivity` | Xem danh sách 10 hoạt động gần đây của bạn |
| `*strava_ranking` | Xem bảng xếp hạng top 5 thời gian hoạt động nhiều nhất cho đến thời điểm hiện tại |
| `*strava_report` | Xem báo cáo hoạt động theo các loại thể thao và khoảng thời gian (ngày/tuần/tháng/năm) |
| `*strava_daily` | Nhập hoạt động manual cho Strava |
| `*strava` | Reply người khác với lệnh này để xem activity của họ |
| `*strava_help` | Xem hướng dẫn các lệnh |

**Lưu ý:**
- Các lệnh (trừ `*strava_help`) chỉ hợp lệ khi bạn sử dụng trong clan Komu.
- Một số lệnh yêu cầu đã kết nối tài khoản Strava.




## Đóng góp
Mọi ý kiến đóng góp, báo lỗi hoặc đề xuất thêm tính năng vui lòng tạo issue hoặc liên hệ trực tiếp qua Mezon.