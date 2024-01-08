import {
  getFirestoreInstance,
  listCollections,
  listCollectionsWithSubCollections,
} from "./utils";
// import * as admin from "firebase-admin";
// import { DataSnapshot, Query } from '@firebase/database-types';
// import * as fs from 'fs';

const db = getFirestoreInstance();

async function main() {
  const collections = await listCollectionsWithSubCollections();
  console.log(collections);
}

main();
