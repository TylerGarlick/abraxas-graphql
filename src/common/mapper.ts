export const mapArangoDoc = (doc: any) => {
  if (!doc) return null;
  const { _key, _id, _rev, ...rest } = doc;
  return {
    id: _key,
    ...rest,
  };
};

export const mapArangoList = (docs: any[]) => {
  if (!docs) return [];
  return docs.map(mapArangoDoc);
};
