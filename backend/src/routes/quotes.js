const express = require('express');
const { supabase } = require('../lib/supabase');
const { authenticate } = require('../middleware/auth');
const { aggregateQuotes } = require('../services/quoteAggregator');

const router = express.Router();
router.use(authenticate);

// POST /api/quotes/request — fetch quotes for a vehicle
router.post('/request', async (req, res, next) => {
  try {
    const { vehicleId } = req.body;
    if (!vehicleId) return res.status(400).json({ error: 'vehicleId is required' });

    // Verify vehicle belongs to user
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .eq('user_id', req.user.userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const user = { id: req.user.userId, email: req.user.email };
    const { quotes, unavailableProviders } = await aggregateQuotes(vehicle, user);

    if (quotes.length === 0) {
      return res.status(503).json({ error: 'No providers returned quotes. Please try again later.' });
    }

    // Persist quote request + results
    const { data: quoteRequest, error } = await supabase
      .from('quote_requests')
      .insert({
        user_id: req.user.userId,
        vehicle_id: vehicleId,
        quotes,
        unavailable_providers: unavailableProviders,
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      requestId: quoteRequest.id,
      quotes,
      unavailableProviders,
      retrievedAt: quoteRequest.created_at,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/quotes/history — all past quote requests for the user (12 months)
router.get('/history', async (req, res, next) => {
  try {
    const since = new Date();
    since.setMonth(since.getMonth() - 12);

    const { data, error } = await supabase
      .from('quote_requests')
      .select('id, vehicle_id, quotes, unavailable_providers, created_at, vehicles(make, model, year)')
      .eq('user_id', req.user.userId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ history: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/quotes/history/:requestId — single quote request detail
router.get('/history/:requestId', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('quote_requests')
      .select('*, vehicles(make, model, year, vin)')
      .eq('id', req.params.requestId)
      .eq('user_id', req.user.userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Quote request not found' });
    res.json({ quoteRequest: data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
