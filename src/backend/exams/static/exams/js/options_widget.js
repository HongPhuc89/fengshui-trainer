/**
 * options_widget.js
 *
 * Responsibilities:
 * 1. On radio change: sync selected value → id_correct_answer hidden input + update highlights.
 * 2. On form submit: serialize text inputs → options JSON → options hidden input.
 * 3. On question_type change: hide/show rows c & d for YES_NO / TRUE_FALSE.
 * 4. On load: sync id_correct_answer hidden input from the pre-checked radio
 *    (radio is already checked server-side by OptionsWidget.render — this just
 *    ensures the hidden input value matches in case of any inconsistency).
 *
 * NOTE: Radio pre-selection is done server-side in OptionsWidget.render() via
 * PracticeQuestionForm.__init__ injecting data-correct-answer into widget attrs.
 * This JS does NOT need to drive initial radio state — it only handles interactions.
 */

(function () {
  'use strict';

  function initOptionsWidget() {
    const container = document.getElementById('options_widget_container');
    if (!container) return;

    const correctAnswerInput = document.getElementById('id_correct_answer');
    const optionsHiddenInput = container.querySelector('input[type="hidden"][name="options"]');
    const radios = container.querySelectorAll('input.options-radio');
    const questionTypeSelect = document.getElementById('id_question_type');

    // -----------------------------------------------------------------------
    // 1. Sync hidden input from whichever radio is already checked (server-rendered)
    //    and update row highlights to match.
    // -----------------------------------------------------------------------
    function syncHiddenFromCheckedRadio() {
      radios.forEach(function (radio) {
        if (radio.checked) {
          if (correctAnswerInput) correctAnswerInput.value = radio.value;
          updateRowHighlights(radio.value);
        }
      });
    }

    // -----------------------------------------------------------------------
    // 2. On radio change: sync → hidden input + highlights
    // -----------------------------------------------------------------------
    radios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (correctAnswerInput) correctAnswerInput.value = radio.value;
        updateRowHighlights(radio.value);
      });
    });

    function updateRowHighlights(selectedId) {
      container.querySelectorAll('.options-widget-row').forEach(function (row) {
        const optId = row.getAttribute('data-option-id');
        row.classList.toggle('is-correct', optId === selectedId);
      });
    }

    // -----------------------------------------------------------------------
    // 3. Serialize table → options JSON hidden input on submit
    // -----------------------------------------------------------------------
    const form = container.closest('form');
    if (form) {
      form.addEventListener('submit', function () {
        serializeOptions();
      });
    }

    function serializeOptions() {
      const options = [];
      container.querySelectorAll('.options-widget-row').forEach(function (row) {
        const optId = row.getAttribute('data-option-id');
        const textInput = row.querySelector('.options-text-input');
        const text = textInput ? textInput.value.trim() : '';
        if (text) {
          options.push({ id: optId, text: text });
        }
      });
      if (optionsHiddenInput) {
        optionsHiddenInput.value = JSON.stringify(options);
      }
    }

    // -----------------------------------------------------------------------
    // 4. Hide/show rows c & d based on question_type
    // -----------------------------------------------------------------------
    const TWO_OPTION_TYPES = ['YES_NO', 'TRUE_FALSE'];

    function applyQuestionTypeVisibility(qType) {
      const twoOptionMode = TWO_OPTION_TYPES.includes(qType);
      container.querySelectorAll('.options-widget-row').forEach(function (row) {
        const optId = row.getAttribute('data-option-id');
        if (twoOptionMode && (optId === 'c' || optId === 'd')) {
          row.classList.add('hidden');
          const textInput = row.querySelector('.options-text-input');
          if (textInput) textInput.value = '';
          const radio = row.querySelector('.options-radio');
          if (radio && radio.checked) {
            radio.checked = false;
            if (correctAnswerInput) correctAnswerInput.value = '';
            updateRowHighlights('');
          }
        } else {
          row.classList.remove('hidden');
        }
      });

      // Auto-populate YES_NO text if rows a/b are empty
      if (qType === 'YES_NO') {
        const rowA = container.querySelector('.options-widget-row[data-option-id="a"] .options-text-input');
        const rowB = container.querySelector('.options-widget-row[data-option-id="b"] .options-text-input');
        if (rowA && !rowA.value.trim()) rowA.value = 'Có';
        if (rowB && !rowB.value.trim()) rowB.value = 'Không';
      }
    }

    if (questionTypeSelect) {
      questionTypeSelect.addEventListener('change', function () {
        applyQuestionTypeVisibility(this.value);
      });
      applyQuestionTypeVisibility(questionTypeSelect.value);
    }

    // -----------------------------------------------------------------------
    // Initial sync: ensure hidden input matches the server-pre-checked radio
    // -----------------------------------------------------------------------
    syncHiddenFromCheckedRadio();
  }

  // Run after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOptionsWidget);
  } else {
    initOptionsWidget();
  }
})();
