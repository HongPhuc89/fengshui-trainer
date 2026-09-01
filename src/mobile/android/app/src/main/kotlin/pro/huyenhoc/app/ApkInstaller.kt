package pro.huyenhoc.app

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import java.io.File

// The FileProvider logic for handing a downloaded APK to the system
// installer, kept separate from MainActivity for clarity.
object ApkInstaller {

    /// Returns whether the installer was launched: false when the file is
    /// missing at the given path.
    fun install(context: Context, path: String): Boolean {
        val file = File(path)
        if (!file.exists()) return false

        // A file:// URI throws FileUriExposedException from Android 7 on, so the
        // installer gets a content:// URI from our FileProvider instead.
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file,
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        return true
    }
}
