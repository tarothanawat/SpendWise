const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding categories...');

  const categories = [
    { name: 'Food & Dining' },
    { name: 'Transportation' },
    { name: 'Shopping' },
    { name: 'Entertainment' },
    { name: 'Bills & Utilities' },
    { name: 'Healthcare' },
    { name: 'Travel' },
    { name: 'Education' },
    { name: 'Other' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  console.log('✅ Categories seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
