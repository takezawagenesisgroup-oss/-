export type TriggerType = 'start' | 'cheer' | 'care' | 'finish';
export type ToneId = 'seiso' | 'gal' | 'kouhai' | 'onee';

export type Persona = {
  id: ToneId;
  label: string;
  tagline: string;
  free: boolean;
  lines: Record<TriggerType, string[]>;
};

// 4種類とも「応援・気遣い」の内容は共通で、口調(語尾・言葉選び)だけが違う。
// 恋愛的・扇情的な表現は含めない。
export const PERSONAS: Persona[] = [
  {
    id: 'seiso',
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
];

export const UNLOCK_PRICE_JPY = 480;

export function getPersona(id: ToneId): Persona {
  const persona = PERSONAS.find((p) => p.id === id);
  if (!persona) throw new Error(`Unknown persona: ${id}`);
  return persona;
}

// 直前に使ったインデックスを避けて選ぶ。候補が2つ以上あるときだけ重複を避ける。
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
