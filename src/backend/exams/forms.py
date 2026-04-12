from django import forms

from .models import PracticeQuestion
from .widgets import OptionsWidget


class PracticeQuestionForm(forms.ModelForm):
    """ModelForm for PracticeQuestion with OptionsWidget.

    S1 fix: correct_answer uses HiddenInput so Django renders
    <input type="hidden" name="correct_answer" id="id_correct_answer">.
    JavaScript in options_widget.js syncs the selected radio value
    into that hidden input — no duplicate input names, no visible text field.

    S2 fix: no clean() override needed. The hidden input mechanism means
    Django's CharField handles correct_answer exactly like a normal POST value.

    Pre-check fix: __init__ injects the current correct_answer value into the
    options widget's attrs as `data-correct-answer` so the widget can render
    the radio button as checked server-side — not relying on JS timing.
    """

    class Meta:
        model = PracticeQuestion
        fields = '__all__'
        widgets = {
            'options': OptionsWidget(),
            'correct_answer': forms.HiddenInput(),  # synced from radio via JS
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Inject current correct_answer into widget attrs so render() can
        # pre-check the right radio button in HTML (server-side, no JS race).
        current_correct = ''
        if self.instance and self.instance.pk:
            current_correct = self.instance.correct_answer or ''
        elif self.initial.get('correct_answer'):
            current_correct = self.initial['correct_answer']
        self.fields['options'].widget.attrs['data-correct-answer'] = current_correct
