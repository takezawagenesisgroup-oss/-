export type TriggerType =
  | 'start'
  | 'distance'
  | 'time'
  | 'paceUp'
  | 'paceDown'
  | 'longPause'
  | 'midpoint'
  | 'nearFinish'
  | 'finish';

export type ToneId = 'coach' | 'friend' | 'romantic' | 'dog' | 'cat';
export type PersonaCategory = 'human' | 'animal';

export type Persona = {
  id: ToneId;
  category: PersonaCategory;
  label: string;
  tagline: string;
  free: boolean;
  lines: Record<TriggerType, string[]>;
};

export const CATEGORY_LABEL: Record<PersonaCategory, string> = {
  human: '人物',
  animal: 'どうぶつ',
};

// {km} {pace} {min} はプレースホルダー。speakLine() で実際の値に置換する。
export const PERSONAS: Persona[] = [
  {
    id: 'coach',
    category: 'human',
    label: 'コーチ',
    tagline: '落ち着いた口調で、フォームとペースを見てくれる',
    free: true,
    lines: {
      start: [
        'スタートしましょう。今日のペースで、無理なくいきますよ。',
        '準備はいいですか。まずは体を慣らすところから始めましょう。',
        'さあ、始めます。呼吸を整えて、リズムよくいきましょう。',
      ],
      distance: [
        '{km}キロ通過。いいペースです、このまま続けましょう。',
        'ここで{km}キロ。フォームは崩れていませんか、確認してみましょう。',
        '{km}キロ地点です。着実に進んでいますよ。',
      ],
      time: ['経過{min}分。呼吸のリズムは安定していますか。', '{min}分経過しました。肩の力を抜いていきましょう。'],
      paceUp: ['ペースが上がりましたね。良い感じです、その調子。', 'スピードに乗ってきました。無理はしすぎないように。', 'いいテンポです。このリズムをキープしましょう。'],
      paceDown: ['少しペースが落ちましたね。焦らなくて大丈夫です。', 'ここは無理せず。呼吸を整えるタイミングにしましょう。', 'ペースが落ちても問題ありません。歩幅を整えていきましょう。'],
      longPause: ['少し立ち止まっていますね。水分補給のタイミングにどうぞ。', '休憩中ですか。再開するときは体を軽くほぐしましょう。'],
      midpoint: ['折り返し地点です。ここまでのペースは悪くありません。', '半分まで来ました。後半に向けて呼吸を整えましょう。'],
      nearFinish: ['ゴールまであと少しです。ここが踏ん張りどころですよ。', '残りわずかです。ペースを保っていきましょう。'],
      finish: ['お疲れさまでした。今日も走り切りましたね。', 'ゴールです。よく頑張りました、ゆっくり呼吸を整えてください。'],
    },
  },
  {
    id: 'friend',
    category: 'human',
    label: '友人',
    tagline: 'テンション高めに、一緒に走ってくれる仲間',
    free: false,
    lines: {
      start: ['よし、行こっか。今日も一緒に走るよ。', '準備オッケー?じゃあスタートしよう。', 'さ、始めよ。無理せず、楽しんでこう。'],
      distance: ['{km}キロ来たね。いい感じじゃん。', 'もう{km}キロだよ。全然余裕そうだね。', '{km}キロ地点。順調順調。'],
      time: ['{min}分経ったよ。調子どう?', 'もう{min}分。早いね、頑張ってる。'],
      paceUp: ['お、速くなった。ナイスペース。', 'いいねいいね、乗ってきたじゃん。', 'スピード上がったね、その調子。'],
      paceDown: ['ちょっとペース落ちたね、大丈夫?無理しないでね。', 'ここはゆっくりでいいよ、焦らなくて大丈夫。', '疲れてきた?ペース落としても全然オッケーだよ。'],
      longPause: ['止まってる?ちょっと休憩中かな。水分とってね。', '大丈夫?無理してない?'],
      midpoint: ['半分きた。ここまでいいペースだよ。', '折り返し。後半も一緒に頑張ろう。'],
      nearFinish: ['あと少し。ラストスパートいこう。', 'ゴールもうすぐだよ、頑張れ。'],
      finish: ['お疲れさま。今日もよく走ったね。', 'ゴール。めっちゃ頑張ったじゃん、えらい。'],
    },
  },
  {
    id: 'romantic',
    category: 'human',
    label: '恋人',
    tagline: '隣にいるような、親密で気遣う口調',
    free: false,
    lines: {
      start: ['今日も隣にいるから、安心して走って。', '準備はいい?わたしがついてるから、大丈夫だよ。', 'さ、一緒に走ろう。今日もよろしくね。'],
      distance: ['{km}キロだね。ちゃんと隣で見てるよ。', 'もう{km}キロ。頑張ってるあなた、素敵だよ。', '{km}キロ地点。ここまで一緒に来られて嬉しいな。'],
      time: ['{min}分経ったよ。しんどくない?', 'もう{min}分。ずっと隣にいるから安心してね。'],
      paceUp: ['速くなったね、かっこいいよ。', 'その調子。見てて誇らしいな。', 'いいペース。すごく頑張ってるね。'],
      paceDown: ['無理しないで。ゆっくりでいいから、隣にいるよ。', '疲れたよね。少しペース落としても、ちゃんと待ってるから。', '焦らなくて大丈夫。あなたのペースでいいの。'],
      longPause: ['少し休憩?無理しないでね、待ってるから。', '大丈夫?水分とって、少し休んでいいよ。'],
      midpoint: ['半分だね。ここまで本当によく頑張った。', '折り返し地点。残りも隣にいるから安心して。'],
      nearFinish: ['あと少しだよ。最後まで隣にいるからね。', 'もうすぐゴール。頑張るあなたを見てるよ。'],
      finish: ['お疲れさま。今日も一緒に走れて嬉しかった。', 'ゴールだね、よく頑張ったね。ゆっくり休んで。'],
    },
  },
  {
    id: 'dog',
    category: 'animal',
    label: '犬',
    tagline: '元気でまっすぐな、犬らしい口調',
    free: false,
    lines: {
      start: ['はじめるわん!今日も一緒に走るよ!', 'よし出発!ボクもついていくわん!', 'スタート!元気いっぱい行こう!'],
      distance: ['{km}キロ来たよ!すごいわん!', 'もう{km}キロ!その調子だわん!', '{km}キロ地点!順調順調!'],
      time: ['{min}分経ったよ!調子どう?', 'もう{min}分!頑張ってるね!'],
      paceUp: ['お、速い!その調子だわん!', 'いいペース!テンション上がるね!', 'スピード上がったね!かっこいいわん!'],
      paceDown: ['ちょっとゆっくりでも大丈夫だよ!', '無理しないでね、ボクはずっと隣にいるわん!', '疲れた?ゆっくりでいいよ!'],
      longPause: ['止まってる?お水飲んでね!', '休憩中?無理しないでね!'],
      midpoint: ['半分来た!その調子だわん!', '折り返し!後半も一緒に頑張ろう!'],
      nearFinish: ['あと少し!ラストスパートだわん!', 'ゴールもうすぐ!頑張れ!'],
      finish: ['おつかれさま!今日もよく走ったわん!', 'ゴール!えらいえらい!'],
    },
  },
  {
    id: 'cat',
    category: 'animal',
    label: '猫',
    tagline: '気まぐれでマイペースな、猫らしい口調',
    free: false,
    lines: {
      start: ['はじめるにゃ〜。気が向いたらついていくにゃ。', 'よし、スタートにゃ。見ててあげるにゃ。', '行くにゃ。無理しないでにゃ。'],
      distance: ['{km}キロにゃ。まあまあ頑張ってるにゃ。', 'もう{km}キロにゃ?やるにゃね。', '{km}キロ地点にゃ。悪くないにゃ。'],
      time: ['{min}分経ったにゃ。疲れてないにゃ?', 'もう{min}分にゃ。休みたくなったら言うにゃ。'],
      paceUp: ['お、速いにゃ。ちょっと見直したにゃ。', 'いいペースにゃ、その調子にゃ。', 'やるにゃね、かっこいいにゃ。'],
      paceDown: ['無理しなくていいにゃ。', '疲れたにゃ?ゆっくりでいいにゃよ。', '焦らなくていいにゃ、マイペースでいいにゃ。'],
      longPause: ['休憩にゃ?ボクも眠くなってきたにゃ。', '止まってるにゃ。無理しないでにゃ。'],
      midpoint: ['半分にゃ。ここまでは悪くないにゃ。', '折り返しにゃ。あとちょっと付き合うにゃ。'],
      nearFinish: ['あと少しにゃ。頑張るにゃ。', 'もうすぐゴールにゃ。ファイトにゃ。'],
      finish: ['おつかれにゃ〜。よく頑張ったにゃ。', 'ゴールにゃ。えらいにゃ、なでてあげるにゃ。'],
    },
  },
];

export const CATEGORIES: PersonaCategory[] = ['human', 'animal'];

export function personasByCategory(category: PersonaCategory): Persona[] {
  return PERSONAS.filter((p) => p.category === category);
}

export const UNLOCK_PRICE_JPY = 480;

export function getPersona(id: ToneId): Persona {
  const persona = PERSONAS.find((p) => p.id === id);
  if (!persona) throw new Error(`Unknown persona: ${id}`);
  return persona;
}

export function pickLine(persona: Persona, trigger: TriggerType, rand: () => number = Math.random): string {
  const candidates = persona.lines[trigger];
  return candidates[Math.floor(rand() * candidates.length)];
}

// 直前に使ったインデックスを避けて選ぶ版。候補が2つ以上あるときだけ重複を避ける。
export function pickLineAvoidingRepeat(
  persona: Persona,
  trigger: TriggerType,
  lastIndex: number | undefined,
  rand: () => number = Math.random
): { text: string; index: number } {
  const candidates = persona.lines[trigger];
  if (candidates.length <= 1) return { text: candidates[0], index: 0 };
  let index = Math.floor(rand() * candidates.length);
  if (index === lastIndex) {
    index = (index + 1 + Math.floor(rand() * (candidates.length - 1))) % candidates.length;
  }
  return { text: candidates[index], index };
}

export function formatPaceMinPerKm(paceMinPerKm: number): string {
  if (!Number.isFinite(paceMinPerKm) || paceMinPerKm <= 0) return '計測中';
  const totalSeconds = Math.round(paceMinPerKm * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}分${s.toString().padStart(2, '0')}秒`;
}

export function fillTemplate(
  template: string,
  values: { km?: number; paceMinPerKm?: number; min?: number }
): string {
  return template
    .replace('{km}', values.km !== undefined ? values.km.toFixed(1).replace(/\.0$/, '') : '')
    .replace('{pace}', values.paceMinPerKm !== undefined ? formatPaceMinPerKm(values.paceMinPerKm) : '')
    .replace('{min}', values.min !== undefined ? String(values.min) : '');
}
