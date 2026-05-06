/**
 * seed-categories.ts
 * Run: npx tsx prisma/seed-categories.ts
 *
 * Inserts default subcategories for all item types.
 * Safe to run multiple times (upsert on name+type).
 * Cars use type=NEW_CAR because new & used share the same category pool.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CategorySeed = {
  nameEn: string;
  nameAr: string;
  icon: string;
  type: "NEW_CAR" | "PROPERTY" | "HOME_FURNITURE" | "MEDICAL_DEVICE" | "OTHER";
};

const categories: CategorySeed[] = [
  // ─────────────────────────────────────────────
  // CARS — NEW_CAR (shared with used cars)
  // ─────────────────────────────────────────────
  { nameEn: "SUV", nameAr: "دفع رباعي", icon: "FaCar", type: "NEW_CAR" },
  { nameEn: "Sedan", nameAr: "سيدان", icon: "FaCarSide", type: "NEW_CAR" },
  { nameEn: "Hatchback", nameAr: "هاتشباك", icon: "BiCar", type: "NEW_CAR" },
  { nameEn: "Pickup", nameAr: "بيكاب", icon: "FaTruck", type: "NEW_CAR" },
  { nameEn: "Van", nameAr: "فان / ميني باص", icon: "FaBus", type: "NEW_CAR" },
  {
    nameEn: "Coupe",
    nameAr: "كوبيه",
    icon: "MdDirectionsCar",
    type: "NEW_CAR",
  },
  {
    nameEn: "Convertible",
    nameAr: "مكشوفة",
    icon: "GiSteeringWheel",
    type: "NEW_CAR",
  },
  { nameEn: "Luxury", nameAr: "فارهة", icon: "GiCrown", type: "NEW_CAR" },
  { nameEn: "Sport", nameAr: "رياضية", icon: "MdSpeed", type: "NEW_CAR" },
  { nameEn: "Electric", nameAr: "كهربائية", icon: "FaBolt", type: "NEW_CAR" },
  { nameEn: "Hybrid", nameAr: "هجينة", icon: "GiElectric", type: "NEW_CAR" },
  {
    nameEn: "Commercial",
    nameAr: "تجاري / شاحنة",
    icon: "FaTruckMoving",
    type: "NEW_CAR",
  },

  // ─────────────────────────────────────────────
  // PROPERTY
  // ─────────────────────────────────────────────
  { nameEn: "Apartment", nameAr: "شقة", icon: "FaBuilding", type: "PROPERTY" },
  { nameEn: "Villa", nameAr: "فيلا", icon: "FaHome", type: "PROPERTY" },
  { nameEn: "House", nameAr: "منزل", icon: "BsHouseFill", type: "PROPERTY" },
  {
    nameEn: "Studio",
    nameAr: "استوديو",
    icon: "MdSingleBed",
    type: "PROPERTY",
  },
  {
    nameEn: "Office",
    nameAr: "مكتب تجاري",
    icon: "FaBriefcase",
    type: "PROPERTY",
  },
  { nameEn: "Shop", nameAr: "محل تجاري", icon: "BsShop", type: "PROPERTY" },
  { nameEn: "Land", nameAr: "أرض", icon: "GiMountains", type: "PROPERTY" },
  { nameEn: "Farm", nameAr: "مزرعة", icon: "GiFarmTractor", type: "PROPERTY" },
  {
    nameEn: "Chalet",
    nameAr: "شاليه",
    icon: "FaUmbrellaBeach",
    type: "PROPERTY",
  },
  {
    nameEn: "Warehouse",
    nameAr: "مستودع",
    icon: "FaWarehouse",
    type: "PROPERTY",
  },
  {
    nameEn: "Dormitory",
    nameAr: "سكن طلابي",
    icon: "FaDoorOpen",
    type: "PROPERTY",
  },

  // ─────────────────────────────────────────────
  // HOME FURNITURE
  // ─────────────────────────────────────────────
  {
    nameEn: "Living Room",
    nameAr: "أثاث غرفة معيشة",
    icon: "MdWeekend",
    type: "HOME_FURNITURE",
  },
  {
    nameEn: "Bedroom",
    nameAr: "أثاث غرفة نوم",
    icon: "FaBed",
    type: "HOME_FURNITURE",
  },
  {
    nameEn: "Kitchen",
    nameAr: "أثاث مطبخ",
    icon: "MdKitchen",
    type: "HOME_FURNITURE",
  },
  {
    nameEn: "Dining Room",
    nameAr: "أثاث غرفة طعام",
    icon: "GiChair",
    type: "HOME_FURNITURE",
  },
  {
    nameEn: "Office Desk",
    nameAr: "أثاث مكتبي",
    icon: "FaDesktop",
    type: "HOME_FURNITURE",
  },
  {
    nameEn: "Bathroom",
    nameAr: "أثاث حمام",
    icon: "FaBath",
    type: "HOME_FURNITURE",
  },
  {
    nameEn: "Outdoor",
    nameAr: "أثاث خارجي",
    icon: "GiGardenChair",
    type: "HOME_FURNITURE",
  },
  {
    nameEn: "Lighting",
    nameAr: "إضاءة",
    icon: "FaLightbulb",
    type: "HOME_FURNITURE",
  },
  {
    nameEn: "Rugs & Curtains",
    nameAr: "سجاد وستائر",
    icon: "GiCarpetBombing",
    type: "HOME_FURNITURE",
  },
  {
    nameEn: "Appliances",
    nameAr: "أجهزة منزلية",
    icon: "MdOutlineBlender",
    type: "HOME_FURNITURE",
  },
  {
    nameEn: "Storage",
    nameAr: "تخزين وأدراج",
    icon: "BsBoxSeam",
    type: "HOME_FURNITURE",
  },

  // ─────────────────────────────────────────────
  // MEDICAL DEVICE
  // ─────────────────────────────────────────────
  {
    nameEn: "Diagnostic",
    nameAr: "أجهزة تشخيص",
    icon: "FaStethoscope",
    type: "MEDICAL_DEVICE",
  },
  {
    nameEn: "Monitoring",
    nameAr: "أجهزة مراقبة",
    icon: "FaHeartbeat",
    type: "MEDICAL_DEVICE",
  },
  {
    nameEn: "Mobility Aid",
    nameAr: "أجهزة حركة وإعاقة",
    icon: "FaWheelchair",
    type: "MEDICAL_DEVICE",
  },
  {
    nameEn: "Dental",
    nameAr: "أجهزة أسنان",
    icon: "FaTooth",
    type: "MEDICAL_DEVICE",
  },
  {
    nameEn: "Optical",
    nameAr: "بصريات",
    icon: "FaGlasses",
    type: "MEDICAL_DEVICE",
  },
  {
    nameEn: "Laboratory",
    nameAr: "أجهزة مخبرية",
    icon: "FaFlask",
    type: "MEDICAL_DEVICE",
  },
  {
    nameEn: "Therapy",
    nameAr: "أجهزة علاجية",
    icon: "FaHospital",
    type: "MEDICAL_DEVICE",
  },
  {
    nameEn: "Surgical",
    nameAr: "أدوات جراحية",
    icon: "FaSyringe",
    type: "MEDICAL_DEVICE",
  },
  {
    nameEn: "Baby & Maternal",
    nameAr: "أدوات أمومة وطفولة",
    icon: "FaBabyCarriage",
    type: "MEDICAL_DEVICE",
  },
  {
    nameEn: "Imaging",
    nameAr: "أجهزة تصوير طبي",
    icon: "MdOutlineBiotech",
    type: "MEDICAL_DEVICE",
  },

  // ─────────────────────────────────────────────
  // OTHER
  // ─────────────────────────────────────────────
  {
    nameEn: "Electronics",
    nameAr: "إلكترونيات",
    icon: "FaMobileAlt",
    type: "OTHER",
  },
  {
    nameEn: "Clothing",
    nameAr: "ملابس وأزياء",
    icon: "GiClothes",
    type: "OTHER",
  },
  { nameEn: "Books", nameAr: "كتب وقرطاسية", icon: "FaBook", type: "OTHER" },
  { nameEn: "Sports", nameAr: "رياضة ولياقة", icon: "FaFutbol", type: "OTHER" },
  { nameEn: "Toys", nameAr: "ألعاب أطفال", icon: "FaGamepad", type: "OTHER" },
  { nameEn: "Tools", nameAr: "أدوات وعدد", icon: "FaTools", type: "OTHER" },
  {
    nameEn: "Food & Drinks",
    nameAr: "طعام ومشروبات",
    icon: "FaUtensils",
    type: "OTHER",
  },
  { nameEn: "Pets", nameAr: "حيوانات أليفة", icon: "FaPaw", type: "OTHER" },
  {
    nameEn: "Jewelry",
    nameAr: "مجوهرات وإكسسوار",
    icon: "GiDiamondRing",
    type: "OTHER",
  },
  {
    nameEn: "Photography",
    nameAr: "تصوير ومعدات",
    icon: "FaCamera",
    type: "OTHER",
  },
  {
    nameEn: "Collectibles",
    nameAr: "مقتنيات نادرة",
    icon: "FaStar",
    type: "OTHER",
  },
  {
    nameEn: "Musical Instruments",
    nameAr: "آلات موسيقية",
    icon: "FaMusic",
    type: "OTHER",
  },
];

async function main() {
  console.log(`Seeding ${categories.length} categories...`);

  let created = 0;
  let skipped = 0;

  for (const cat of categories) {
    const result = await prisma.category.upsert({
      where: { name_type: { name: cat.nameEn, type: cat.type } },
      update: {
        nameAr: cat.nameAr,
        nameEn: cat.nameEn,
        icon: cat.icon,
      },
      create: {
        name: cat.nameEn,
        nameEn: cat.nameEn,
        nameAr: cat.nameAr,
        icon: cat.icon,
        type: cat.type,
        isDeleted: false,
      },
    });

    if (result) {
      created++;
      console.log(`  ✓ [${cat.type}] ${cat.nameEn} / ${cat.nameAr}`);
    } else {
      skipped++;
    }
  }

  console.log(`\nDone. ${created} categories upserted, ${skipped} skipped.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
