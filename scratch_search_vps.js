const ids = [
  '69b6f395fc3d06f7651d967a',
  '69b6f758fc3d06f7651d96ce',
  '69b702f0de708b12e9c27a82'
];

const collections = db.getCollectionNames();

ids.forEach(id => {
  console.log(`\nSearching for ID: ${id}`);
  let found = false;
  collections.forEach(colName => {
    const col = db.getCollection(colName);
    const doc = col.findOne({ _id: id }) || col.findOne({ _id: ObjectId(id) });
    if (doc) {
      console.log(`[FOUND] in collection: ${colName}`);
      console.log(JSON.stringify(doc, null, 2));
      found = true;
    }
  });
  if (!found) {
    console.log(`[NOT FOUND] in any collection.`);
  }
});
