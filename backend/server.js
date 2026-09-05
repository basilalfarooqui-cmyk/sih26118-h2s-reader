require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const readingsRouter = require('./routes/readings');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/debug-env', (req, res) => {
  const vars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
  const result = {};
  for (const v of vars) {
    const val = process.env[v] || '';
    const badChars = [];
    for (let i = 0; i < val.length; i++) {
      if (val.charCodeAt(i) > 255) badChars.push({ index: i, code: val.charCodeAt(i) });
    }
    result[v] = { length: val.length, badChars, preview: val.slice(0, 12) };
  }
  res.json(result);
});

app.use('/readings', readingsRouter);

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
