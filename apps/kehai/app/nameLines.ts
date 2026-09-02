import type { ToneId } from './personas';

// 「名前で呼んでもらう」機能(プレミアム)用の追加セリフ。{name}部分を
// ユーザー設定のニックネームに置き換えて読み上げる。既存の応援(cheer)セリフの
// プールに、ニックネームが設定されていてプレミアム機能が解放されている場合のみ
// 一定確率で混ぜて抽選する(useVoiceCompanion.ts参照)。口調ごとの語尾・言葉選びは
// personas.tsの通常セリフと揃えてある。
export const NAME_CHEER_LINES: Record<ToneId, string[]> = {
  seiso: ['{name}さん、とても頑張っていらっしゃいますね。その調子です。', '{name}さん、その真剣な様子、応援しています。'],
  gal: ['ねぇねぇ{name}、めっちゃいい感じじゃん!その調子!', '{name}、がんばってるね〜、えらすぎ!'],
  kouhai: ['{name}さん、すごい集中力です!見習いたいです!', '{name}さん、その調子です、応援してます!'],
  onee: ['{name}、落ち着いて取り組めているわね。その調子。', '{name}、頑張っているのね、ちゃんと見ているわよ。'],
  sawayaka: ['{name}、お、いい感じじゃん。その調子。', '{name}、集中してるな、えらいって。'],
  aniki: ['{name}、いいぞ、その調子だ。', '{name}、頑張ってるな、見てて安心する。'],
  shibumi: ['{name}、落ち着いて取り組めてるな。', '{name}、いいペースだ、無理せず続けろ。'],
  neko: ['ねぇねぇ{name}、いい感じにゃ!その調子にゃ〜。', '{name}、がんばってるにゃね、えらいにゃ。'],
  inu: ['ねぇねぇ{name}、もうちょっとだよ!頑張ってみようわん!', '{name}、その調子だわん!かっこいいわん!'],
};

export function fillName(template: string, name: string): string {
  return template.replace(/\{name\}/g, name);
}
