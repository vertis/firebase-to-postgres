import * as admin from "firebase-admin";
import * as fs from "fs";

const serviceAccount = require("./firebase-service.json");

// console.log('databaseURL', `https://${serviceAccount.project_id}.firebaseio.com`);

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`, // "https://PROJECTID.firebaseio.com"
  });
} catch (e) {}

const db = admin.firestore();

function getFirestoreInstance(): admin.firestore.Firestore {
  return db;
}

function removeEmptyFields(obj: any) {
  Object.keys(obj).forEach((key) => {
    if (obj[key] && typeof obj[key] === "object") {
      removeEmptyFields(obj[key]);
    } else if (obj[key] === null || obj[key] === "" || obj[key] === " ") {
      delete obj[key];
    }
  });
}

const cleanUp = (recordCounters: any) => {
  for (let key in recordCounters) {
    fs.appendFileSync(`./${key}.json`, "\n]", "utf8");
  }
};
const basePath = "./export/";

const writeRecord = (name: string, doc: any, recordCounters: any) => {
  if (!recordCounters[name] || recordCounters[name] === 0) {
    fs.writeFileSync(basePath + `${name}.json`, "[\n", "utf8");
    recordCounters[name] = 0;
  }
  fs.appendFileSync(
    basePath + `${name}.json`,
    (recordCounters[name] > 0 ? ",\n" : "") + JSON.stringify(doc, null, 2),
    "utf8"
  );
  recordCounters[name]++;
};

const listCollections = async (): Promise<string[]> => {
  try {
    const collections = await db.listCollections();
    const collectionIds = collections.map((collection) => collection.id);
    return collectionIds;
  } catch (err) {
    console.error("ERROR", err);
    throw err;
  }
};

const listCollectionsWithSubCollections = async () => {
  console.log("Listing all collections with subcollections");
  const collectionNames = await listCollections();
  console.log(`Found top-level collections: ${collectionNames}`);
  const allCollections = new Set();
  const processSubCollections = async (collection) => {
    const docs = await db.collection(collection).limit(5).get();
    console.log(`Documents in ${collection}: ${docs.docs.length}`);

    if (docs.docs.length > 0) {
      const doc = docs.docs[0];
      console.log(`Processing first document: ${doc.ref.path}`);
      const docRef = doc.ref;
      const subCollections = await docRef.listCollections();
      if (subCollections.length > 0) {
        console.log(
          `Found subcollections for document ${collection} ${
            doc.id
          }: ${subCollections.map((sc) => sc.id)}`
        );
        for (const subCollection of subCollections) {
          const subPath = `${docRef.path}/${subCollection.id}`;
          console.log(`Adding subcollection to set: ${subPath}`);
          allCollections.add(subPath);
          await processSubCollections(subPath);
        }
      }
    }
  };
  for (const collectionName of collectionNames) {
    console.log(`Adding collection to set: ${collectionName}`);
    allCollections.add(collectionName);
    await processSubCollections(collectionName);
  }
  console.log("Completed listing of all collections with subcollections");
  return Array.from(allCollections);
};

export {
  removeEmptyFields,
  getFirestoreInstance,
  cleanUp,
  writeRecord,
  listCollections,
  listCollectionsWithSubCollections,
};
