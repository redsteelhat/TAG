import { ExpenseType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const systemCategories = [
  {
    id: 'cat_hgs',
    name: 'HGS',
    expense_type: ExpenseType.VARIABLE
  },
  {
    id: 'cat_otopark',
    name: 'Otopark',
    expense_type: ExpenseType.VARIABLE
  },
  {
    id: 'cat_ceza',
    name: 'Ceza',
    expense_type: ExpenseType.VARIABLE
  },
  {
    id: 'cat_yikama',
    name: 'Yikama',
    expense_type: ExpenseType.OPERATIONAL
  },
  {
    id: 'cat_yakit',
    name: 'Yakit',
    expense_type: ExpenseType.VARIABLE
  },
  {
    id: 'cat_paket',
    name: 'Paket / Kullanim Bedeli',
    expense_type: ExpenseType.PLATFORM_PACKAGE
  },
  {
    id: 'cat_periyodik_bakim',
    name: 'Periyodik Bakim',
    expense_type: ExpenseType.SEMI_VARIABLE
  },
  {
    id: 'cat_mekanik',
    name: 'Mekanik',
    expense_type: ExpenseType.SEMI_VARIABLE
  },
  {
    id: 'cat_elektrik',
    name: 'Elektrik',
    expense_type: ExpenseType.SEMI_VARIABLE
  },
  {
    id: 'cat_lastik',
    name: 'Lastik',
    expense_type: ExpenseType.SEMI_VARIABLE
  },
  {
    id: 'cat_klima',
    name: 'Klima',
    expense_type: ExpenseType.SEMI_VARIABLE
  },
  {
    id: 'cat_kaporta',
    name: 'Kaporta',
    expense_type: ExpenseType.SEMI_VARIABLE
  },
  {
    id: 'cat_temizlik',
    name: 'Temizlik',
    expense_type: ExpenseType.OPERATIONAL
  },
  {
    id: 'cat_trafik_sigortasi',
    name: 'Trafik Sigortasi',
    expense_type: ExpenseType.FIXED
  },
  {
    id: 'cat_kasko',
    name: 'Kasko',
    expense_type: ExpenseType.FIXED
  },
  {
    id: 'cat_mtv',
    name: 'MTV',
    expense_type: ExpenseType.FIXED
  },
  {
    id: 'cat_muayene',
    name: 'Muayene',
    expense_type: ExpenseType.FIXED
  },
  {
    id: 'cat_egzoz_muayene',
    name: 'Egzoz Muayene',
    expense_type: ExpenseType.FIXED
  },
  {
    id: 'cat_arac_kredisi',
    name: 'Arac Kredisi',
    expense_type: ExpenseType.FINANCING
  },
  {
    id: 'cat_otopark_aboneligi',
    name: 'Otopark Aboneligi',
    expense_type: ExpenseType.FIXED
  },
  {
    id: 'cat_telefon',
    name: 'Telefon Hatti',
    expense_type: ExpenseType.OPERATIONAL
  },
  {
    id: 'cat_internet',
    name: 'Internet Paketi',
    expense_type: ExpenseType.OPERATIONAL
  },
  {
    id: 'cat_diger',
    name: 'Diger',
    expense_type: ExpenseType.VARIABLE
  }
];

async function main() {
  for (const category of systemCategories) {
    await prisma.category.upsert({
      where: {
        id: category.id
      },
      create: {
        ...category,
        is_system: true,
        is_active: true
      },
      update: {
        name: category.name,
        expense_type: category.expense_type,
        is_system: true,
        is_active: true
      }
    });
  }

  console.log(`Seeded ${systemCategories.length} system categories.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

