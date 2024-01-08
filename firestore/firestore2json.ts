import {
  getFirestoreInstance,
  cleanUp,
  writeRecord,
  listCollections,
} from "./utils";
import * as fs from "fs";
const args = process.argv.slice(2);

let db;

const recordCounters = {};
let limit = 0;

async function main() {
  db = getFirestoreInstance();
  console.log(listCollections);
  const collections = args[0] ? args[0].split(",") : await listCollections();
  processExport({ collections, batchSize: 1000, limit: limit });
}
main();

async function processExport({
  collections,
  batchSize,
  limit,
}: {
  collections: string[];
  batchSize: number;
  limit: number;
}) {
  for (const collectionName of collections) {
    await getCollection(collectionName, 0, batchSize, limit);
  }
}

async function getCollection(
  collectionName: string,
  offset: number,
  batchSize: number,
  limit: number
) {
  const { data, error } = await getBatch(
    collectionName,
    offset,
    batchSize,
    limit
  );
  if (error) {
    console.error("Error fetching batch:", error);
    return;
  }
  if (data.length === 0) {
    console.log("No more documents to process.");
    return;
  }
  if (data.length > 0) {
    await getCollection(collectionName, offset + data.length, batchSize, limit);
  } else {
    cleanUp(recordCounters);
    for (let key in recordCounters) {
      console.log(`${recordCounters[key]} records written to ${key}.json`);
    }
  }
}

async function getBatch(
  collectionName: string,
  offset: number,
  batchSize: number,
  limit: number
): Promise<{ data: any[]; error: any }> {
  const data = [];
  let error = null;
  if (recordCounters[collectionName] >= limit) {
    return { data, error };
  }
  if (typeof recordCounters[collectionName] === "undefined") {
    recordCounters[collectionName] = 0;
  }
  if (limit > 0) {
    batchSize = Math.min(batchSize, limit - recordCounters[collectionName]);
  }
  try {
    const snapshot = await db
      .collection(collectionName)
      .limit(batchSize)
      .offset(offset)
      .get();

    for (const fsdoc of snapshot.docs) {
      let doc = fsdoc.data();
      // get the subcollections here
      const subcollections = await fsdoc.ref.listCollections();
      const subcollectionNames = subcollections.map((subcol) => subcol.id);

      console.log("subcollections", subcollectionNames);

      for (const subcollection of subcollections) {
        const subcollectionData = await subcollection.get();
        doc[subcollection.id] = subcollectionData.docs.map((doc) => doc.data());
      }
      if (!doc.firestore_id) doc.firestore_id = fsdoc.id;
      else if (!doc.firestoreid) doc.firestoreid = fsdoc.id;
      else if (!doc.original_id) doc.original_id = fsdoc.id;
      else if (!doc.originalid) doc.originalid = fsdoc.id;
      // console.log("processDocument", typeof processDocument);
      // if (processDocument) {
      //   doc = processDocument(collectionName, doc, recordCounters, writeRecord);
      // }
      console.log(doc);
      writeRecord(collectionName, doc, recordCounters);
      data.push(doc);
    }
  } catch (err) {
    error = err;
  }
  return { data, error };
}
