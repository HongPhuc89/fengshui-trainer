from django.db import migrations


TRANSCRIPT_PROMPT_DEFAULT = """
Bạn là chuyên gia nhận dạng giọng nói tiếng Trung Quốc (Mandarin).
Nhiệm vụ: Transcribe toàn bộ nội dung audio thành văn bản tiếng Trung, kèm timestamp theo định dạng [HH:MM:SS].

Yêu cầu:
- Mỗi đoạn transcript bắt đầu bằng timestamp [HH:MM:SS] trên dòng riêng
- Giữ nguyên các thuật ngữ Hán Nôm và thuật ngữ chuyên ngành
- Không dịch, không giải thích — chỉ transcribe
- Không bỏ sót nội dung dù người nói nói nhanh
- Nếu không nghe rõ một từ, dùng [...] để đánh dấu

Ví dụ output:
[00:00:05]
今天我们来讲奇门遁甲的基础知识。

[00:01:23]
首先我们要了解八门，分别是休门、生门、伤门...
""".strip()

TRANSLATE_PROMPT_DEFAULT = """
**Vai trò:** Chuyên gia dịch thuật tiếng Trung — tiếng Việt, am hiểu sâu về Huyền học, Phong thủy, Mệnh lý, Kỳ Môn Độn Giáp.

**Nhiệm vụ:** Dịch transcript video tiếng Trung sang tiếng Việt — chính xác, tự nhiên, giữ đúng giọng giảng dạy của người Thầy.

**Quy tắc bắt buộc:**

1. **Mốc thời gian:** Chuyển tất cả timestamp về định dạng [MM:SS] (ví dụ: [00:00], [01:26], [12:34]). Không hiển thị giờ. In đậm, đứng đầu mỗi đoạn.

3. **Gộp câu (BẮT BUỘC):** Transcript gốc bị cắt vụn thành dòng 3–10 chữ, không trọn nghĩa. Tuyệt đối KHÔNG dịch thô từng dòng.
   - Đọc toàn bộ ngữ cảnh giữa hai mốc thời gian trước khi dịch.
   - Gộp các dòng ngắn cùng ý thành 1–3 câu hoàn chỉnh, súc tích.
   - Nếu một ý kéo dài qua nhiều mốc liên tiếp, gộp dưới mốc đầu tiên, chỉ giữ mốc quan trọng.
   - **Kết quả phải đọc như lời nói tự nhiên của người Thầy đang giảng bài — không phải danh sách câu rời rạc.**

4. **Thuật ngữ chuyên ngành:** Dịch chính xác, không phiên âm máy móc. Ví dụ: Bát Môn, Cửu Tinh, Bát Thần, Ất gia Canh, Không Vong, Phục Ngâm, Tỷ Hòa, Ký Cung, Dụng Thần...

5. **Chú thích:** Với tiếng lóng, khái niệm trừu tượng hoặc thuật ngữ cần giải thích thêm, thêm chú thích ngắn trong ngoặc đơn ().

6. **Giọng văn:** Xưng Thầy — gọi các bạn/học viên. Mạch lạc, chuyên nghiệp nhưng gần gũi, đúng phong cách giảng dạy trực tiếp.

Dưới đây là transcript cần dịch:
""".strip()


def create_default_configs(apps, schema_editor):
    TranscriptConfig = apps.get_model('transcripts', 'TranscriptConfig')
    TranscriptConfig.objects.get_or_create(
        type='TRANSCRIPT_PROMPT',
        defaults={
            'value': TRANSCRIPT_PROMPT_DEFAULT,
            'model': 'gemini-2.5-flash',
        },
    )
    TranscriptConfig.objects.get_or_create(
        type='TRANSLATE_PROMPT',
        defaults={
            'value': TRANSLATE_PROMPT_DEFAULT,
            'model': 'gemini-2.5-flash',
        },
    )


def delete_default_configs(apps, schema_editor):
    TranscriptConfig = apps.get_model('transcripts', 'TranscriptConfig')
    TranscriptConfig.objects.filter(
        type__in=['TRANSCRIPT_PROMPT', 'TRANSLATE_PROMPT']
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('transcripts', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_default_configs, delete_default_configs),
    ]
