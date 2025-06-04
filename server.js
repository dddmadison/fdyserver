require('dotenv').config({ path: __dirname + '/.env' });   // ① .env 로드

const express  = require('express');
const cors     = require('cors');                         // ② cors
const axios    = require('axios');
const mongoose = require('mongoose');

const app  = express();
const port = process.env.PORT || 5000;

/* ---------- ② CORS: 모든 라우트보다 위에! ---------- */
app.use(
  cors({
    origin: [
      'http://localhost:3000',          // 개발
      'https://YOUR_FRONT_DOMAIN'       // 배포 프런트가 있다면 추가
    ],
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    credentials: false
  })
);
app.options('*', cors());               // 프리플라이트 허용
/* --------------------------------------------------- */

app.use(express.json());

/* ---------- MongoDB ---------- */
mongoose.connect(process.env.DB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connect error:', err));

const flowerSchema = new mongoose.Schema({
  flowername: String,
  habitat: String,
  binomialName: String,
  classification: String,
  flowername_kr: String
});
const Flower = mongoose.model('Flower', flowerSchema, 'flowers');

/* ---------- /flowers ---------- */
app.get('/flowers', async (req, res) => {
  const flowername = req.query.flowername;
  if (!flowername) return res.status(400).json({ error: 'flowername required' });

  try {
    const flower = await Flower.findOne({
      $or: [
        { flowername     : { $regex: `^${flowername}$`, $options: 'i' } }, // 영문 대소문자 무시
        { flowername_kr  : flowername }
      ]
    });
    if (!flower) return res.status(404).json({ error: 'not found' });
    res.json(flower);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

/* ---------- /naver-shopping ---------- */
app.get('/naver-shopping', async (req, res) => {
  const flowername = req.query.flowername;
  if (!flowername) return res.status(400).json({ error: 'flowername required' });

  const { CLIENT_ID, CLIENT_SECRET } = process.env;
  const displayPerPage = 100;
  const maxResults = 1000;

  try {
    const allResults = [];
    for (let start = 1; start <= maxResults; start += displayPerPage) {
      const apiUrl = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(flowername)}&display=${displayPerPage}&start=${start}&sort=sim`;
      const { data } = await axios.get(apiUrl, {
        headers: {
          'X-Naver-Client-Id'    : CLIENT_ID,
          'X-Naver-Client-Secret': CLIENT_SECRET
        }
      });
      if (!data.items?.length) break;
      allResults.push(...data.items);
    }
    console.log(`총 ${allResults.length}개 결과`);
    res.json({ items: allResults });
  } catch (e) {
    console.error('Naver API error:', e);
    res.status(500).json({ error: 'Naver API error' });
  }
});

/* ---------- 서버 스타트 ---------- */
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
