import * as fs from "fs";
import { uniqBy } from "ramda";

async function main() {
  const filename = process.argv[2];
  if (!filename) {
    console.error("Please provide a filename");
    process.exit(1);
  }

  try {
    const rawData = fs.readFileSync(filename, "utf8");
    const data = JSON.parse(rawData);
    const dedupedData = uniqBy((item: any) => item.firestore_id, data);
    fs.writeFileSync(filename, JSON.stringify(dedupedData, null, 2));
    console.log(`Deduped data saved to ${filename}`);
  } catch (error) {
    console.error("Error processing file:", error);
    process.exit(1);
  }
}

main();
