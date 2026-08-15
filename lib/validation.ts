import { z } from "zod";

export const basicInfoSchema = z.object({
  name: z.string().min(1, "氏名を入力してください").max(100),
  nameKana: z.string().max(100).optional().or(z.literal("")),
  email: z.string().email("メールアドレスの形式が正しくありません"),
  phone: z
    .string()
    .min(10, "電話番号を入力してください")
    .max(20)
    .regex(/^[0-9-]+$/, "電話番号は数字とハイフンのみで入力してください"),
  birthDate: z.string().optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  desiredPosition: z.string().max(100).optional().or(z.literal("")),
  source: z.string().max(100).optional().or(z.literal("")),
});

export type BasicInfoInput = z.infer<typeof basicInfoSchema>;

export const slotSchema = z.object({
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  capacity: z.number().int().min(1).max(20).default(1),
  note: z.string().max(200).optional().or(z.literal("")),
});

export const appointmentSchema = z.object({
  applicantId: z.string().min(1),
  slotId: z.string().min(1),
});

// 実物の面談シート項目が届くまでの仮項目。
// answers は自由な JSON として保存するため、フロント側の項目追加だけで拡張できる。
export const interviewSheetSchema = z.object({
  applicantId: z.string().min(1),
  answers: z.record(z.string(), z.any()),
});
