import { Database } from 'arangojs';

async function copyTasks() {
  const prodDb = new Database({
    databaseName: 'abraxas_prod',
    url: 'http://178.105.173.60:8529/',
    auth: {
      username: 'root',
      password: '5orange5',
    },
  });

  const testDb = new Database({
    databaseName: 'abraxas_test',
    url: 'http://178.105.173.60:8529/',
    auth: {
      username: 'root',
      password: '5orange5',
    },
  });

  try {
    console.log('Fetching tasks from production...');
    const cursor = await prodDb.query('FOR t IN tasks RETURN t');
    const tasks = [];

    for await (const task of cursor) {
      tasks.push(task);
    }
    console.log(`Fetched ${tasks.length} tasks from production.`);

    console.log('Preparing test collection...');
    const testTasksCol = testDb.collection('tasks');
    
    try {
      await testTasksCol.truncate();
      console.log('Truncated test tasks collection.');
    } catch (e) {
      console.log('Could not truncate, checking if collection exists...');
    }

    console.log('Copying tasks to test...');
    const batchSize = 1000;
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      
      const docsToSave = batch.map(doc => {
        const { _id, ...rest } = doc;
        return rest;
      });

      await testTasksCol.saveAll(docsToSave);
      console.log(`Copied ${Math.min(i + batchSize, tasks.length)}/${tasks.length} tasks...`);
    }

    console.log('Verification: Counting documents...');
    
    // In arangojs, query returns a cursor. To get the full list, we must iterate.
    const prodCursor = await prodDb.query('FOR t IN tasks RETURN 1');
    const prodResults = [];
    for await (const res of prodCursor) {
      prodResults.push(res);
    }
    const prodCount = prodResults.length;
    
    const testCursor = await testDb.query('FOR t IN tasks RETURN 1');
    const testResults = [];
    for await (const res of testCursor) {
      testResults.push(res);
    }
    const testCount = testResults.length;
    
    console.log(`Production count: ${prodCount}`);
    console.log(`Test count: ${testCount}`);

    if (prodCount === testCount) {
      console.log('SUCCESS: Document parity achieved.');
    } else {
      console.error('FAILURE: Document count mismatch!');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

copyTasks();
