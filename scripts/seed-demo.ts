/**
 * npm run seed:demo — fills the shop with clearly-labelled DEMO products so
 * you can try the storefront, basket and admin before connecting CJ.
 * (Also available as a button in /admin/products while in test mode.)
 */
import "./_env";
import { seedDemoProducts } from "@/lib/demo";
import { db } from "@/lib/db";

seedDemoProducts({ force: process.argv.includes("--force") })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
