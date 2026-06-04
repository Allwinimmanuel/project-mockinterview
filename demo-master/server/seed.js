import { QUESTION_BANK } from '../src/data/questionBank.js';
import sequelize from './config/db.js';
import { Question } from './models/index.js';

const seedDatabase = async () => {
  try {
    await sequelize.authenticate();
    
    // This will clear the Question table and insert fresh data
    await Question.sync({ force: true }); 

    const questionsToInsert = [];

    // Loop through the exported QUESTION_BANK object
    for (const [category, questions] of Object.entries(QUESTION_BANK)) {
      for (const q of questions) {
        questionsToInsert.push({
          id: q.id,
          roundCategory: category,
          type: q.type || 'mcq',
          difficulty: q.difficulty || 'Medium',
          content: q // The entire object is stored as JSON in the database
        });
      }
    }

    // Insert everything into MySQL
    await Question.bulkCreate(questionsToInsert);
    console.log(`✅ Successfully seeded ${questionsToInsert.length} questions into the database!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
