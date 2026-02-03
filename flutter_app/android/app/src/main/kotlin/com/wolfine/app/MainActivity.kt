package com.wolfine.app

import android.content.Intent
import android.media.MediaScannerConnection
import android.os.Build
import android.os.Environment
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.wolfine.app/gallery"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "scanFile" -> {
                    val path = call.argument<String>("path")
                    if (path != null) {
                        MediaScannerConnection.scanFile(
                            this,
                            arrayOf(path),
                            null
                        ) { _, uri ->
                            result.success(true)
                        }
                    } else {
                        result.error("INVALID_PATH", "Path is null", null)
                    }
                }
                "saveToGallery" -> {
                    try {
                        val bytes = call.argument<ByteArray>("bytes")
                        val fileName = call.argument<String>("fileName")
                        val isVideo = call.argument<Boolean>("isVideo") ?: false

                        if (bytes != null && fileName != null) {
                            val directory = if (isVideo) {
                                File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), "Timeless AI")
                            } else {
                                File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "Timeless AI")
                            }

                            if (!directory.exists()) {
                                directory.mkdirs()
                            }

                            val file = File(directory, fileName)
                            file.writeBytes(bytes)

                            MediaScannerConnection.scanFile(
                                this,
                                arrayOf(file.absolutePath),
                                null
                            ) { _, _ -> }

                            result.success(file.absolutePath)
                        } else {
                            result.error("INVALID_ARGS", "Missing bytes or fileName", null)
                        }
                    } catch (e: Exception) {
                        result.error("SAVE_ERROR", e.message, null)
                    }
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
    }
}
