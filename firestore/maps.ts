const processMap = (
  collectionName: string,
  doc: any,
  recordCounters: any,
  writeRecord: Function
): any => {
  //console.log(`processMap`, doc, doc.map_activity);
  if (doc.map_activity) {
    for (let i = 0; i < doc.map_activity.length; i++) {
      const activity = {
        parent_id: doc.firestore_id,
        ...doc.map_activity[i],
      };
      writeRecord("map_activity", activity, recordCounters);
    }
    delete doc.map_activity; // moved to separate file
  }
  return doc;
};
export default processMap;
