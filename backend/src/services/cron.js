const cron = require('node-cron');
const { supabase } = require('../lib/supabase');
const { aggregateQuotes } = require('./quoteAggregator');
const { sendRateAlertEmail } = require('./email');

const MAX_RETRIES = 3;

async function processAlerts() {
  console.log('[Cron] Processing due rate alerts...');
  const now = new Date().toISOString();

  // Fetch all enabled alerts that are due
  const { data: dueAlerts, error } = await supabase
    .from('alert_configs')
    .select('*, users(id, email, name), vehicles(*)')
    .eq('enabled', true)
    .lte('next_alert_at', now)
    .lt('retry_count', MAX_RETRIES + 1);

  if (error) {
    console.error('[Cron] Failed to fetch due alerts:', error);
    return;
  }

  console.log(`[Cron] Found ${dueAlerts.length} alert(s) to process`);

  for (const alert of dueAlerts) {
    try {
      const user = alert.users;
      const vehicle = alert.vehicles;

      const { quotes } = await aggregateQuotes(vehicle, user);
      if (quotes.length === 0) throw new Error('No quotes returned');

      await sendRateAlertEmail({
        to: user.email,
        userName: user.name,
        vehicle,
        quotes,
      });

      // Schedule next alert and reset retry count
      const next = new Date();
      next.setMonth(next.getMonth() + alert.frequency_months);

      await supabase
        .from('alert_configs')
        .update({
          last_sent_at: now,
          next_alert_at: next.toISOString(),
          retry_count: 0,
          last_error: null,
          updated_at: now,
        })
        .eq('id', alert.id);

      console.log(`[Cron] Alert sent to ${user.email} for ${vehicle.make} ${vehicle.model}`);
    } catch (err) {
      console.error(`[Cron] Alert ${alert.id} failed:`, err.message);

      const retryCount = (alert.retry_count || 0) + 1;
      const retryAt = new Date();
      retryAt.setHours(retryAt.getHours() + 1); // retry after 1 hour

      await supabase
        .from('alert_configs')
        .update({
          retry_count: retryCount,
          last_error: err.message,
          next_alert_at: retryCount >= MAX_RETRIES ? null : retryAt.toISOString(),
          updated_at: now,
        })
        .eq('id', alert.id);
    }
  }
}

async function purgeDeletedAccounts() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: users } = await supabase
    .from('users')
    .select('id')
    .lte('deletion_requested_at', thirtyDaysAgo.toISOString());

  for (const user of users || []) {
    await supabase.from('users').delete().eq('id', user.id);
    console.log(`[Cron] Purged deleted account ${user.id}`);
  }
}

function startCronJobs() {
  if (process.env.NODE_ENV === 'test') return;

  // Check for due alerts every hour
  cron.schedule('0 * * * *', processAlerts);

  // Purge deletion-requested accounts daily at 2am
  cron.schedule('0 2 * * *', purgeDeletedAccounts);

  console.log('[Cron] Scheduled jobs started');
}

module.exports = { startCronJobs, processAlerts };
