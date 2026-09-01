package pro.huyenhoc.app

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel

// Bridges Dart and ApkDownloadService: startDownload/getDownloadStatus over a
// MethodChannel, download progress/completed/failed over an EventChannel
// (feature-35 §3.2, §3.3). A singleton object rather than an instance tied to
// MainActivity, because the Service — running on its own thread, with no
// Activity context — is what calls emitProgress/emitCompleted/emitFailed.
object ApkDownloaderPlugin {
    private const val METHOD_CHANNEL = "pro.huyenhoc.app/downloader"
    private const val EVENT_CHANNEL = "pro.huyenhoc.app/downloader/events"

    private var eventSink: EventChannel.EventSink? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    fun register(context: Context, messenger: io.flutter.plugin.common.BinaryMessenger) {
        MethodChannel(messenger, METHOD_CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "startDownload" -> {
                    val url = call.argument<String>("url")
                    val sha256 = call.argument<String>("sha256")
                    val versionCode = call.argument<Int>("versionCode")
                    if (url == null || versionCode == null) {
                        result.error("BAD_ARGS", "url and versionCode are required", null)
                        return@setMethodCallHandler
                    }
                    startDownload(context, url, sha256, versionCode)
                    result.success(null)
                }
                "getDownloadStatus" -> result.success(ApkDownloadService.readStatus(context))
                else -> result.notImplemented()
            }
        }

        EventChannel(messenger, EVENT_CHANNEL).setStreamHandler(
            object : EventChannel.StreamHandler {
                override fun onListen(arguments: Any?, sink: EventChannel.EventSink) {
                    eventSink = sink
                }

                override fun onCancel(arguments: Any?) {
                    eventSink = null
                }
            },
        )
    }

    private fun startDownload(context: Context, url: String, sha256: String?, versionCode: Int) {
        val intent = Intent(context, ApkDownloadService::class.java).apply {
            action = ApkDownloadService.ACTION_START
            putExtra(ApkDownloadService.EXTRA_URL, url)
            putExtra(ApkDownloadService.EXTRA_SHA256, sha256)
            putExtra(ApkDownloadService.EXTRA_VERSION_CODE, versionCode)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }

    // Called from the Service's download thread — post to the main thread
    // since the EventChannel sink is not thread-safe.
    fun emitProgress(percent: Int, received: Int, total: Int) = post(
        mapOf("type" to "progress", "percent" to percent, "received" to received, "total" to total),
    )

    fun emitCompleted(path: String) = post(mapOf("type" to "completed", "path" to path))

    fun emitFailed(reason: String) = post(mapOf("type" to "failed", "reason" to reason))

    private fun post(event: Map<String, Any?>) {
        mainHandler.post { eventSink?.success(event) }
    }
}
