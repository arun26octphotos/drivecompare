const express = require('express');
const { z } = require('zod');
const { supabase } = require('../lib/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const alertUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  frequencyMonths: z.union([z.literal(3), z.literal(6), z.literal(12)]).optional(),
});

// GET /api/alerts — all alert configs for the user's vehicles
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('alert_configs')
      .select('*, vehicles(make, model, year)')
      .eq('user_id', req.user.userId)
      .order('created_at');

    if (error) throw error;
    res.json({ alerts: data });
  } catch (err) {
    next(err);
  }
});

// PUT /api/alerts/:vehicleId — update alert preferences for a vehicle
router.put('/:vehicleId', async (req, res, next) => {
  try {
    // Verify vehicle ownership
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id')
      .eq('id', req.params.vehicleId)
      .eq('user_id', req.user.userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const parsed = alertUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const updates = {};
    if (parsed.data.enabled !== undefined) updates.enabled = parsed.data.enabled;
    if (parsed.data.frequencyMonths !== undefined) {
      updates.frequency_months = parsed.data.frequencyMonths;
      // Recalculate next alert date
      const next = new Date();
      next.setMonth(next.getMonth() + parsed.data.frequencyMonths);
      updates.next_alert_at = next.toISOString();
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('alert_configs')
      .upsert({
        user_id: req.user.userId,
        vehicle_id: req.params.vehicleId,
        ...updates,
      }, { onConflict: 'vehicle_id' })
      .select()
      .single();

    if (error) throw error;
    res.json({ alert: data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
