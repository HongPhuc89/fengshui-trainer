(function () {
    function toggle() {
        var sel = document.getElementById('id_source_type');
        if (!sel) return;
        var isLocal = sel.value === 'LOCAL_AUDIO';
        var ytRow = document.querySelector('.field-youtube_url');
        var upRow = document.querySelector('.field-uploaded_audio');
        if (ytRow) ytRow.style.display = isLocal ? 'none' : '';
        if (upRow) upRow.style.display = isLocal ? '' : 'none';
    }
    document.addEventListener('DOMContentLoaded', function () {
        var sel = document.getElementById('id_source_type');
        if (sel) {
            sel.addEventListener('change', toggle);
            toggle();
        }
    });
})();
