import { seedListingIndex } from "../src/server/services/listing-index.service.ts";

(async () => {
  const result = await seedListingIndex();
  console.log("LISTING_INDEX_SEEDED=" + result.count);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
