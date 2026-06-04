import { Drive } from '../demo-master/server/models/index.js';

async function run() {
  try {
    const d = await Drive.findByPk('drv-8708');
    if (d) {
      console.log("Drive drv-8708 Submissions:", JSON.stringify(d.submissions, null, 2));
    } else {
      console.log("Drive drv-8708 not found");
    }
  } catch (e) {
    console.error(e);
  }
}

run();
