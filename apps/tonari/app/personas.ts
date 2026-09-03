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

// カテゴリ表示名は app/i18n.ts の categoryHuman/categoryAnimal を参照(多言語対応のため)。

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

// --- 多言語対応: キャラの発話内容の英語訳 -------------------------------
// UIは7言語(app/i18n.ts)対応だが、台詞の翻訳は量が多いためまず英語のみ。
// {km} {min} プレースホルダーは日本語版と同じ意味で使う。
type PersonaTranslation = { label: string; tagline: string; lines: Record<TriggerType, string[]> };

const PERSONA_TRANSLATIONS_EN: Record<ToneId, PersonaTranslation> = {
  coach: {
    label: 'Coach',
    tagline: 'Calm and steady, watching your form and pace',
    lines: {
      start: [
        "Let's start. We'll go at today's pace, nothing forced.",
        "Ready? Let's ease into it and warm up first.",
        "Alright, here we go. Settle your breathing and find a rhythm.",
      ],
      distance: [
        '{km}km down. Good pace, keep it up.',
        "{km}km now. Let's check your form hasn't slipped.",
        '{km}km mark. Steady progress.',
      ],
      time: ['{min} minutes in. Is your breathing steady?', '{min} minutes gone. Relax those shoulders.'],
      paceUp: [
        "You've picked up the pace. Nicely done, keep it there.",
        "You're finding your speed. Just don't push too hard.",
        'Good tempo. Keep this rhythm going.',
      ],
      paceDown: [
        "Pace has dropped a bit, that's fine, no need to rush.",
        "No need to force it here. Good time to reset your breathing.",
        'A slower pace is no problem. Focus on your stride.',
      ],
      longPause: [
        "You've stopped for a moment. Good time for some water.",
        'Taking a break? Loosen up a bit before you continue.',
      ],
      midpoint: [
        "You're at the halfway point. Pace so far has been solid.",
        'Halfway there. Steady your breathing for the second half.',
      ],
      nearFinish: [
        "Almost at the finish. This is where it counts.",
        "Not far to go now. Keep holding this pace.",
      ],
      finish: [
        "Great work. You made it through today too.",
        "That's the finish. Well done, take a moment to catch your breath.",
      ],
    },
  },
  friend: {
    label: 'Friend',
    tagline: 'High energy, running right there with you',
    lines: {
      start: ["Alright, let's go! Running together today too.", 'Ready? Let\'s get started.', "Okay, let's do this. No pressure, just have fun."],
      distance: ['{km}km already, nice!', "{km}km, you're looking good out there.", '{km}km mark. Smooth sailing.'],
      time: ["{min} minutes in, how's it feeling?", '{min} minutes already, you\'re on fire.'],
      paceUp: ['Ooh, speeding up. Nice pace!', "Love it, you're really finding your groove.", "Speed's up, keep that going."],
      paceDown: ["Pace dropped a bit, you good? Don't push it.", 'Take it slow here, no rush at all.', "Getting tired? Totally fine to ease off."],
      longPause: ['You stopped? Taking a quick break I bet. Grab some water.', "You okay? Not overdoing it, right?"],
      midpoint: ["Halfway there. Great pace so far.", "Turnaround point. Let's finish strong together."],
      nearFinish: ["Almost there. Let's go for a final push.", "Finish line's close, you've got this."],
      finish: ["Nice work out there today.", "That's a finish! You crushed it, seriously."],
    },
  },
  romantic: {
    label: 'Partner',
    tagline: 'Close and caring, like they are right beside you',
    lines: {
      start: [
        "I'm right here with you today too, so don't worry.",
        "Ready? I've got you, it'll be fine.",
        "Okay, let's go together. Glad to be here with you today.",
      ],
      distance: [
        "{km}km. I'm watching you the whole way.",
        "Already {km}km. You working so hard, it's lovely to see.",
        "{km}km mark. I'm happy we got here together.",
      ],
      time: ["{min} minutes now. Doing okay?", "{min} minutes in. I'm right here, so don't worry."],
      paceUp: ["You sped up, that's impressive.", "Look at you go. I'm proud watching this.", "Great pace. You're really trying hard."],
      paceDown: [
        "It's okay, no need to push. I'm right here.",
        "You must be tired. Slow down if you need, I'll wait.",
        "No rush at all. Whatever pace works for you.",
      ],
      longPause: ["Taking a short break? Don't push yourself, I'll wait.", "You okay? Get some water, rest a moment if you need."],
      midpoint: ["Halfway now. You've really done so well to get here.", "Turnaround point. I'm with you for the rest too, don't worry."],
      nearFinish: ["Almost there now. I'll stay right beside you till the end.", "Finish line's close. I'm watching you push through."],
      finish: ["That was wonderful, running together today.", "You made it. You did so well, go rest now."],
    },
  },
  dog: {
    label: 'Dog',
    tagline: 'Bright and straightforward, in a very dog kind of way',
    lines: {
      start: ["Let's go, woof! Running with you today too!", "Alright, heading out! I'm coming with you, woof!", 'Start! Let\'s go full of energy!'],
      distance: ['{km}km already, amazing woof!', "{km}km now! Keep it up, woof!", '{km}km mark! Going great!'],
      time: ["{min} minutes in! How's it going?", '{min} minutes already! You\'re doing great!'],
      paceUp: ["Ooh, you're fast! Keep it up, woof!", "Nice pace! Getting me excited!", "Sped up, so cool, woof!"],
      paceDown: ["It's okay to go slow!", "Don't push it, I'll stay right here, woof!", "Tired? Slow is fine!"],
      longPause: ['Stopped? Drink some water!', "Taking a break? Don't push yourself!"],
      midpoint: ["Halfway there! Keep it up, woof!", "Turnaround! Let's finish strong together!"],
      nearFinish: ["Almost there! Final push, woof!", "Finish line's close! You've got this!"],
      finish: ["Great job! You ran so well today, woof!", "Finished! So proud of you!"],
    },
  },
  cat: {
    label: 'Cat',
    tagline: 'Independent and unhurried, in a very cat kind of way',
    lines: {
      start: ["Starting, meow. I'll tag along if I feel like it.", "Okay, let's go. I'll be watching, meow.", "Off we go. Don't push yourself, meow."],
      distance: ['{km}km, meow. Not bad, I guess.', "{km}km already? Impressive, meow.", '{km}km mark, meow. Not bad at all.'],
      time: ["{min} minutes in, meow. Not tired, are you?", "{min} minutes already, meow. Say so if you want a break."],
      paceUp: ["Ooh, fast, meow. Color me impressed.", "Nice pace, meow, keep it going.", "Look at you, meow, pretty cool."],
      paceDown: ["No need to push yourself, meow.", "Tired, meow? Slow is fine.", "No rush, meow, do your own thing."],
      longPause: ["Break time, meow? Now I'm getting sleepy too.", "Stopped, meow. Don't push yourself."],
      midpoint: ["Halfway, meow. Not bad so far.", "Turnaround, meow. I'll stick around a bit longer."],
      nearFinish: ["Almost there, meow. You can do it.", "Finish line's close, meow. Go for it."],
      finish: ["Good work, meow~. You did well.", "Finished, meow. So proud, come here for pets."],
    },
  },
};

export function localizePersona(persona: Persona, locale: 'ja' | 'en'): Persona {
  if (locale === 'ja') return persona;
  const t = PERSONA_TRANSLATIONS_EN[persona.id];
  return { ...persona, label: t.label, tagline: t.tagline, lines: t.lines };
}

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

export function formatPaceMinPerKm(paceMinPerKm: number, locale: 'ja' | 'en' = 'ja'): string {
  if (!Number.isFinite(paceMinPerKm) || paceMinPerKm <= 0) return locale === 'en' ? 'measuring' : '計測中';
  const totalSeconds = Math.round(paceMinPerKm * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const ss = s.toString().padStart(2, '0');
  return locale === 'en' ? `${m} min ${ss} sec` : `${m}分${ss}秒`;
}

export function fillTemplate(
  template: string,
  values: { km?: number; paceMinPerKm?: number; min?: number },
  locale: 'ja' | 'en' = 'ja'
): string {
  return template
    .replace('{km}', values.km !== undefined ? values.km.toFixed(1).replace(/\.0$/, '') : '')
    .replace('{pace}', values.paceMinPerKm !== undefined ? formatPaceMinPerKm(values.paceMinPerKm, locale) : '')
    .replace('{min}', values.min !== undefined ? String(values.min) : '');
}
