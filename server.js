const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/quote/:symbol', async (req, res) => {
  try {
    const data = await fetchYahooChart(req.params.symbol, '5d', '1d');
    const meta = data.chart.result[0].meta;
    const price = meta.regularMarketPrice;
    const previousClose = meta.previousClose ?? meta.chartPreviousClose;
    const change = previousClose != null ? price - previousClose : null;
    const changePercent = previousClose ? (change / previousClose) * 100 : null;

    res.json({
      symbol: meta.symbol,
      exchangeName: meta.exchangeName,
      currency: meta.currency,
      price,
      previousClose,
      change,
      changePercent,
      marketTime: meta.regularMarketTime,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get('/api/history/:symbol', async (req, res) => {
  const range = req.query.range || '1mo';
  try {
    const data = await fetchYahooChart(req.params.symbol, range, '1d');
    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const closes = result.indicators.quote[0].close || [];
    const history = timestamps
      .map((t, i) => ({ time: t, close: closes[i] }))
      .filter((point) => point.close != null);

    res.json({ symbol: result.meta.symbol, currency: result.meta.currency, history });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

async function fetchYahooChart(symbol, range, interval) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=${range}&interval=${interval}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!response.ok) {
    const error = new Error(
      response.status === 404
        ? '銘柄コードが見つかりませんでした'
        : `株価データの取得に失敗しました (HTTP ${response.status})`
    );
    error.status = response.status === 404 ? 404 : 502;
    throw error;
  }

  const data = await response.json();
  if (data.chart.error || !data.chart.result || !data.chart.result[0]) {
    const error = new Error('銘柄コードが見つかりませんでした');
    error.status = 404;
    throw error;
  }
  return data;
}

app.listen(PORT, () => {
  console.log(`株価チェックアプリ起動中: http://localhost:${PORT}`);
});
