import { Drive } from '../demo-master/server/models/index.js';

async function run() {
  try {
    const drives = await Drive.findAll();
    drives.forEach(d => {
      if (d.submissions && d.submissions.length > 0) {
        d.submissions.forEach(s => {
          if (s.score === 20 || s.metrics?.answeredQuestions === 10) {
            console.log("MATCHING SUBMISSION in Drive ID:", d.id);
            console.log(JSON.stringify(s, null, 2));
          }
        });
      }
    });
  } catch (e) {
    console.error(e);
  }
}

run();
