// リアルタイム天気連動モード。GPSの現在地から天気を取得し、その場の空気感に
// 合わせた一言を追加する。Open-Meteo(https://open-meteo.com)はAPIキー不要の
// 無料天気APIで、非商用/商用問わず利用でき、追加コストが発生しない。
//
// 注意: この開発環境(サンドボックス)は外部APIへの直接アクセスが
// ネットワークポリシーでブロックされているため、この fetch は実機/実際の
// アプリでのみ動作確認できる。GPSと同じ制約。

export type WeatherCondition = 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';

export type WeatherInfo = {
  temperatureC: number;
  windSpeedKmh: number;
  isDay: boolean;
  condition: WeatherCondition;
};

// WMO Weather interpretation codes (Open-Meteoが準拠) を簡易カテゴリに変換
function classifyWeatherCode(code: number): WeatherCondition {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2 || code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'cloudy';
}

export async function fetchCurrentWeather(latitude: number, longitude: number): Promise<WeatherInfo | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day,wind_speed_10m&timezone=auto`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    const current = json.current;
    if (!current) return null;
    return {
      temperatureC: current.temperature_2m,
      windSpeedKmh: current.wind_speed_10m,
      isDay: current.is_day === 1,
      condition: classifyWeatherCode(current.weather_code),
    };
  } catch {
    // オフライン・APIエラー・タイムアウトなど、失敗しても通常の声かけは継続する
    return null;
  }
}

const CONDITION_LINES: Record<WeatherCondition, string[]> = {
  clear: ['今日はいい天気だね。', '日差しが気持ちいいね。', '空が気持ちいいくらい晴れてるよ。'],
  cloudy: ['曇り空だけど、過ごしやすい気温だね。', '今日は穏やかな空模様だね。'],
  fog: ['霧が出てるね、足元と周りに気をつけて。', '視界が悪いから、無理せずゆっくりね。'],
  rain: ['雨の中お疲れさま、足元気をつけてね。', '雨天決行、えらいね。滑らないように。'],
  snow: ['雪の中頑張ってるね、滑らないように気をつけて。', '足元が冷えるから、無理しないでね。'],
  storm: ['天候が荒れ気味だね、無理せず引き返す判断も大事だよ。', '雷が心配な時は、早めに切り上げてね。'],
};

const HOT_LINES = ['今日は暑いから、水分補給忘れずにね。', '熱中症に気をつけて、無理しないでね。'];
const COLD_LINES = ['今日は寒いね、体はあったまってきた?', '防寒、しっかりできてる?'];
const NIGHT_LINES = ['もう暗くなってきたね、足元と車に気をつけて。', '夜は視界が悪いから、無理せずいこうね。'];
const WINDY_LINES = ['今日は風が強いね、気をつけて。'];

export function buildWeatherLine(weather: WeatherInfo, rand: () => number = Math.random): string {
  const pools: string[][] = [CONDITION_LINES[weather.condition]];
  if (weather.temperatureC >= 28) pools.push(HOT_LINES);
  if (weather.temperatureC <= 5) pools.push(COLD_LINES);
  if (!weather.isDay) pools.push(NIGHT_LINES);
  if (weather.windSpeedKmh >= 30) pools.push(WINDY_LINES);

  const pool = pools[Math.floor(rand() * pools.length)];
  return pool[Math.floor(rand() * pool.length)];
}
