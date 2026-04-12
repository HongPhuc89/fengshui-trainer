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
    """

    class Meta:
        model = PracticeQuestion
        fields = '__all__'
        widgets = {
            'options': OptionsWidget(),
            'correct_answer': forms.HiddenInput(),  # synced from radio via JS
        }
