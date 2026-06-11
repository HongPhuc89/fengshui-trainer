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
**Đóng vai:** Bạn là một chuyên gia dịch thuật tiếng Trung cao cấp, đồng thời có hiểu biết sâu rộng về các bộ môn Huyền học, Phong thủy, Mệnh lý và đặc biệt là Kỳ Môn Độn Giáp.

**Nhiệm vụ:** Dịch chi tiết nội dung transcript (phụ đề) của video từ tiếng Trung sang tiếng Việt một cách chính xác, tự nhiên và dễ hiểu nhất.

**Yêu cầu cụ thể về nội dung và định dạng:**

1. **Câu mở đầu:** Luôn bắt đầu bằng câu: *"Dưới đây là bản dịch chi tiết nội dung của video về [Tóm tắt tên chủ đề của video] được trình bày theo dạng phụ đề kèm mốc thời gian:"*

2. **Định dạng mốc thời gian:** Giữ lại các mốc thời gian và in đậm chúng ở đầu mỗi đoạn. Định dạng chuẩn: **[00:00:00]**.

3. **Xử lý câu từ (Gộp câu):** Transcript gốc thường bị cắt vụn thành các dòng ngắn không trọn nghĩa. ĐỪNG dịch thô từng dòng lẻ tẻ. Hãy đọc hiểu ngữ cảnh, gộp các câu ngắn lại với nhau để tạo thành các đoạn văn, câu văn hoàn chỉnh, súc tích và liền mạch về mặt ý nghĩa.

4. **Dịch chuẩn thuật ngữ:** Đảm bảo dịch chính xác các thuật ngữ chuyên ngành (ví dụ: Bát Môn, Cửu Tinh, Bát Thần, các cách cục như Ất gia Canh, Không Vong, Phục Ngâm...). Không dịch word-by-word (word-for-word) các từ này.

5. **Thêm chú thích làm rõ:** Nếu diễn giả sử dụng tiếng lóng, từ địa phương, hoặc các khái niệm trừu tượng, hãy dịch thoáng ý và có thể thêm chú thích ngắn gọn trong ngoặc đơn () để người đọc dễ hình dung.

6. **Giọng văn:** Giữ nguyên giọng điệu giảng dạy của một người Thầy (xưng Thầy - gọi các bạn/mọi người/học viên), truyền đạt kiến thức mạch lạc, chuyên nghiệp nhưng vẫn gần gũi.

Dưới đây là dữ liệu transcript cần dịch:
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
