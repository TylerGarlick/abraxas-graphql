import { Defaults, DefaultType } from './defaults';

export const mapArangoDoc = (doc: any, type: DefaultType = 'Task') => {
  const defaultValues = Defaults[type];
  
  if (!doc) return { ...defaultValues };
  
  const { _key, _id, _rev, ...rest } = doc;
  
  const mapped = {
    ...defaultValues,
    id: _key || defaultValues.id,
    ...rest,
  };

  if (mapped.status === undefined || mapped.status === null) {
    mapped.status = (defaultValues.status || 'OPEN') as any;
  } else if (typeof mapped.status === 'string') {
    mapped.status = mapped.status.toUpperCase();
  }

  return mapped;
};

export const mapArangoList = (docs: any[], type: DefaultType = 'Task') => {
  if (!docs) return [];
  return docs.map(doc => mapArangoDoc(doc, type));
};
