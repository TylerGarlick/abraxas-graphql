export const customLoggingPlugin = {
  onExecute({ args }: any) {
    const query = args.document?.loc?.source;
    if (typeof query === 'string') {
      console.log(`Executing query: ${query.substring(0, 50)}...`);
    } else {
      console.log('Executing query: [non-string or unavailable source]');
    }
  },
};
