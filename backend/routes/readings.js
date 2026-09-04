const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');

router.post('/', async (req, res) => {
  const { workerName, workerId, hexCode, source, timeRecorded, timeSynced } = req.body;

  if (!workerName || !workerId || !hexCode || !source || !timeRecorded) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  if (source !== 'app' && source !== 'hardware') {
    return res.status(400).json({ success: false, error: 'source must be "app" or "hardware"' });
  }

  const { data, error } = await supabase
    .from('readings')
    .insert({
      worker_name: workerName,
      worker_id: workerId,
      hex_code: hexCode,
      source,
      time_recorded: timeRecorded,
      time_synced: timeSynced || null,
    })
    .select('id')
    .single();

  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  res.json({ success: true, id: data.id });
});

router.get('/', async (req, res) => {
  const { source } = req.query;

  let query = supabase.from('readings').select('*').order('time_recorded', { ascending: false });

  if (source === 'app' || source === 'hardware') {
    query = query.eq('source', source);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  res.json(data);
});

router.get('/worker/:workerId', async (req, res) => {
  const { workerId } = req.params;

  const { data, error } = await supabase
    .from('readings')
    .select('*')
    .eq('worker_id', workerId)
    .order('time_recorded', { ascending: false });

  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from('readings').delete().eq('id', id);

  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  res.json({ success: true });
});

router.delete('/', async (req, res) => {
  const { ids } = req.body;

  let query = supabase.from('readings').delete();
  query = Array.isArray(ids) && ids.length > 0
    ? query.in('id', ids)
    : query.not('id', 'is', null);

  const { error } = await query;

  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  res.json({ success: true });
});

module.exports = router;
