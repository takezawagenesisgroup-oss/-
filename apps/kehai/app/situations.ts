export type SituationId = 'study' | 'work' | 'reading' | 'chores' | 'bedtime' | 'free';

export type Situation = {
  id: SituationId;
  label: string;
  lines: string[];
};

// シチュエーションはキャラクターとは独立した「時々混ざる一言」のプール。
// 選んだキャラの声(TTSの声色・ピッチ)で読み上げられる。
export const SITUATIONS: Situation[] = [
  {
    id: 'study',
    label: '勉強中',
    lines: [
      'そろそろ休憩挟んでもいいかもね。',
      '教科書から少し目を離して、遠くを見てみて。',
      '根詰めすぎず、休み休みね。',
      '眠くなってきてない?',
    ],
  },
  {
    id: 'work',
    label: '作業中',
    lines: [
      '肩の力、抜いていこう。',
      'そろそろ一区切りつけてもいいかも。',
      '水分補給、忘れずにね。',
      '根詰めすぎ注意、たまに伸びしてね。',
    ],
  },
  {
    id: 'reading',
    label: '読書中',
    lines: [
      '目、疲れてない?たまに遠くを見てね。',
      'キリのいいところで一息つこう。',
      '姿勢、崩れてない?',
      '夢中になってるね、その調子。',
    ],
  },
  {
    id: 'chores',
    label: '家事中',
    lines: [
      '無理しすぎないでね。',
      '水分とった?忘れずにね。',
      '手を止めて、少し伸びしてもいいかも。',
      '頑張ってるね、えらいよ。',
    ],
  },
  {
    id: 'bedtime',
    label: '就寝前',
    lines: [
      'そろそろ電気、落としてもいいかもね。',
      '画面の明るさ、少し落とすと眠りやすいよ。',
      '今日も一日おつかれさま。',
      'ゆっくり深呼吸してみて。',
    ],
  },
  {
    id: 'free',
    label: 'フリータイム',
    lines: [
      'ゆっくり過ごせてる?',
      'たまにはのんびりするのも大事だよ。',
      '無理せず、好きなように過ごしてね。',
      'リラックスできてる?',
    ],
  },
];

export function getSituation(id: SituationId): Situation {
  const situation = SITUATIONS.find((s) => s.id === id);
  if (!situation) throw new Error(`Unknown situation: ${id}`);
  return situation;
}
