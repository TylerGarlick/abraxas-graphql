import { Database } from 'arangojs';

async function analyzeTasks() {
  const testDb = new Database({
    databaseName: 'abraxas_test',
    url: 'http://178.105.173.60:8529/',
    auth: {
      username: 'root',
      password: '5orange5',
    },
  });

  try {
    console.log('Analyzing tasks for corrupted titles...');
    const cursor = await testDb.query('FOR t IN tasks RETURN t');
    const corrupted = [];

    for await (const task of cursor) {
      const title = task.title;
      
      // Common corruption patterns:
      // 1. Undefined or Null
      // 2. Non-string values
      // 3. Presence of null bytes or strange control characters
      // 4. Extremely long titles that might cause crashes
      // 5. Missing title field entirely
      
      let isCorrupted = false;
      let reason = '';

      if (title === undefined || title === null) {
        isCorrupted = true;
        reason = 'Title is missing or null';
      } else if (typeof title !== 'string') {
        isCorrupted = true;
        reason = `Title is not a string: ${typeof title}`;
      } else if (title.includes('\\0') || title.includes('\0')) {
        isCorrupted = true;
        reason = 'Title contains null bytes';
      } else if (title.length > 10000) {
        isCorrupted = true;
        reason = `Title is excessively long: ${title.length} chars`;
      }

      if (isCorrupted) {
        corrupted.push({
          id: task._key,
          title: title,
          reason: reason
        });
      }
    }

    if (corrupted.length > 0) {
      console.log(`Found ${corrupted.length} potentially corrupted tasks:`);
      console.table(corrupted);
    } else {
      console.log('No corrupted titles found based on current heuristics.');
    }
  } catch (error) {
    console.error('Analysis failed:', error);
    process.exit(1);
  }
}

analyzeTasks();
