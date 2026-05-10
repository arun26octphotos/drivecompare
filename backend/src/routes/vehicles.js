const express = require('express');
const axios = require('axios');
const { z } = require('zod');
const { supabase } = require('../lib/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const MAX_VEHICLES = 5;

const vehicleSchema = z.object({
  vin: z.string().length(17).regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'Invalid VIN format').optional(),
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  trim: z.string().max(50).optional(),
  mileage: z.number().int().min(0).max(999999).optional(),
  primary_use: z.enum(['daily_commute', 'pleasure', 'business', 'farm']).optional(),
});

// GET /api/vehicles
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', req.user.userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ vehicles: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/vehicles/decode-vin/:vin — proxy to NHTSA (free, no key required)
router.get('/decode-vin/:vin', async (req, res, next) => {
  try {
    const { vin } = req.params;
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      return res.status(400).json({ error: 'Invalid VIN format' });
    }

    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`;
    const { data } = await axios.get(url, { timeout: 8000 });

    const results = data.Results;
    const get = (variable) => results.find(r => r.Variable === variable)?.Value;

    const make = get('Make');
    const model = get('Model');
    const year = parseInt(get('Model Year'), 10);

    if (!make || !model || !year || make === 'Not Applicable') {
      return res.status(404).json({ error: 'VIN not recognized — please enter details manually' });
    }

    res.json({
      vin: vin.toUpperCase(),
      make,
      model,
      year,
      trim: get('Trim') || null,
      bodyClass: get('Body Class') || null,
      engineCylinders: get('Engine Number of Cylinders') || null,
    });
  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'VIN decoder timed out — please enter details manually' });
    }
    next(err);
  }
});

// POST /api/vehicles
router.post('/', async (req, res, next) => {
  try {
    // Enforce max 5 vehicles per account
    const { count } = await supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.user.userId)
      .is('deleted_at', null);

    if (count >= MAX_VEHICLES) {
      return res.status(400).json({ error: `Maximum of ${MAX_VEHICLES} vehicles allowed per account` });
    }

    const parsed = vehicleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { data, error } = await supabase
      .from('vehicles')
      .insert({ ...parsed.data, user_id: req.user.userId })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ vehicle: data });
  } catch (err) {
    next(err);
  }
});

// PUT /api/vehicles/:id
router.put('/:id', async (req, res, next) => {
  try {
    // Verify ownership
    const { data: existing } = await supabase
      .from('vehicles')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!existing) return res.status(404).json({ error: 'Vehicle not found' });

    const parsed = vehicleSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { data, error } = await supabase
      .from('vehicles')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ vehicle: data });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/vehicles/:id — soft delete, retains quote history for 12 months
router.delete('/:id', async (req, res, next) => {
  try {
    const { data: existing } = await supabase
      .from('vehicles')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!existing) return res.status(404).json({ error: 'Vehicle not found' });

    const { error } = await supabase
      .from('vehicles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Vehicle removed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
