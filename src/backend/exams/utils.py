import csv
import io

from .models import Flashcard, PracticeQuestion, TrainingActivity


def parse_questions_csv(file_obj, exam) -> dict:
    """Parse questions CSV, bulk create, return stats."""
    text = file_obj.read()
    if isinstance(text, bytes):
        text = text.decode('utf-8-sig')  # handle BOM
    reader = csv.DictReader(io.StringIO(text))
    to_create, errors, skipped = [], [], 0

    existing = set(exam.questions.values_list('question_text', flat=True))
    next_order = exam.questions.count() + 1

    for i, row in enumerate(reader, start=2):
        q_type = row.get('question_type', '').strip().upper()
        q_text = row.get('question_text', '').strip()

        if q_type not in {'MULTIPLE_CHOICE', 'YES_NO', 'TRUE_FALSE'}:
            errors.append({'row': i, 'error': f'question_type "{q_type}" không hợp lệ'})
            skipped += 1
            continue
        if not q_text:
            errors.append({'row': i, 'error': 'question_text trống'})
            skipped += 1
            continue
        if q_text in existing:
            errors.append({'row': i, 'error': 'Câu hỏi đã tồn tại (bỏ qua duplicate)'})
            skipped += 1
            continue

        if q_type == 'MULTIPLE_CHOICE':
            options = [
                {'id': k, 'text': row.get(f'option_{k}', '').strip()}
                for k in ('a', 'b', 'c', 'd')
                if row.get(f'option_{k}', '').strip()
            ]
            if len(options) < 2:
                errors.append({'row': i, 'error': 'MCQ cần ít nhất 2 đáp án'})
                skipped += 1
                continue
        elif q_type == 'YES_NO':
            options = [{'id': 'yes', 'text': 'Có'}, {'id': 'no', 'text': 'Không'}]
        else:
            options = [{'id': 'true', 'text': 'Đúng'}, {'id': 'false', 'text': 'Sai'}]

        correct = row.get('correct_answer', '').strip().lower()
        valid_ids = {o['id'] for o in options}
        if correct not in valid_ids:
            errors.append({'row': i, 'error': f'correct_answer "{correct}" không hợp lệ (phải là: {", ".join(sorted(valid_ids))})'})
            skipped += 1
            continue

        try:
            points = int(row.get('points') or 10)
        except (ValueError, TypeError):
            points = 10

        to_create.append(PracticeQuestion(
            exam=exam,
            question_type=q_type,
            question_text=q_text,
            options=options,
            correct_answer=correct,
            explanation=row.get('explanation', '').strip(),
            points=points,
            difficulty=row.get('difficulty', '').strip().upper() or '',
            order=next_order + len(to_create),
        ))
        existing.add(q_text)

    PracticeQuestion.objects.bulk_create(to_create)
    return {'created': len(to_create), 'skipped': skipped, 'errors': errors}


def parse_flashcards_csv(file_obj, lesson=None, module=None) -> dict:
    """Parse flashcards CSV, bulk create for a lesson or module, return stats."""
    if not lesson and not module:
        return {'created': 0, 'skipped': 0, 'errors': [{'row': 0, 'error': 'Must provide lesson or module'}]}

    text = file_obj.read()
    if isinstance(text, bytes):
        text = text.decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(text))
    to_create, errors, skipped = [], [], 0

    parent_qs = lesson.flashcards if lesson else module.flashcards
    existing = set(parent_qs.values_list('front', flat=True))
    next_order = parent_qs.count() + 1

    for i, row in enumerate(reader, start=2):
        front = row.get('front', '').strip()
        back = row.get('back', '').strip()

        if not front or not back:
            errors.append({'row': i, 'error': 'front and back must not be empty'})
            skipped += 1
            continue
        if front in existing:
            errors.append({'row': i, 'error': 'Duplicate front text — skipped'})
            skipped += 1
            continue

        difficulty = row.get('difficulty', '').strip().upper()
        if difficulty not in {'EASY', 'MEDIUM', 'HARD', ''}:
            difficulty = ''

        to_create.append(Flashcard(
            lesson=lesson,
            module=module,
            front=front,
            back=back,
            category=row.get('category', '').strip(),
            difficulty=difficulty,
            order=next_order + len(to_create),
        ))
        existing.add(front)

    Flashcard.objects.bulk_create(to_create)
    return {'created': len(to_create), 'skipped': skipped, 'errors': errors}


QUESTIONS_CSV_TEMPLATE = (
    'question_type,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,points,difficulty\r\n'
    'MULTIPLE_CHOICE,"Nguyên lý tụ khí trong Phong Thủy là gì?","Gió phát tán khí","Nước tụ giữ khí",'
    '"Cả hai đúng","Không cái nào","c","Phong tán Thủy tụ — nước tụ khí lại",10,MEDIUM\r\n'
    'YES_NO,"Phòng ngủ nên đặt gương đối diện giường?","","","","","no","Gương tạo năng lượng bất an",10,EASY\r\n'
    'TRUE_FALSE,"Hướng Nam thuộc hành Hỏa?","","","","","true","Nam thuộc Hỏa — Hậu Thiên Bát Quái",10,EASY\r\n'
)

def parse_flashcards_csv_for_activity(file_obj, activity: 'TrainingActivity') -> dict:
    """Parse flashcards CSV and bulk-create for a TrainingActivity. Returns stats."""
    text = file_obj.read()
    if isinstance(text, bytes):
        text = text.decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(text))
    to_create, errors, skipped = [], [], 0

    existing = set(activity.flashcards.values_list('front', flat=True))
    next_order = activity.flashcards.count() + 1

    for i, row in enumerate(reader, start=2):
        front = row.get('front', '').strip()
        back = row.get('back', '').strip()

        if not front or not back:
            errors.append({'row': i, 'error': 'front and back must not be empty'})
            skipped += 1
            continue
        if front in existing:
            errors.append({'row': i, 'error': 'Duplicate front text — skipped'})
            skipped += 1
            continue

        difficulty = row.get('difficulty', '').strip().upper()
        if difficulty not in {'EASY', 'MEDIUM', 'HARD', ''}:
            difficulty = ''

        to_create.append(Flashcard(
            activity=activity,
            front=front,
            back=back,
            category=row.get('category', '').strip(),
            difficulty=difficulty,
            order=next_order + len(to_create),
        ))
        existing.add(front)

    Flashcard.objects.bulk_create(to_create)
    return {'created': len(to_create), 'skipped': skipped, 'errors': errors}


FLASHCARDS_CSV_TEMPLATE = (
    'category,front,back,difficulty\r\n'
    'KHÁI NIỆM CỐT LÕI,"Sự khác biệt giữa Phong và Thủy?","Phong tán khí — gió làm tan khí. Thủy tụ khí — nước giữ khí lại.",MEDIUM\r\n'
    'ÂM DƯƠNG,"Tại sao phòng ngủ cần năng lượng Âm?","Phòng ngủ cần năng lượng Âm để thư giãn. Quá nhiều Dương gây mất ngủ.",EASY\r\n'
    'NGŨ HÀNH,"Kim khắc Mộc — ý nghĩa thực tế?","Kim đại diện cho sắc bén kiểm soát sự bành trướng của Mộc.",HARD\r\n'
)


def provision_training_activity(source_type: str, source_obj, activity_type: str):
    """
    Get or create TrainingSet + TrainingActivity for a content source.

    Args:
        source_type: 'lesson' | 'chapter'
        source_obj: VideoLesson or BookChapter instance
        activity_type: 'FLASHCARD' | 'QUIZ'

    Returns:
        (TrainingActivity, Exam | None)
    """
    from .models import TrainingSet, TrainingActivity, Exam
    from django.utils.text import slugify

    # Step 1: Get or create TrainingSet
    training_set, _ = TrainingSet.objects.get_or_create(
        **{source_type: source_obj},
        defaults={'title': f"Luyện tập — {source_obj.title}"},
    )

    # Step 2: Get or create TrainingActivity
    activity_order = 0 if activity_type == 'FLASHCARD' else 1
    activity_label = 'Flashcard' if activity_type == 'FLASHCARD' else 'Quiz'

    activity, _ = TrainingActivity.objects.get_or_create(
        training_set=training_set,
        activity_type=activity_type,
        defaults={
            'title': f"{activity_label} — {source_obj.title}",
            'order': activity_order,
            'is_active': True,
        },
    )

    # Step 3: If QUIZ, get or create Exam
    exam = None
    if activity_type == 'QUIZ':
        source_slug = getattr(source_obj, 'slug', None) or slugify(source_obj.title)
        exam, _ = Exam.objects.get_or_create(
            activity=activity,
            defaults={
                'title': f"Quiz — {source_obj.title}",
                'slug': f"quiz-{source_slug}-{str(activity.pk)[:8]}",
                'exam_type': 'QUIZ',
                'passing_score': 70,
            },
        )

    return activity, exam
