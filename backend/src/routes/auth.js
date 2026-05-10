const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { supabase } = require('../lib/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function issueToken(userId, email) {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const { email, password, name } = parsed.data;

    // Check uniqueness
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password — bcrypt cost 12 per requirements
    const passwordHash = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from('users')
      .insert({ email: email.toLowerCase(), password_hash: passwordHash, name })
      .select('id, email, name, created_at')
      .single();

    if (error) throw error;

    const token = issueToken(user.id, user.email);
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      // Generic message — don't reveal which field is wrong (req 1.5)
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const { email, password } = parsed.data;

    const { data: user } = await supabase
      .from('users')
      .select('id, email, name, password_hash')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    // Always run bcrypt compare to prevent timing attacks
    const dummyHash = '$2a$12$invalidhashfortimingattackprevention000000000000000000';
    const hash = user ? user.password_hash : dummyHash;
    const valid = await bcrypt.compare(password, hash);

    if (!user || !valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = issueToken(user.id, user.email);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .eq('id', req.user.userId)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/account — GDPR-style deletion within 30 days (req 7.4)
router.delete('/account', authenticate, async (req, res, next) => {
  try {
    // Mark for deletion — a cron job purges fully after 30 days
    const { error } = await supabase
      .from('users')
      .update({ deletion_requested_at: new Date().toISOString() })
      .eq('id', req.user.userId);

    if (error) throw error;
    res.json({ message: 'Account scheduled for deletion within 30 days' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
