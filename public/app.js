const form = document.getElementById('search-form');
const input = document.getElementById('symbol-input');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const rangeButtons = document.getElementById('range-buttons');
const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');

let currentSymbol = null;
let currentRange = '1mo';

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const symbol = input.value.trim();
  if (!symbol) return;
  loadSymbol(symbol);
});

rangeButtons.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-range]');
  if (!button || !currentSymbol) return;
  currentRange = button.dataset.range;
  [...rangeButtons.querySelectorAll('button')].forEach((b) => b.classList.remove('active'));
  button.classList.add('active');
  loadHistory(currentSymbol, currentRange);
});

async function loadSymbol(symbol) {
  currentSymbol = symbol;
  showStatus(`「${symbol}」を検索中...`);
  resultEl.hidden = true;

  try {
    const [quote] = await Promise.all([
      fetchJSON(`/api/quote/${encodeURIComponent(symbol)}`),
      loadHistory(symbol, currentRange),
    ]);
    renderQuote(quote);
    hideStatus();
    resultEl.hidden = false;
  } catch (err) {
    showStatus(err.message || '取得に失敗しました', true);
  }
}

async function loadHistory(symbol, range) {
  const history = await fetchJSON(`/api/history/${encodeURIComponent(symbol)}?range=${range}`);
  renderChart(history);
  return history;
}

async function fetchJSON(url) {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'エラーが発生しました');
  }
  return data;
}

function renderQuote(quote) {
  document.getElementById('quote-symbol').textContent = quote.symbol;
  document.getElementById('quote-exchange').textContent = quote.exchangeName || '';
  document.getElementById('quote-price').textContent = formatNumber(quote.price);
  document.getElementById('quote-currency').textContent = quote.currency || '';
  document.getElementById('quote-previous-close').textContent = formatNumber(quote.previousClose);
  document.getElementById('quote-time').textContent = quote.marketTime
    ? new Date(quote.marketTime * 1000).toLocaleString('ja-JP')
    : '-';

  const changeEl = document.getElementById('quote-change');
  if (quote.change == null) {
    changeEl.textContent = '';
    changeEl.className = 'change';
  } else {
    const sign = quote.change >= 0 ? '+' : '';
    changeEl.textContent = `${sign}${formatNumber(quote.change)} (${sign}${quote.changePercent.toFixed(2)}%)`;
    changeEl.className = `change ${quote.change >= 0 ? 'up' : 'down'}`;
  }
}

function renderChart(data) {
  const points = data.history || [];
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  if (points.length < 2) {
    return;
  }

  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const padding = 24;
  const range = max - min || 1;

  const styles = getComputedStyle(document.documentElement);
  const lineColor = styles.getPropertyValue('--accent').trim() || '#2563eb';
  const gridColor = styles.getPropertyValue('--border').trim() || '#e5e7eb';

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding + ((height - padding * 2) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((point, i) => {
    const x = padding + ((width - padding * 2) * i) / (points.length - 1);
    const y = height - padding - ((point.close - min) / range) * (height - padding * 2);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
}

function formatNumber(value) {
  if (value == null) return '-';
  return Number(value).toLocaleString('ja-JP', { maximumFractionDigits: 2 });
}

function showStatus(message, isError = false) {
  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.className = isError ? 'status error' : 'status';
}

function hideStatus() {
  statusEl.hidden = true;
}
