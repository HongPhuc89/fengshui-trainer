/**
 * options_widget.js
 *
 * Responsibilities:
 * 1. On page load: pre-select the radio that matches id_correct_answer value.
 * 2. On radio change: sync selected value → id_correct_answer hidden input.
 * 3. On form submit: serialize text inputs → options JSON → id_options hidden input.
 * 4. On question_type change: hide/show rows c & d for YES_NO / TRUE_FALSE.
 * 5. Highlight the currently-selected correct-answer row.
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
    // 1. Pre-select radio from existing correct_answer value
    // -----------------------------------------------------------------------
    function syncRadioFromHidden() {
      const current = correctAnswerInput ? correctAnswerInput.value : '';
      radios.forEach(function (radio) {
        radio.checked = (radio.value === current);
      });
      updateRowHighlights();
    }

    // -----------------------------------------------------------------------
    // 2. Sync radio → hidden correct_answer input
    // -----------------------------------------------------------------------
    radios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (correctAnswerInput) {
          correctAnswerInput.value = radio.value;
        }
        updateRowHighlights();
      });
    });

    function updateRowHighlights() {
      const selected = correctAnswerInput ? correctAnswerInput.value : '';
      container.querySelectorAll('.options-widget-row').forEach(function (row) {
        const optId = row.getAttribute('data-option-id');
        row.classList.toggle('is-correct', optId === selected);
      });
    }

    // -----------------------------------------------------------------------
    // 3. Serialize table → JSON on form submit
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
          // Clear text and deselect radio for hidden rows
          const textInput = row.querySelector('.options-text-input');
          if (textInput) textInput.value = '';
          const radio = row.querySelector('.options-radio');
          if (radio && radio.checked) {
            radio.checked = false;
            if (correctAnswerInput) correctAnswerInput.value = '';
          }
        } else {
          row.classList.remove('hidden');
        }
      });

      // Auto-populate YES_NO options if rows a/b are empty
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
      // Apply on initial load
      applyQuestionTypeVisibility(questionTypeSelect.value);
    }

    // -----------------------------------------------------------------------
    // Initial state
    // -----------------------------------------------------------------------
    syncRadioFromHidden();
  }

  // Run after DOM ready (handles both standard page load and Django admin ajax)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOptionsWidget);
  } else {
    initOptionsWidget();
  }
})();
