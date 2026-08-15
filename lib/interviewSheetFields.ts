// 実際の紙の面談シート項目が確定するまでの仮項目。
// name をキーに JSON で保存するため、実物の項目リストが届き次第この配列を
// 差し替えるだけでフォーム・保存先ともに対応できる。
export type SheetField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "radio" | "date";
  options?: string[];
  required?: boolean;
};

export const interviewSheetFields: SheetField[] = [
  { name: "finalEducation", label: "最終学歴", type: "text", required: true },
  { name: "workHistory", label: "職歴（会社名・在籍期間）", type: "textarea", required: true },
  { name: "qualifications", label: "保有資格", type: "textarea" },
  { name: "commuteMethod", label: "通勤方法・所要時間", type: "text" },
  {
    name: "employmentStatus",
    label: "現在の就業状況",
    type: "radio",
    options: ["就業中", "離職中"],
    required: true,
  },
  { name: "availableStartDate", label: "就業可能時期", type: "date" },
  { name: "motivation", label: "志望動機", type: "textarea", required: true },
  { name: "selfPr", label: "自己PR", type: "textarea" },
  { name: "questions", label: "会社への質問・確認事項", type: "textarea" },
];
