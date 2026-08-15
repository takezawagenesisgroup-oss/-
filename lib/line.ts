import crypto from "node:crypto";

const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;

export const isLineConfigured = Boolean(CHANNEL_ACCESS_TOKEN && CHANNEL_SECRET);

export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  if (!CHANNEL_SECRET || !signature) return false;
  const hash = crypto
    .createHmac("sha256", CHANNEL_SECRET)
    .update(rawBody)
    .digest("base64");
  return hash === signature;
}

/**
 * 未設定環境（LINE公式アカウント未接続の開発時）ではコンソールに出力するのみとし、
 * 通知ロジック自体は本番と同じコードパスで検証できるようにする。
 */
export async function pushLineMessage(lineUserId: string, text: string): Promise<{ success: boolean; error?: string }> {
  if (!isLineConfigured) {
    console.log(`[LINE:mock] push to ${lineUserId}: ${text}`);
    return { success: true };
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: "text", text }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `LINE API ${res.status}: ${body}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function replyLineMessage(replyToken: string, text: string): Promise<void> {
  if (!isLineConfigured) {
    console.log(`[LINE:mock] reply ${replyToken}: ${text}`);
    return;
  }

  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
}

export function lineAddFriendUrl(): string {
  return process.env.LINE_OFFICIAL_ACCOUNT_URL || "https://line.me/R/ti/p/@your-account-id";
}
