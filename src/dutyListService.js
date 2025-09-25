const axios = require('axios');

const API_KEY = 'AIzaSyA-NeFhQTCmtcMsRQof6jjZaEc9L1--D8Y';
const SHEET_ID = '1YMewYZLDJsYpM8bBAZKAaZ0sludp2R4LrIor5AnGlNk';
const RANGE = 'Lịch trực nhật Tháng 9+10!A2:D'; // Sheet và cột đúng với file của bạn

async function getDutyList() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(RANGE)}?key=${API_KEY}`;
  try {
    const response = await axios.get(url);
    const rows = response.data.values || [];
    return rows.map(row => ({
      stt: row[0] || '',
      name: row[1] || '',
      email: row[2] || '',
      date: row[3] || '',
    }));
  } catch (error) {
    // Ném lỗi ra ngoài để nơi gọi có thể xử lý
    throw new Error('Lỗi khi lấy dữ liệu trực nhật: ' + error.message);
  }
}

module.exports = {
  getDutyList
};