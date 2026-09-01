package pro.huyenhoc.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat

// Builds the three notification states of one APK download — separated from
// ApkDownloadService so the service itself stays about download orchestration,
// not notification plumbing (feature-35 §5.1).
class DownloadNotifications(private val context: Context) {

    companion object {
        const val CHANNEL_ID = "apk_download"
        const val NOTIFICATION_ID = 1001
    }

    init {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Cập nhật ứng dụng",
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = "Tiến độ tải bản cập nhật Huyền Học Pro"
            }
            val manager = context.getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    fun progress(percent: Int): Notification =
        baseBuilder()
            .setContentTitle("Đang tải bản cập nhật…")
            .setContentText("$percent%")
            .setProgress(100, percent, false)
            .setOngoing(true)
            .build()

    fun completed(apkPath: String): Notification {
        val intent = Intent(context, InstallApkReceiver::class.java).apply {
            putExtra(InstallApkReceiver.EXTRA_APK_PATH, apkPath)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return baseBuilder()
            .setContentTitle("Tải xong — bấm để cài")
            .setContentText("Bản cập nhật Huyền Học Pro đã sẵn sàng")
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()
    }

    fun failed(): Notification =
        baseBuilder()
            .setContentTitle("Tải thất bại")
            .setContentText("Mở app và bấm Cập nhật để thử lại")
            .setAutoCancel(true)
            .build()

    private fun baseBuilder(): NotificationCompat.Builder =
        NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
}
