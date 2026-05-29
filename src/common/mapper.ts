export const mapArangoDoc = (doc: any) => {
  if (!doc) return null;
  const { _key, _id, _rev, ...rest } = doc;
  
  const mapped = {
    id: _key,
    subtasks: rest.subtasks ?? [],
    ...rest,
  };

  if (mapped.status && typeof mapped.status === 'string') {
    mapped.status = mapped.status.toUpperCase();
  }

  return mapped;
};

export const mapArangoList = (docs: any[]) => {
  if (!docs) return [];
  return docs.map(mapArangoDoc);
};
