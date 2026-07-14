import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const owner = await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: {},
    create: { email: "owner@example.com", name: "Owner Demo", passwordHash },
  });

  const editor = await prisma.user.upsert({
    where: { email: "editor@example.com" },
    update: {},
    create: { email: "editor@example.com", name: "Editor Demo", passwordHash },
  });

  const viewer = await prisma.user.upsert({
    where: { email: "viewer@example.com" },
    update: {},
    create: { email: "viewer@example.com", name: "Viewer Demo", passwordHash },
  });

  const doc = await prisma.document.create({
    data: {
      title: "Welcome Document",
      ownerId: owner.id,
      members: {
        create: [
          { userId: owner.id, role: "OWNER" },
          { userId: editor.id, role: "EDITOR" },
          { userId: viewer.id, role: "VIEWER" },
        ],
      },
    },
  });

  console.log("Seeded:", { owner: owner.email, editor: editor.email, viewer: viewer.email, documentId: doc.id });
  console.log("All demo accounts use password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
