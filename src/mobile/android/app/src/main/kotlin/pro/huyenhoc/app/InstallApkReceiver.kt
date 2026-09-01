package pro.huyenhoc.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// Handles a tap on the "Download complete" notification when the app has
// already been killed. A BroadcastReceiver runs without needing the Flutter
// engine alive, unlike a MethodChannel call — it opens the installer straight
// from onReceive() with its own Context (feature-35 §5.4).
class InstallApkReceiver : BroadcastReceiver() {
    companion object {
        const val EXTRA_APK_PATH = "apk_path"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val path = intent.getStringExtra(EXTRA_APK_PATH) ?: return
        ApkInstaller.install(context, path)
    }
}
