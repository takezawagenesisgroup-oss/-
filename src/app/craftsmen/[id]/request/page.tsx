import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RequestForm } from "./RequestForm";

export default async function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=/craftsmen/${id}/request`);
  }
  if (session.user.role !== "CUSTOMER") {
    redirect(`/craftsmen/${id}`);
  }

  const craftsman = await prisma.craftsmanProfile.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!craftsman) notFound();

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link href={`/craftsmen/${id}`} className="text-sm text-neutral-500 hover:text-neutral-800">
        ← {craftsman.user.name}さんのプロフィールに戻る
      </Link>

      <h1 className="mt-4 text-2xl font-bold">{craftsman.user.name}さんに依頼する</h1>
      <p className="mt-1 text-sm text-neutral-500">
        内容と金額を入力して送信すると、職人に依頼が届きます。職人が内容を確認し、受諾するとマッチングが成立します。
      </p>

      <div className="mt-6">
        <RequestForm craftsmanId={craftsman.id} hourlyRate={craftsman.hourlyRate} />
      </div>
    </div>
  );
}
