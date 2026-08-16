import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./ProfileForm";

export default async function ProfileEditPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "CRAFTSMAN") {
    redirect("/craftsmen");
  }

  const profile = await prisma.craftsmanProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    redirect("/craftsmen");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">職人プロフィール編集</h1>
      <p className="mt-1 text-sm text-neutral-500">
        プロフィールを充実させるほど、お客様からの依頼が届きやすくなります。公開するには「プロフィールを公開する」をONにしてください。
      </p>

      <div className="mt-6">
        <ProfileForm
          initial={{
            category: profile.category,
            skills: profile.skills,
            specialty: profile.specialty,
            age: profile.age,
            gender: profile.gender,
            area: profile.area,
            hourlyRate: profile.hourlyRate,
            yearsExperience: profile.yearsExperience,
            bio: profile.bio,
            availableDays: profile.availableDays ? profile.availableDays.split(",").filter(Boolean) : [],
            isActive: profile.isActive,
          }}
        />
      </div>
    </div>
  );
}
