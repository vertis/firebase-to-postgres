import { getFirestoreInstance, listCollections } from "./utils";
import Redis from "ioredis";
const args = process.argv.slice(2);
let db: any;
let limit = 0;
let redis = new Redis();

type CollectionData = {
  [subcollectionId: string]: any[];
  firestore_id?: string;
  firestoreid?: string;
  original_id?: string;
  originalid?: string;
};

interface ProcessExportParams {
  collections: string[];
  batchSize: number;
  limit: number;
}

async function main() {
  db = getFirestoreInstance();
  console.log(listCollections);
  const collections = args[0] ? args[0].split(",") : await listCollections();
  await processExport({
    collections,
    batchSize: 100,
    limit: limit,
  });
  console.log("All collections are done.");
  redis.disconnect();
}

main();
async function processExport({
  collections,
  batchSize,
  limit,
}: ProcessExportParams) {
  for (const collectionName of collections) {
    console.log(`Exporting ${collectionName}...`);
    await getCollection(collectionName, 0, batchSize, limit);
    console.log(`Exporting ${collectionName} done.`);
  }
}

async function getCollection(
  collectionName: string,
  offset: number,
  batchSize: number,
  limit: number
) {
  const dataLength = await getBatch(collectionName, offset, batchSize, limit);
  if (dataLength === 0) {
    console.log("No more documents to process.");
    return;
  }
  await getCollection(collectionName, offset + dataLength, batchSize, limit);
}

async function getBatch(
  collectionName: string,
  offset: number,
  batchSize: number
): Promise<number> {
  let error = null;
  try {
    const snapshot = await db
      .collection(collectionName)
      .limit(batchSize)
      .offset(offset)
      .get();
    console.log("Snapshot size:", snapshot.size);
    const dataLength = snapshot.docs.length;
    for (const fsdoc of snapshot.docs) {
      let doc: CollectionData = fsdoc.data();
      const subcollections = await fsdoc.ref.listCollections();
      const subcollectionNames = subcollections.map((subcol: any) => subcol.id);
      for (const subcollection of subcollections) {
        const subcollectionData = await subcollection.get();
        doc[subcollection.id] = subcollectionData.docs.map((doc: any) =>
          doc.data()
        );
      }
      if (!doc.firestore_id) doc.firestore_id = fsdoc.id;
      else if (!doc.firestoreid) doc.firestoreid = fsdoc.id;
      else if (!doc.original_id) doc.original_id = fsdoc.id;
      else if (!doc.originalid) doc.originalid = fsdoc.id;
      const redisKey = `export:${collectionName}:${fsdoc.id}`;
      await redis.set(redisKey, JSON.stringify(doc));
    }
    return dataLength;
  } catch (err) {
    error = err;
  }
  return 0;
}
