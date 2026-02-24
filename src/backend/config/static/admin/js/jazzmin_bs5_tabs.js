/**
 * Fix for jazzmin 3.x using Bootstrap 5 Tab API
 * jazzmin templates use data-toggle="pill" (Bootstrap 4) but loads Bootstrap 5.
 * This script initialises Bootstrap 5 tabs and handles URL hash navigation.
 */
(function () {
    'use strict';

    function showTab(href) {
        var el = document.querySelector('#jazzy-tabs a[href="' + href + '"]');
        if (el && window.bootstrap && bootstrap.Tab) {
            bootstrap.Tab.getOrCreateInstance(el).show();
        }
    }

    function initTabs() {
        var jazzyTabs = document.querySelector('#jazzy-tabs');
        if (!jazzyTabs) return;

        var hash = window.location.hash;
        var errorPane = document.querySelector('.change-form .errorlist li');

        if (errorPane) {
            var pane = errorPane.closest('.tab-pane');
            if (pane) showTab('#' + pane.id);
        } else if (hash) {
            showTab(hash);
        }

        jazzyTabs.querySelectorAll('a[data-bs-toggle]').forEach(function (el) {
            el.addEventListener('shown.bs.tab', function (e) {
                if (history.pushState) {
                    history.pushState(null, null, e.target.getAttribute('href'));
                } else {
                    window.location.hash = e.target.getAttribute('href');
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTabs);
    } else {
        initTabs();
    }
})();
