import json

from django import forms
from django.utils.html import format_html, mark_safe


class OptionsWidget(forms.Widget):
    """Custom widget for PracticeQuestion.options (JSONField).

    Renders a 4-row table (a, b, c, d) with text inputs for each answer option.
    Radio buttons are rendered alongside — JavaScript syncs the selected radio
    value into the hidden input rendered by the `correct_answer` CharField
    (which uses HiddenInput in PracticeQuestionForm).

    YES_NO / TRUE_FALSE: rows c and d are hidden via JS when question_type changes.

    value_from_datadict returns a JSON string for the `options` field only.
    `correct_answer` is handled by the separate HiddenInput widget in the form.
    """

    OPTION_IDS = ('a', 'b', 'c', 'd')

    class Media:
        css = {'all': ('exams/css/options_widget.css',)}
        js = ('exams/js/options_widget.js',)

    def render(self, name, value, attrs=None, renderer=None):
        # Parse existing options from JSON value
        existing = {}
        if value and value not in ('null', '[]', ''):
            try:
                options_list = json.loads(value) if isinstance(value, str) else value
                existing = {opt['id']: opt.get('text', '') for opt in options_list if 'id' in opt}
            except (json.JSONDecodeError, TypeError, KeyError):
                existing = {}

        rows_html = ''
        for opt_id in self.OPTION_IDS:
            text_val = existing.get(opt_id, '')
            # Escape for HTML attribute
            text_val_escaped = text_val.replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')
            rows_html += f'''
            <tr class="options-widget-row" data-option-id="{opt_id}">
                <td class="options-widget-id">{opt_id.upper()}</td>
                <td class="options-widget-text">
                    <input type="text"
                           name="options_text_{opt_id}"
                           value="{text_val_escaped}"
                           class="options-text-input vTextField"
                           placeholder="Nội dung đáp án {opt_id.upper()}...">
                </td>
                <td class="options-widget-radio">
                    <input type="radio"
                           name="correct_answer_radio"
                           value="{opt_id}"
                           class="options-radio">
                </td>
            </tr>'''

        # Hidden input holds the serialized JSON — JS populates before submit
        final_id = attrs.get('id', f'id_{name}') if attrs else f'id_{name}'
        html = f'''
<div class="options-widget-container" id="options_widget_container">
    <table class="options-widget-table">
        <thead>
            <tr>
                <th style="width:40px">ID</th>
                <th>Nội dung đáp án</th>
                <th style="width:60px">Đúng?</th>
            </tr>
        </thead>
        <tbody>
            {rows_html}
        </tbody>
    </table>
    <p class="help" style="margin-top:4px;font-size:11px;color:#888">
        Để trống đáp án → tự động bỏ khỏi danh sách. Tối thiểu 2 đáp án.
    </p>
    <input type="hidden" name="{name}" id="{final_id}">
</div>'''
        return mark_safe(html)

    def value_from_datadict(self, data, files, name):
        """Build options JSON from individual text inputs."""
        options = []
        for opt_id in self.OPTION_IDS:
            text = data.get(f'options_text_{opt_id}', '').strip()
            if text:
                options.append({'id': opt_id, 'text': text})
        return json.dumps(options, ensure_ascii=False)
