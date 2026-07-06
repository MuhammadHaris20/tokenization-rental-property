// routes/notificationRoutes.js
// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'rwa',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Create monthly rent reminders for OWNERS
async function createMonthlyRentReminders() {
  const connection = await pool.getConnection();
  try {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.toLocaleString('default', { month: 'long' });
    const currentYear = today.getFullYear();
    
    // Get all active tenants (notifications go to owner_id)
    const [tenants] = await connection.query(`
      SELECT t.*, p.title as property_name, u.full_name as owner_name, u.email as owner_email
      FROM tenants t
      JOIN properties p ON t.property_id = p.property_id
      JOIN users u ON t.owner_id = u.user_id
      WHERE t.status = 'active' 
        AND t.kyc_status = 'approved'
        AND t.lease_start <= CURDATE()
        AND t.lease_end >= CURDATE()
    `);
    
    let createdCount = 0;
    
    for (const tenant of tenants) {
      const dueDay = parseInt(tenant.due_date) || 5;
      
      // Check if already sent notification this month for this owner
      const [existing] = await connection.query(
        `SELECT * FROM notifications 
         WHERE user_id = ? AND type = 'rent_reminder' 
         AND MONTH(created_at) = MONTH(CURDATE()) 
         AND YEAR(created_at) = YEAR(CURDATE())`,
        [tenant.owner_id]  // Send notification to OWNER
      );
      
      if (existing.length === 0) {
        let title = '';
        let message = '';
        
        if (currentDay === dueDay) {
          title = '💰 Rent Due Today';
          message = `Rent of PKR ${Number(tenant.monthly_rent).toLocaleString()} for "${tenant.property_name}" (Tenant: ${tenant.full_name}) is due today.`;
        } 
        else if (currentDay === dueDay - 3 && dueDay > 3) {
          title = '⏰ Rent Due in 3 Days';
          message = `Rent of PKR ${Number(tenant.monthly_rent).toLocaleString()} for "${tenant.property_name}" (Tenant: ${tenant.full_name}) is due in 3 days.`;
        } 
        else if (currentDay === dueDay - 7 && dueDay > 7) {
          title = '📅 Rent Due in 7 Days';
          message = `Rent of PKR ${Number(tenant.monthly_rent).toLocaleString()} for "${tenant.property_name}" (Tenant: ${tenant.full_name}) is due in 7 days.`;
        }
        else if (currentDay === 1) {
          title = '🏠 Monthly Rent Reminder';
          message = `Rent for "${tenant.property_name}" (PKR ${Number(tenant.monthly_rent).toLocaleString()}) from tenant ${tenant.full_name} is due on the ${dueDay}th of this month.`;
        }
        
        if (title && message) {
          await connection.query(
            `INSERT INTO notifications (user_id, type, title, message, metadata) 
             VALUES (?, 'rent_reminder', ?, ?, ?)`,
            [tenant.owner_id, title, message, JSON.stringify({ 
              tenant_id: tenant.tenant_id,
              property_id: tenant.property_id, 
              amount: tenant.monthly_rent, 
              due_date: dueDay,
              property_name: tenant.property_name,
              tenant_name: tenant.full_name
            })]
          );
          createdCount++;
          console.log(`✅ Created rent reminder for owner ${tenant.owner_name} - ${title}`);
        }
      }
    }
    
    console.log(`📊 Rent reminders created: ${createdCount} for ${currentMonth} ${currentYear}`);
    return createdCount;
  } catch (error) {
    console.error('Error creating reminders:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Trigger reminders manually
router.post('/trigger-reminders', async (req, res) => {
  try {
    const count = await createMonthlyRentReminders();
    res.json({ success: true, createdCount: count });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get notifications for a user (owner)
router.get('/:userId', async (req, res) => {
  try {
    const [notifications] = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.params.userId]
    );
    
    const [unread] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.params.userId]
    );
    
    res.json({ 
      success: true, 
      notifications,
      unreadCount: unread[0].count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.put('/:notificationId/read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE notification_id = ?', [req.params.notificationId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all as read
router.put('/:userId/mark-all-read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.params.userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/test', (req, res) => {
  res.json({ message: 'Notifications route is working!' });
});

module.exports = router;