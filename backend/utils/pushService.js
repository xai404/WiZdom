const { Expo } = require('expo-server-sdk');

const expo = new Expo();

// Best-effort Expo push send to every token registered for a student.
// Never throws — a push failure must never break the API call that
// triggered it (mirrors the sendMail try/catch pattern in studentsController).
// Also prunes tokens Expo reports as permanently dead (DeviceNotRegistered)
// so a student's pushTokens array doesn't grow stale forever.
async function sendPushToStudent(student, { title, body, data }) {
  const tokens = (student.pushTokens || []).filter((t) => Expo.isExpoPushToken(t));
  if (!tokens.length) return;

  const messages = tokens.map((to) => ({ to, sound: 'default', title, body, data }));
  const chunks = expo.chunkPushNotifications(messages);
  const deadTokens = [];

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          deadTokens.push(chunk[i].to);
        }
      });
    } catch (err) {
      console.error('[pushService] chunk send failed:', err);
    }
  }

  if (deadTokens.length) {
    student.pushTokens = student.pushTokens.filter((t) => !deadTokens.includes(t));
    await student.save();
  }
}

module.exports = { sendPushToStudent };
