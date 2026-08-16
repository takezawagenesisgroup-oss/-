import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const craftsmen = [
    {
      name: "佐藤 一郎",
      email: "ichiro@example.com",
      category: "大工",
      skills: "リフォーム, 内装工事, 木工",
      specialty: "戸建てのリフォーム全般が得意です。丁寧な仕事を心がけています。",
      age: 45,
      gender: "MALE" as const,
      area: "東京都・神奈川県",
      hourlyRate: 5000,
      yearsExperience: 20,
      bio: "大工歴20年。個人邸から店舗改装まで幅広く対応可能です。",
      availableDays: "MON,TUE,WED,THU,FRI",
    },
    {
      name: "鈴木 花子",
      email: "hanako@example.com",
      category: "電気工事",
      skills: "配線工事, 照明設置, コンセント増設",
      specialty: "住宅の電気工事、スマートホーム化のご相談も承ります。",
      age: 34,
      gender: "FEMALE" as const,
      area: "東京都",
      hourlyRate: 6000,
      yearsExperience: 10,
      bio: "電気工事士1種保有。安全第一で丁寧な作業をします。",
      availableDays: "SAT,SUN",
    },
    {
      name: "田中 誠",
      email: "makoto@example.com",
      category: "塗装",
      skills: "外壁塗装, 屋根塗装, 防水工事",
      specialty: "外壁・屋根塗装が専門です。高品質な塗料での施工が可能。",
      age: 52,
      gender: "MALE" as const,
      area: "埼玉県・東京都",
      hourlyRate: 4500,
      yearsExperience: 25,
      bio: "塗装一筋25年。見積もりは無料で対応します。",
      availableDays: "MON,TUE,WED,THU,FRI,SAT",
    },
    {
      name: "山本 明美",
      email: "akemi@example.com",
      category: "内装・クロス",
      skills: "クロス張替え, フローリング施工",
      specialty: "壁紙・床材の張替えが得意です。デザイン相談も可能。",
      age: 29,
      gender: "FEMALE" as const,
      area: "千葉県",
      hourlyRate: 4000,
      yearsExperience: 6,
      bio: "内装仕上げ工事全般に対応します。",
      availableDays: "WED,THU,FRI,SAT,SUN",
    },
    {
      name: "小林 健",
      email: "ken@example.com",
      category: "水道・設備",
      skills: "水漏れ修理, キッチン交換, トイレ交換",
      specialty: "水回りのトラブル対応が得意。即日対応可能な場合あり。",
      age: 38,
      gender: "MALE" as const,
      area: "東京都・埼玉県",
      hourlyRate: 5500,
      yearsExperience: 15,
      bio: "水道工事店で15年勤務後、独立しました。",
      availableDays: "MON,TUE,WED,THU,FRI,SAT,SUN",
    },
  ];

  for (const c of craftsmen) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        name: c.name,
        email: c.email,
        passwordHash: password,
        role: "CRAFTSMAN",
      },
    });

    await prisma.craftsmanProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        category: c.category,
        skills: c.skills,
        specialty: c.specialty,
        age: c.age,
        gender: c.gender,
        area: c.area,
        hourlyRate: c.hourlyRate,
        yearsExperience: c.yearsExperience,
        bio: c.bio,
        availableDays: c.availableDays,
        isActive: true,
      },
    });
  }

  await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: {
      name: "顧客 太郎",
      email: "customer@example.com",
      passwordHash: password,
      role: "CUSTOMER",
    },
  });

  console.log("Seed completed. Sample login password for all accounts: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
