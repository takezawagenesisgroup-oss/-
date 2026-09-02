export type TriggerType = 'start' | 'cheer' | 'care' | 'finish';
export type ToneId = 'seiso' | 'gal' | 'kouhai' | 'onee' | 'sawayaka' | 'aniki' | 'shibumi' | 'neko' | 'inu';
export type PersonaCategory = 'female' | 'male' | 'animal';

export type Persona = {
  id: ToneId;
  category: PersonaCategory;
  label: string;
  tagline: string;
  free: boolean;
  lines: Record<TriggerType, string[]>;
};

export const CATEGORY_LABEL: Record<PersonaCategory, string> = {
  female: '女友達',
  male: '男友達',
  animal: 'どうぶつ',
};

// 全キャラとも「応援・気遣い」の内容は共通で、口調(語尾・言葉選び・年齢感)
// だけが違う。恋愛的・扇情的な表現は含めない。
export const PERSONAS: Persona[] = [
  {
    id: 'seiso',
    category: 'female',
    label: '清楚系',
    tagline: '丁寧で穏やかな、落ち着いた口調',
    free: true,
    lines: {
      start: [
        'それでは始めましょうか。今日もそばにいますので、安心してくださいね。',
        '始めますね。ゆっくり、あなたのペースで大丈夫ですよ。',
        '今日もよろしくお願いします。無理のない範囲で始めましょう。',
      ],
      cheer: [
        'とても集中されていますね。その調子です。',
        '頑張っていらっしゃる姿、素敵だと思います。',
        '順調のようで、なによりです。',
        'その真剣な様子、応援しています。',
      ],
      care: [
        '少し休憩なさってはいかがですか。',
        'お水は飲まれましたか。忘れずにお願いしますね。',
        '根を詰めすぎていませんか。無理はなさらないでくださいね。',
        '姿勢が崩れていませんか。少し伸びをしてみてください。',
      ],
      finish: [
        'お疲れさまでした。今日もよく頑張られましたね。',
        '終了です。ゆっくり休んでくださいね、お疲れさまでした。',
      ],
    },
  },
  {
    id: 'gal',
    category: 'female',
    label: 'ギャル系',
    tagline: 'テンション高めで元気いっぱいな口調',
    free: false,
    lines: {
      start: [
        'おっけー、始めるよ〜!今日もいい感じでいこ!',
        'よっしゃ、スタート!隣にいるから安心してね〜',
        'はいスタート!一緒にがんばろ!',
      ],
      cheer: [
        'その調子その調子!めっちゃいい感じじゃん!',
        'がんばってるね〜、えらすぎ!',
        'いいねいいね、その集中力!',
        'なんか今日ノリいいじゃん、その調子!',
      ],
      care: [
        'ちょっと休憩する?根詰めすぎもよくないよ〜',
        '水分とった?忘れずにね!',
        '疲れてない?無理しないでね〜',
        '肩とか凝ってない?たまに伸びしてね!',
      ],
      finish: [
        '終了〜!今日もお疲れさま、よくがんばったじゃん!',
        'はい終わり!めっちゃがんばってたね、えらい!',
      ],
    },
  },
  {
    id: 'kouhai',
    category: 'female',
    label: '後輩系',
    tagline: '元気で応援上手な、若々しい口調',
    free: false,
    lines: {
      start: [
        'よし、始めましょう!自分も隣で応援してます!',
        'スタートですね!今日も一緒にがんばりましょう!',
        '始めましょうか!自分もついてますよ!',
      ],
      cheer: [
        'すごい集中力です!見習いたいです!',
        'その調子です、応援してます!',
        '頑張ってる姿、かっこいいです!',
        'いい感じですね!自分も元気もらってます!',
      ],
      care: [
        'そろそろ休憩どうですか?無理しないでくださいね。',
        '水分補給、大丈夫ですか?',
        '疲れてないですか?根詰めすぎ注意です!',
        'たまには伸びしましょう、体固まっちゃいますよ。',
      ],
      finish: [
        'お疲れさまでした!めちゃくちゃ頑張ってましたね!',
        '終了です!今日もほんとお疲れさまでした!',
      ],
    },
  },
  {
    id: 'onee',
    category: 'female',
    label: 'お姉さん系',
    tagline: '落ち着いて包み込むような、大人の口調',
    free: false,
    lines: {
      start: [
        '始めましょうか。ゆっくり、隣で見ていますからね。',
        'さあ、始めますよ。焦らなくて大丈夫、あなたのペースで。',
        '始めましょう。今日も隣にいるから、安心して。',
      ],
      cheer: [
        '落ち着いて取り組めているわね。その調子。',
        '頑張っているのね、ちゃんと見ているわよ。',
        'いいペースじゃない。無理せず続けましょう。',
        '集中できているみたいね、偉いわ。',
      ],
      care: [
        'そろそろ肩の力抜きなさいな。休憩も大事よ。',
        '水分、ちゃんと摂ってる?忘れないでね。',
        '無理しすぎないで。疲れたら休んでいいのよ。',
        'たまには伸びをして、体をほぐしなさい。',
      ],
      finish: [
        'お疲れさま。今日もよく頑張ったわね。',
        '終わりの時間ね。ゆっくり休んで、お疲れさま。',
      ],
    },
  },
  {
    id: 'sawayaka',
    category: 'male',
    label: '爽やか系',
    tagline: '同世代の友人のような、軽やかな口調',
    free: false,
    lines: {
      start: [
        'よし、始めるか。俺もそばにいるから。',
        '始めよう。一緒に頑張ろうぜ。',
        'さ、やるか。応援してるよ。',
      ],
      cheer: [
        'お、いい感じじゃん。その調子。',
        '集中してるな、えらいって。',
        '順調そうだな、その調子でいこう。',
        'いいペースだな、頑張ってるじゃん。',
      ],
      care: [
        'ちょっと休憩挟めよ、根詰めすぎ注意な。',
        '水分摂った?忘れんなよ。',
        '疲れてない?無理すんなよ。',
        'たまには伸びしろよ、体固まるぞ。',
      ],
      finish: [
        'お疲れ、今日もよく頑張ったな。',
        '終了、ほんと偉いよ、お疲れさま。',
      ],
    },
  },
  {
    id: 'aniki',
    category: 'male',
    label: '兄貴系',
    tagline: '頼れる先輩のような、面倒見のいい口調',
    free: false,
    lines: {
      start: [
        'よし、始めるぞ。俺がついてる、安心しろ。',
        '始めよう。今日も一緒に頑張るからな。',
        'さあ始めるか。無理せずいこうぜ。',
      ],
      cheer: [
        'いいぞ、その調子だ。',
        '頑張ってるな、見てて安心する。',
        '順調じゃないか、その調子で。',
        '集中できてるな、さすがだ。',
      ],
      care: [
        'そろそろ休憩しろよ。無理は禁物だ。',
        '水分、ちゃんと摂れよ。',
        '疲れたら無理すんな、休んでいいんだぞ。',
        '肩とか固まってないか、伸びとけよ。',
      ],
      finish: [
        'お疲れ。今日もよく頑張ったな、偉いぞ。',
        '終わりだ。お疲れさま、ゆっくり休め。',
      ],
    },
  },
  {
    id: 'shibumi',
    category: 'male',
    label: '渋め系',
    tagline: '落ち着いた大人の男性の、静かな口調',
    free: false,
    lines: {
      start: [
        '始めるか。じっくりいこう、隣にいるから。',
        'さて、始めよう。焦らず自分のペースでな。',
        '始めるぞ。今日も付き合うよ。',
      ],
      cheer: [
        '落ち着いて取り組めてるな。',
        'いいペースだ、無理せず続けろ。',
        '集中してるな、悪くない。',
        'その調子だ、じっくりいこう。',
      ],
      care: [
        'そろそろ一息入れるか。',
        '水は飲んだか。忘れずにな。',
        '無理はするなよ、疲れたら休め。',
        'たまには体をほぐしとけ。',
      ],
      finish: [
        'お疲れさん。今日もよくやった。',
        '終わりだな。お疲れさん、ゆっくりしろ。',
      ],
    },
  },
  {
    id: 'neko',
    category: 'animal',
    label: '猫',
    tagline: '気まぐれで甘えん坊な、猫らしい口調',
    free: false,
    lines: {
      start: [
        'はじめるにゃ〜。ボクもそばにいてあげるにゃ。',
        'よし始めるにゃ。見ててあげるから頑張るにゃ。',
        'さ、スタートにゃ。応援するにゃ〜。',
      ],
      cheer: [
        'おお、いい感じにゃ!その調子にゃ〜。',
        'がんばってるにゃね、えらいにゃ。',
        '順調そうにゃ、その調子にゃ。',
        '集中してるにゃ、かっこいいにゃ。',
      ],
      care: [
        'ちょっと休憩するにゃ?無理しちゃだめにゃ。',
        '水飲んだにゃ?忘れずににゃ。',
        '疲れてないにゃ?無理しないでにゃ。',
        'たまには伸びするにゃ〜、ボクもよくやるにゃ。',
      ],
      finish: [
        'おつかれにゃ〜。今日もよく頑張ったにゃ。',
        '終わりにゃ。えらかったにゃ、なでなでしたいにゃ。',
      ],
    },
  },
  {
    id: 'inu',
    category: 'animal',
    label: '犬',
    tagline: '元気でまっすぐな、犬らしい口調',
    free: false,
    lines: {
      start: [
        'はじめるわん!ボクもそばにいるよ!',
        'よし始めよう!一緒に頑張るわん!',
        'さあスタート!応援してるわん!',
      ],
      cheer: [
        'おお、いい感じ!その調子だわん!',
        'がんばってるね、えらいわん!',
        '順調だね、その調子!',
        '集中してるね、かっこいいわん!',
      ],
      care: [
        'そろそろ休憩する?無理しないでね。',
        '水分とった?忘れずにね!',
        '疲れてない?無理は禁物だわん。',
        'たまには伸びしよう、体固まっちゃうよ!',
      ],
      finish: [
        'おつかれさま!今日もよく頑張ったわん!',
        '終わり!えらかったね、なでてあげたいわん!',
      ],
    },
  },
];

export const CATEGORIES: PersonaCategory[] = ['female', 'male', 'animal'];

export function personasByCategory(category: PersonaCategory): Persona[] {
  return PERSONAS.filter((p) => p.category === category);
}

export const UNLOCK_PRICE_JPY = 480;

export function getPersona(id: ToneId): Persona {
  const persona = PERSONAS.find((p) => p.id === id);
  if (!persona) throw new Error(`Unknown persona: ${id}`);
  return persona;
}

// 直前に使ったインデックスを避けて選ぶ。候補が2つ以上あるときだけ重複を避ける。
export function pickLineAvoidingRepeat(
  candidates: string[],
  lastIndex: number | undefined,
  rand: () => number = Math.random
): { text: string; index: number } {
  if (candidates.length <= 1) return { text: candidates[0], index: 0 };
  let index = Math.floor(rand() * candidates.length);
  if (index === lastIndex) {
    index = (index + 1 + Math.floor(rand() * (candidates.length - 1))) % candidates.length;
  }
  return { text: candidates[index], index };
}
