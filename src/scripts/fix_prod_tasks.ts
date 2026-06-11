import { Database } from 'arangojs';

async function fixProductionTasks() {
  const prodDb = new Database({
    databaseName: 'abraxas_prod',
    url: 'http://178.105.173.60:8529/',
    auth: {
      username: 'root',
      password: '5orange5',
    },
  });

  try {
    console.log('Analyzing production tasks for corruption...');
    const cursor = await prodDb.query('FOR t IN tasks RETURN t');
    const corrupted = [];

    for await (const task of cursor) {
      if (task.title === undefined || task.title === null) {
        corrupted.push({
          key: task._key,
          content: task,
        });
      }
    }

    if (corrupted.length === 0) {
      console.log('No corrupted titles found in production.');
      return;
    }

    console.log(`Found ${corrupted.length} corrupted tasks. Proposing fixes...`);
    
    const tasksCol = prodDb.collection('tasks');

    for (const entry of corrupted) {
      // Heuristic to derive a relevant title from other fields if available
      const doc = entry.content;
      let suggestedTitle = 'Untitled Task';

      if (doc.description && typeof doc.description === 'string' && doc.description.length > 0) {
        suggestedTitle = doc.description.substring(0, 50) + (doc.description.length > 50 ? '...' : '');
      } else if (doc.project) {
        suggestedTitle = `Task in project ${doc.project}`;
      }

      console.log(`Updating task ${entry.key}: Setting title to "${suggestedTitle}"`);
      await tasksCol.update(entry.key, {
        title: suggestedTitle
      });
    }

    console.log('Production fixes completed.');
  } catch (error) {
    console.error('Production fix failed:', error);
    process.exit(1);
  }
}

fixProductionTasks();
