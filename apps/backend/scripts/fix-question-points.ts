import { DataSource } from 'typeorm';
import { Question } from '../src/modules/quiz/entities/question.entity';

async function fixQuestionPoints() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'quiz_game',
    entities: [Question],
  });

  await dataSource.initialize();
  console.log('✅ Database connected');

  const questionRepo = dataSource.getRepository(Question);

  // Find questions with missing or zero points
  const questionsToFix = await questionRepo.createQueryBuilder('q').where('q.points IS NULL OR q.points = 0').getMany();

  console.log(`📊 Found ${questionsToFix.length} questions with missing/zero points`);

  if (questionsToFix.length > 0) {
    // Update all questions to have at least 1 point
    await questionRepo
      .createQueryBuilder()
      .update(Question)
      .set({ points: 1 })
      .where('points IS NULL OR points = 0')
      .execute();

    console.log('✅ Updated all questions to have at least 1 point');
  }

  // Verify
  const allQuestions = await questionRepo.find();
  console.log('\n📝 All questions:');
  allQuestions.forEach((q) => {
    console.log(`  - Question ${q.id}: ${q.points} points (${q.difficulty})`);
  });

  await dataSource.destroy();
  console.log('\n✅ Done!');
}

fixQuestionPoints().catch(console.error);
