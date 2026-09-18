import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "demo-agency" },
    update: {},
    create: {
      name: "Acme Digital Agency",
      slug: "demo-agency",
      plan: "pro",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "seo@acmedigital.com" },
    update: {},
    create: {
      name: "Alex Sterling (Lead SEO)",
      email: "seo@acmedigital.com",
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      role: "owner",
      canApproveProd: true,
    },
  });

  const project = await prisma.project.create({
    data: {
      name: "Demo Ecommerce Portal",
      domain: "example.com",
      organizationId: org.id,
      connections: {
        create: {
          name: "Staging Static Host (SFTP)",
          adapterType: "static_local",
          publicUrl: "https://example.com",
          allowedRoot: "./storage/site-roots/default",
          credentialRefId: "vault-ref-staging-01",
        },
      },
    },
  });

  console.log("Database seeded successfully with demo organization and project:", project.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
