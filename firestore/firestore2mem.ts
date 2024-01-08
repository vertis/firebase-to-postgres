import { getFirestoreInstance, listCollections } from "./utils";
import * as fs from "fs";
const args = process.argv.slice(2);
let db: any;
let limit = 0;

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

interface BatchResult {
  data: CollectionData[];
  error: any;
}

async function main() {
  db = getFirestoreInstance();
  console.log(listCollections);
  const collections = args[0] ? args[0].split(",") : await listCollections();
  const exportResult = await processExport({
    collections,
    batchSize: 100,
    limit: limit,
  });
  // const stringifiedExport = JSON.stringify(exportResult);
  // const parsedExport = JSON.parse(stringifiedExport);
  // console.log(
  //   "Data structure:",
  //   JSON.stringify(determineDataStructure(parsedExport), null, 2)
  // );
  for (const collection of exportResult) {
    const filePath = `export/${collection.collectionName}.json`;
    fs.writeFileSync(filePath, JSON.stringify(collection.data, null, 2));
    console.log(
      `Collection ${collection.collectionName} written to ${filePath}`
    );
  }
}

main();

async function processExport({
  collections,
  batchSize,
  limit,
}: ProcessExportParams) {
  const result: { collectionName: string; data: CollectionData[] }[] = [];
  for (const collectionName of collections) {
    const collectionData = await getCollection(
      collectionName,
      0,
      batchSize,
      limit
    );
    // const debug = JSON.stringify(collectionData, null, 2);
    // console.log("debug", debug);
    result.push({ collectionName, data: collectionData });
  }
  return result;
}

async function getCollection(
  collectionName: string,
  offset: number,
  batchSize: number,
  limit: number
): Promise<CollectionData[]> {
  const { data, error } = await getBatch(
    collectionName,
    offset,
    batchSize,
    limit
  );
  if (error) {
    console.error("Error fetching batch:", error);
    return [];
  }
  if (data.length === 0) {
    console.log("No more documents to process.");
    return [];
  }
  return data.concat(
    await getCollection(collectionName, offset + data.length, batchSize, limit)
  );
}

async function getBatch(
  collectionName: string,
  offset: number,
  batchSize: number,
  limit: number
): Promise<BatchResult> {
  const data: CollectionData[] = [];
  let error = null;
  try {
    const snapshot = await db
      .collection(collectionName)
      .limit(batchSize)
      .offset(offset)
      .get();
    console.log("Snapshot size:", snapshot.size);
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
      data.push(doc);
    }
  } catch (err) {
    error = err;
  }
  return { data, error };
}

// function determineDataStructure(
//   data: Array<{ collectionName: string; data: CollectionData[] }>
// ): Record<string, any> {
//   const result: Record<string, any> = {};
//   for (const item of data) {
//     if (item.data.length > 0) {
//       result[item.collectionName] = {};
//       const firstItem = item.data[0];
//       for (const key in firstItem) {
//         // if (key.startsWith("_")) continue;
//         if (Array.isArray(firstItem[key])) {
//           result[item.collectionName][key] = firstItem[key].map(
//             (element: any) => {
//               if (element !== null && typeof element === "object") {
//                 return determineDataStructure([
//                   { collectionName: key, data: [element] },
//                 ]);
//               } else {
//                 return typeof element;
//               }
//             }
//           );
//         } else if (
//           firstItem[key] !== null &&
//           typeof firstItem[key] === "object"
//         ) {
//           result[item.collectionName][key] = determineDataStructure([
//             { collectionName: key, data: [firstItem[key]] },
//           ])[key];
//         } else {
//           result[item.collectionName][key] = typeof firstItem[key];
//         }
//       }
//     }
//   }
//   return result;
// }
