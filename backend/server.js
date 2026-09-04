require('dotenv').config();
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

app.use('/readings', readingsRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
