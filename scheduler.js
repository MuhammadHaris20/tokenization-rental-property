// scheduler.js
const cron = require('node-cron');
const axios = require('axios');

const API_URL = 'http://localhost:5000/api/notifications/trigger-reminders';

// Run every day at 8:00 AM
cron.schedule('0 8 * * *', async () => {
  console.log('🕐 Running daily rent reminder check...');
  try {
    const response = await axios.post(API_URL);
    console.log(`✅ ${response.data.createdCount} reminders created`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
});

console.log('📅 Rent reminder scheduler started. Will run daily at 8:00 AM');
console.log('Press Ctrl+C to stop');

// Keep the process running
process.stdin.resume();