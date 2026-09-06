// Keeps the hidden username field in sync with email on the add-user form
// (feature-41 §3). Only #id_email/#id_username as a hidden input exist there —
// on the change form #id_username is a visible text input from a different
// form (AdminUserChangeForm), so this listener simply finds no hidden input
// and does nothing.
document.addEventListener('DOMContentLoaded', function () {
  var emailInput = document.getElementById('id_email');
  var usernameHidden = document.getElementById('id_username');
  if (!emailInput || !usernameHidden || usernameHidden.type !== 'hidden') return;

  emailInput.addEventListener('input', function () {
    usernameHidden.value = emailInput.value;
  });
});
