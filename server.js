// server.js
require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const axios    = require('axios');
const mongoose = require('mongoose');
const app      = express();
const port     = process.env.PORT || 5000;

// ────────────────────────────────────────────────
app.use(cors());           // OPTIONS-preflight 포함 CORS 전부 처리
// ────────────────────────────────────────────────

// MongoDB 연결 --------------------------------------------------------
mongoose
  .connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

const flowerSchema = new mongoose.Schema(
  {
    flowername:    String,
    habitat:       String,
    binomialName:  String,
    classification:String,
    flowername_kr: String,
  },
  { collection: 'flowers' }
);
const Flower = mongoose.model('Flower', flowerSchema);

// 꽃 정보 --------------------------------------------------------------
app.get('/flowers', async (req, res) => {
  try {
    const keyword = req.query.flowername;
    const flower = await Flower.findOne({
      $or: [{ flowername: keyword }, { flowername_kr: keyword }],
    });

    if (!flower) return res.status(404).json({ error: 'Flower not found' });
    const { flowername, habitat, binomialName, classification, flowername_kr } = flower;
    res.json({ flowername, habitat, binomialName, classification, flowername_kr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 네이버 쇼핑 ----------------------------------------------------------
app.get('/naver-shopping', async (req, res) => {
  const flowername = req.query.flowername;
  if (!flowername) return res.status(400).json({ error: 'flowername is required' });

  // 라우트 내부에서 자격 증명 & 파라미터 선언
  const clientId        = process.env.CLIENT_ID;
  const clientSecret    = process.env.CLIENT_SECRET;
  const displayPerPage  = 100;
  const maxResults      = 1000;

  try {
    const allResults = [];

    for (let start = 1; start <= maxResults; start += displayPerPage) {
      const url =
        `https://openapi.naver.com/v1/search/shop.json` +
        `?query=${encodeURIComponent(flowername)}` +
        `&display=${displayPerPage}&start=${start}&sort=sim`;

      const { data } = await axios.get(url, {
        headers: {
          'X-Naver-Client-Id':     clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      });

      if (!data.items?.length) break;      // 더 이상 결과가 없으면 종료
      allResults.push(...data.items);
    }

    res.json({ items: allResults });
  } catch (err) {
    console.error('Naver Shopping API error:', err);
    res.status(500).json({ error: 'Naver Shopping API error' });
  }
});

// ────────────────────────────────────────────────
app.listen(port, () => console.log(`Server running on port ${port}`));
