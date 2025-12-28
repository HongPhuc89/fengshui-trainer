-- Fix questions with missing or zero points
UPDATE questions
SET points = 1
WHERE points IS NULL OR points = 0;

-- Verify the update
SELECT id, question_text, points, difficulty
FROM questions
ORDER BY id;
