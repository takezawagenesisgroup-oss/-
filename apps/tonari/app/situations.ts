export type SituationId = 'walk' | 'commute' | 'training' | 'diet' | 'relax';

export type Situation = {
  id: SituationId;
  label: string;
  lines: string[];
};

// シチュエーションはキャラクターとは独立した「時々混ざる一言」のプール。
// 選んだキャラの声(TTSの声色・ピッチ)で読み上げられる。気配と同じ設計。
export const SITUATIONS: Situation[] = [
  {
    id: 'walk',
    label: '散歩',
    lines: [
      'のんびりでいいよ、景色も楽しんでね。',
      '急がなくて大丈夫、気持ちいい風だね。',
      'たまには足元じゃなく、空を見上げてみて。',
      '散歩日和だね。',
    ],
  },
  {
    id: 'commute',
    label: '通勤・通学',
    lines: [
      '今日も一日頑張ろう。',
      '駅までもう少しだね。',
      'いい一日のスタートになりそうだね。',
      '忘れ物ない?気をつけてね。',
    ],
  },
  {
    id: 'training',
    label: 'トレーニング',
    lines: [
      '追い込みどころだよ。',
      '限界まで、あと少し粘ろう。',
      'フォームも意識していこう。',
      '今日はしっかり追い込めてるね。',
    ],
  },
  {
    id: 'diet',
    label: 'ダイエット',
    lines: [
      '着実に続けてるね、それが一番大事。',
      '焦らず、継続あるのみだよ。',
      '今日も一歩、積み重ねだね。',
      '無理な減量よりコツコツが効くよ。',
    ],
  },
  {
    id: 'relax',
    label: 'リラックス',
    lines: [
      '気分転換になってる?',
      '深呼吸しながら、ゆっくりね。',
      '頭の中も少しスッキリしてきた?',
      'リフレッシュできてるといいな。',
    ],
  },
];

export function getSituation(id: SituationId): Situation {
  const situation = SITUATIONS.find((s) => s.id === id);
  if (!situation) throw new Error(`Unknown situation: ${id}`);
  return situation;
}
