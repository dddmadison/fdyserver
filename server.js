require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});app.options('*', cors(corsOptions));


// ✅ MongoDB 연결
const dbUri = process.env.DB_URI;
mongoose.connect(dbUri);

// ✅ Mongoose 모델
const flowerSchema = new mongoose.Schema({
  flowername: String,
  habitat: String,
  binomialName: String,
  classification: String,
  flowername_kr: String
});
const Flower = mongoose.model('Flower', flowerSchema, 'flowers');

// ✅ 꽃 정보 조회 API
app.get('/flowers', async (req, res) => {
  const flowername = req.query.flowername;

  try {
    const flower = await Flower.findOne({
      $or: [
        { flowername: flowername },
        { flowername_kr: flowername }
      ]
    });

    if (!flower) {
      res.status(404).json({ error: 'Flower not found' });
    } else {
      const { flowername, habitat, binomialName, classification, flowername_kr } = flower;
      res.json({ flowername, habitat, binomialName, classification, flowername_kr });
    }
  } catch (error) {
    console.error('Error retrieving flower information:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// ✅ 네이버 쇼핑 검색 API
app.get('/naver-shopping', async (req, res) => {
  const flowername = req.query.flowername;

  if (!flowername) {
    res.status(400).json({ error: 'Flowername is required' });
    return;
  }

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const displayPerPage = 100;
  const maxResults = 1000;
  let start = 1;

  async function fetchNaverShoppingResults() {
    try {
      const allResults = [];

      while (start <= maxResults) {
        const apiUrl = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(flowername)}&display=${displayPerPage}&start=${start}&sort=sim`;

        const response = await axios.get(apiUrl, {
          headers: {
            'X-Naver-Client-Id': clientId,
            'X-Naver-Client-Secret': clientSecret,
          },
        });

        const data = response.data;
        const items = data.items || [];

        if (items.length === 0) break;

        allResults.push(...items);
        start += displayPerPage;

        if (start > maxResults) break;
      }

      return allResults;
    } catch (error) {
      console.error('네이버 쇼핑 API 오류:', error);
      throw new Error('Naver Shopping API error');
    }
  }

  try {
    const data = await fetchNaverShoppingResults();
    console.log(`총 ${data.length}개의 검색 결과를 가져왔습니다.`);
    res.json({ items: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Naver Shopping API error' });
  }
});

// ✅ 서버 시작
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
