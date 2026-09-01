package pro.huyenhoc.app

import android.app.Service
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.ServiceCompat
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

// Foreground Service that downloads the update APK outside the Flutter
// isolate, so the transfer survives the app leaving the foreground or being
// swiped away (feature-35 §3). Talks to Dart through ApkDownloaderPlugin's
// MethodChannel/EventChannel and persists its own last-known state so a
// killed-and-relaunched app can recover without re-downloading (feature-35
// §3.4).
class ApkDownloadService : Service() {

    companion object {
        const val ACTION_START = "pro.huyenhoc.app.action.START_DOWNLOAD"
        const val EXTRA_URL = "url"
        const val EXTRA_SHA256 = "sha256"
        const val EXTRA_VERSION_CODE = "version_code"

        const val PREFS_NAME = "apk_download_state"
        const val KEY_STATE = "state"
        const val KEY_PATH = "path"
        const val KEY_VERSION_CODE = "version_code"

        const val STATE_IDLE = "idle"
        const val STATE_DOWNLOADING = "downloading"
        const val STATE_COMPLETED = "completed"
        const val STATE_FAILED = "failed"

        private const val PROGRESS_STEP_PERCENT = 1

        fun prefs(context: android.content.Context): SharedPreferences =
            context.getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE)

        /// A dedicated file, read only through ApkDownloaderPlugin's
        /// getDownloadStatus() MethodChannel call — deliberately not shared with
        /// the Dart `shared_preferences` plugin, whose default file/key-prefix
        /// convention this Kotlin-only Service has no reason to depend on
        /// (feature-35 §6).
        fun readStatus(context: android.content.Context): Map<String, Any?> {
            val p = prefs(context)
            return mapOf(
                "state" to (p.getString(KEY_STATE, STATE_IDLE) ?: STATE_IDLE),
                "path" to p.getString(KEY_PATH, null),
                "versionCode" to if (p.contains(KEY_VERSION_CODE)) p.getInt(KEY_VERSION_CODE, 0) else null,
            )
        }
    }

    private var downloadThread: Thread? = null
    private lateinit var notifications: DownloadNotifications

    override fun onCreate() {
        super.onCreate()
        Log.d("ApkDownloadService", "onCreate: entered at ${System.currentTimeMillis()}")
        notifications = DownloadNotifications(this)
        Log.d("ApkDownloadService", "onCreate: done at ${System.currentTimeMillis()}")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action != ACTION_START) {
            stopSelf()
            return START_NOT_STICKY
        }

        // A second tap on "Cập nhật" while one download is already running must
        // not start a competing transfer into the same file.
        if (downloadThread?.isAlive == true) {
            return START_NOT_STICKY
        }

        val url = intent.getStringExtra(EXTRA_URL)
        val expectedSha256 = intent.getStringExtra(EXTRA_SHA256)
        val versionCode = intent.getIntExtra(EXTRA_VERSION_CODE, 0)
        if (url == null) {
            stopSelf()
            return START_NOT_STICKY
        }

        // The 2-arg startForeground() leaves the type to be inferred from the
        // manifest alone, which Android 14+ (targetSdk 36 here) does not treat
        // as equivalent — ServiceCompat.startForeground() with the type passed
        // explicitly is what actually registers it, without which the system
        // logs "does not have any types" and kills the service on a short
        // timeout regardless of the manifest's android:foregroundServiceType.
        Log.d("ApkDownloadService", "onStartCommand: entered at ${System.currentTimeMillis()}")
        ServiceCompat.startForeground(
            this,
            DownloadNotifications.NOTIFICATION_ID,
            notifications.progress(0),
            ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
        )
        Log.d("ApkDownloadService", "onStartCommand: startForeground returned at ${System.currentTimeMillis()}")
        writeState(STATE_DOWNLOADING, path = null, versionCode = versionCode)

        downloadThread = Thread {
            runDownload(url, expectedSha256, versionCode)
        }.also { it.start() }

        return START_NOT_STICKY
    }

    private fun runDownload(url: String, expectedSha256: String?, versionCode: Int) {
        val outputFile = File(getExternalFilesDir(null), "huyenhoc-$versionCode.apk")
        try {
            val connection = URL(url).openConnection() as HttpURLConnection
            connection.connect()
            val total = connection.contentLength

            val digest = MessageDigest.getInstance("SHA-256")
            connection.inputStream.use { input ->
                outputFile.outputStream().use { output ->
                    val buffer = ByteArray(64 * 1024)
                    var received = 0
                    var lastReportedPercent = -1
                    while (true) {
                        val read = input.read(buffer)
                        if (read == -1) break
                        output.write(buffer, 0, read)
                        digest.update(buffer, 0, read)
                        received += read

                        if (total > 0) {
                            val percent = (received * 100 / total)
                            if (percent - lastReportedPercent >= PROGRESS_STEP_PERCENT) {
                                lastReportedPercent = percent
                                onProgress(percent, received, total)
                            }
                        }
                    }
                }
            }
            connection.disconnect()

            val actualSha256 = digest.digest().joinToString("") { "%02x".format(it) }
            if (expectedSha256 != null && !expectedSha256.equals(actualSha256, ignoreCase = true)) {
                outputFile.delete()
                onFailed("sha256 mismatch")
                return
            }

            onCompleted(outputFile.absolutePath, versionCode)
        } catch (e: Exception) {
            Log.e("ApkDownloadService", "Download failed for $url", e)
            outputFile.delete()
            onFailed(e.message ?: "download failed")
        }
    }

    private fun onProgress(percent: Int, received: Int, total: Int) {
        val manager = getSystemService(android.app.NotificationManager::class.java)
        manager.notify(DownloadNotifications.NOTIFICATION_ID, notifications.progress(percent))
        ApkDownloaderPlugin.emitProgress(percent, received, total)
    }

    private fun onCompleted(path: String, versionCode: Int) {
        writeState(STATE_COMPLETED, path = path, versionCode = versionCode)
        val manager = getSystemService(android.app.NotificationManager::class.java)
        manager.notify(DownloadNotifications.NOTIFICATION_ID, notifications.completed(path))
        ApkDownloaderPlugin.emitCompleted(path)
        stopSelfSafely()
    }

    private fun onFailed(reason: String) {
        writeState(STATE_FAILED, path = null, versionCode = null)
        val manager = getSystemService(android.app.NotificationManager::class.java)
        manager.notify(DownloadNotifications.NOTIFICATION_ID, notifications.failed())
        ApkDownloaderPlugin.emitFailed(reason)
        stopSelfSafely()
    }

    private fun writeState(state: String, path: String?, versionCode: Int?) {
        prefs(this).edit().apply {
            putString(KEY_STATE, state)
            if (path != null) putString(KEY_PATH, path) else remove(KEY_PATH)
            if (versionCode != null) putInt(KEY_VERSION_CODE, versionCode) else remove(KEY_VERSION_CODE)
        }.apply()
    }

    private fun stopSelfSafely() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_DETACH)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(false)
        }
        stopSelf()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
