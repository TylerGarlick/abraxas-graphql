import { Database } from 'arangojs';

async function fixTasks() {
  const testDb = new Database({
    databaseName: 'abraxas_test',
    url: 'http://178.105.173.60:8529/',
    auth: {
      username: 'root',
      password: '5orange5',
    },
  });

  try {
    console.log('Fixing corrupted titles in test database...');
    
    // Using AQL to find keys of tasks with missing titles
    const cursor = await testDb.query('FOR t IN tasks FILTER t.title == null RETURN t._key');
    const toFix = [];

    for await (const res of cursor) {
      toFix.push(res);
    }

    if (toFix.length === 0) {
      console.log('No corrupted titles found via AQL.');
      return;
    }

    console.log(`Found ${toFix.length} tasks to fix.`);
    const tasksCol = testDb.collection('tasks');

    for (const key of toFix) {
      await tasksCol.update(key, {
        title: 'Untitled Task'
      });
      console.log(`Fixed task ${key}`);
    }

    console.log('All identified corruption fixed in test database.');
  } catch (error) {
    console.error('Fix failed:', error);
    process.exit(1);
  }
}

fixTasks();
