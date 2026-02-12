package com.wolfine.app

import android.content.Intent
import android.media.MediaScannerConnection
import android.os.Build
import android.os.Environment
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.io.BufferedReader
import java.io.InputStreamReader

class MainActivity: FlutterActivity() {
    private val GALLERY_CHANNEL = "com.wolfine.app/gallery"
    private val FFMPEG_CHANNEL = "com.wolfine.app/ffmpeg"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // Gallery channel
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, GALLERY_CHANNEL).setMethodCallHandler { call, result ->
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

        // FFmpeg channel for video processing
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, FFMPEG_CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "trimVideo" -> {
                    Thread {
                        try {
                            val inputPath = call.argument<String>("inputPath")!!
                            val outputPath = call.argument<String>("outputPath")!!
                            val startTime = call.argument<Double>("startTime") ?: 0.0
                            val duration = call.argument<Double>("duration") ?: 0.0
                            val speed = call.argument<Double>("speed") ?: 1.0
                            val width = call.argument<Int>("width") ?: 1920
                            val height = call.argument<Int>("height") ?: 1080
                            val fps = call.argument<Int>("fps") ?: 30
                            val bitrate = call.argument<Int>("bitrate") ?: 10000
                            val volume = call.argument<Double>("volume") ?: 1.0

                            // Use Android MediaCodec-based approach via ProcessBuilder
                            // Fallback: copy the file with proper container handling
                            val success = trimVideoNative(inputPath, outputPath, startTime, duration, speed, width, height, fps, bitrate, volume)
                            runOnUiThread { result.success(success) }
                        } catch (e: Exception) {
                            runOnUiThread { result.error("TRIM_ERROR", e.message, null) }
                        }
                    }.start()
                }
                "concatVideos" -> {
                    Thread {
                        try {
                            val concatListPath = call.argument<String>("concatListPath")!!
                            val outputPath = call.argument<String>("outputPath")!!

                            val success = concatVideosNative(concatListPath, outputPath)
                            runOnUiThread { result.success(success) }
                        } catch (e: Exception) {
                            runOnUiThread { result.error("CONCAT_ERROR", e.message, null) }
                        }
                    }.start()
                }
                "generateEndingClip" -> {
                    Thread {
                        try {
                            val outputPath = call.argument<String>("outputPath")!!
                            val duration = call.argument<Double>("duration") ?: 2.0
                            val text = call.argument<String>("text") ?: "Thank You"
                            val bgColor = call.argument<String>("backgroundColor") ?: "000000"
                            val textColor = call.argument<String>("textColor") ?: "FFFFFF"
                            val fontSize = call.argument<Double>("fontSize") ?: 32.0
                            val width = call.argument<Int>("width") ?: 1920
                            val height = call.argument<Int>("height") ?: 1080
                            val fps = call.argument<Int>("fps") ?: 30
                            val bitrate = call.argument<Int>("bitrate") ?: 10000

                            val success = generateEndingClipNative(outputPath, duration, text, bgColor, textColor, fontSize, width, height, fps, bitrate)
                            runOnUiThread { result.success(success) }
                        } catch (e: Exception) {
                            runOnUiThread { result.error("ENDING_ERROR", e.message, null) }
                        }
                    }.start()
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun trimVideoNative(
        inputPath: String, outputPath: String,
        startTime: Double, duration: Double, speed: Double,
        width: Int, height: Int, fps: Int, bitrate: Int, volume: Double
    ): Boolean {
        try {
            val extractor = android.media.MediaExtractor()
            extractor.setDataSource(inputPath)

            val muxer = android.media.MediaMuxer(outputPath, android.media.MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)

            val startUs = (startTime * 1_000_000).toLong()
            val durationUs = (duration * 1_000_000).toLong()
            val endUs = startUs + durationUs

            val trackCount = extractor.trackCount
            val trackIndexMap = mutableMapOf<Int, Int>()

            // Add tracks to muxer
            for (i in 0 until trackCount) {
                val format = extractor.getTrackFormat(i)
                val mime = format.getString(android.media.MediaFormat.KEY_MIME) ?: continue
                if (mime.startsWith("video/") || mime.startsWith("audio/")) {
                    val muxerTrackIndex = muxer.addTrack(format)
                    trackIndexMap[i] = muxerTrackIndex
                }
            }

            if (trackIndexMap.isEmpty()) {
                extractor.release()
                muxer.release()
                return false
            }

            muxer.start()

            val bufferSize = 1024 * 1024 // 1MB buffer
            val buffer = java.nio.ByteBuffer.allocate(bufferSize)
            val bufferInfo = android.media.MediaCodec.BufferInfo()

            for ((extractorTrackIndex, muxerTrackIndex) in trackIndexMap) {
                extractor.selectTrack(extractorTrackIndex)
                extractor.seekTo(startUs, android.media.MediaExtractor.SEEK_TO_CLOSEST_SYNC)

                while (true) {
                    val sampleSize = extractor.readSampleData(buffer, 0)
                    if (sampleSize < 0) break

                    val sampleTime = extractor.sampleTime
                    if (sampleTime > endUs) break

                    if (sampleTime >= startUs) {
                        bufferInfo.offset = 0
                        bufferInfo.size = sampleSize
                        bufferInfo.presentationTimeUs = sampleTime - startUs
                        bufferInfo.flags = extractor.sampleFlags

                        muxer.writeSampleData(muxerTrackIndex, buffer, bufferInfo)
                    }

                    extractor.advance()
                }

                extractor.unselectTrack(extractorTrackIndex)
            }

            muxer.stop()
            muxer.release()
            extractor.release()

            return File(outputPath).exists() && File(outputPath).length() > 0
        } catch (e: Exception) {
            android.util.Log.e("FFmpeg", "trimVideoNative error: ${e.message}")
            return false
        }
    }

    private fun concatVideosNative(concatListPath: String, outputPath: String): Boolean {
        try {
            val listContent = File(concatListPath).readText()
            val filePaths = listContent.lines()
                .filter { it.trim().startsWith("file '") }
                .map { it.trim().removePrefix("file '").removeSuffix("'") }

            if (filePaths.isEmpty()) return false
            if (filePaths.size == 1) {
                File(filePaths.first()).copyTo(File(outputPath), overwrite = true)
                return true
            }

            val muxer = android.media.MediaMuxer(outputPath, android.media.MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)

            // Use the format from the first file
            val firstExtractor = android.media.MediaExtractor()
            firstExtractor.setDataSource(filePaths.first())

            var videoTrackIndex = -1
            var audioTrackIndex = -1
            var muxerVideoTrack = -1
            var muxerAudioTrack = -1

            for (i in 0 until firstExtractor.trackCount) {
                val format = firstExtractor.getTrackFormat(i)
                val mime = format.getString(android.media.MediaFormat.KEY_MIME) ?: continue
                if (mime.startsWith("video/") && videoTrackIndex == -1) {
                    videoTrackIndex = i
                    muxerVideoTrack = muxer.addTrack(format)
                } else if (mime.startsWith("audio/") && audioTrackIndex == -1) {
                    audioTrackIndex = i
                    muxerAudioTrack = muxer.addTrack(format)
                }
            }
            firstExtractor.release()

            muxer.start()

            val bufferSize = 1024 * 1024
            val buffer = java.nio.ByteBuffer.allocate(bufferSize)
            val bufferInfo = android.media.MediaCodec.BufferInfo()
            var timeOffset: Long = 0

            for (filePath in filePaths) {
                val extractor = android.media.MediaExtractor()
                extractor.setDataSource(filePath)

                var maxTimeUs: Long = 0

                // Write video track
                if (videoTrackIndex >= 0 && muxerVideoTrack >= 0) {
                    for (i in 0 until extractor.trackCount) {
                        val format = extractor.getTrackFormat(i)
                        val mime = format.getString(android.media.MediaFormat.KEY_MIME) ?: continue
                        if (mime.startsWith("video/")) {
                            extractor.selectTrack(i)
                            break
                        }
                    }

                    while (true) {
                        val sampleSize = extractor.readSampleData(buffer, 0)
                        if (sampleSize < 0) break

                        bufferInfo.offset = 0
                        bufferInfo.size = sampleSize
                        bufferInfo.presentationTimeUs = extractor.sampleTime + timeOffset
                        bufferInfo.flags = extractor.sampleFlags

                        if (extractor.sampleTime > maxTimeUs) {
                            maxTimeUs = extractor.sampleTime
                        }

                        muxer.writeSampleData(muxerVideoTrack, buffer, bufferInfo)
                        extractor.advance()
                    }

                    extractor.unselectTrack(0)
                }

                // Write audio track
                if (audioTrackIndex >= 0 && muxerAudioTrack >= 0) {
                    for (i in 0 until extractor.trackCount) {
                        val format = extractor.getTrackFormat(i)
                        val mime = format.getString(android.media.MediaFormat.KEY_MIME) ?: continue
                        if (mime.startsWith("audio/")) {
                            extractor.selectTrack(i)
                            break
                        }
                    }

                    while (true) {
                        val sampleSize = extractor.readSampleData(buffer, 0)
                        if (sampleSize < 0) break

                        bufferInfo.offset = 0
                        bufferInfo.size = sampleSize
                        bufferInfo.presentationTimeUs = extractor.sampleTime + timeOffset
                        bufferInfo.flags = extractor.sampleFlags

                        if (extractor.sampleTime > maxTimeUs) {
                            maxTimeUs = extractor.sampleTime
                        }

                        muxer.writeSampleData(muxerAudioTrack, buffer, bufferInfo)
                        extractor.advance()
                    }
                }

                timeOffset += maxTimeUs + 33333 // Add ~1 frame gap to avoid overlap
                extractor.release()
            }

            muxer.stop()
            muxer.release()

            return File(outputPath).exists() && File(outputPath).length() > 0
        } catch (e: Exception) {
            android.util.Log.e("FFmpeg", "concatVideosNative error: ${e.message}")
            return false
        }
    }

    private fun generateEndingClipNative(
        outputPath: String, duration: Double, text: String,
        bgColor: String, textColor: String, fontSize: Double,
        width: Int, height: Int, fps: Int, bitrate: Int
    ): Boolean {
        try {
            // Create a solid color frame with text using Canvas
            val bitmap = android.graphics.Bitmap.createBitmap(width, height, android.graphics.Bitmap.Config.ARGB_8888)
            val canvas = android.graphics.Canvas(bitmap)

            // Draw background
            val bgPaint = android.graphics.Paint()
            bgPaint.color = android.graphics.Color.parseColor("#$bgColor")
            canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), bgPaint)

            // Draw text
            val textPaint = android.graphics.Paint()
            textPaint.color = android.graphics.Color.parseColor("#$textColor")
            textPaint.textSize = fontSize.toFloat() * (width / 1080f) // Scale font relative to resolution
            textPaint.isAntiAlias = true
            textPaint.textAlign = android.graphics.Paint.Align.CENTER
            textPaint.typeface = android.graphics.Typeface.DEFAULT_BOLD

            val xPos = width / 2f
            val yPos = height / 2f - (textPaint.descent() + textPaint.ascent()) / 2f
            canvas.drawText(text, xPos, yPos, textPaint)

            // Encode bitmap frames to video using MediaCodec + MediaMuxer
            val mimeType = "video/avc"
            val format = android.media.MediaFormat.createVideoFormat(mimeType, width, height)
            format.setInteger(android.media.MediaFormat.KEY_COLOR_FORMAT,
                android.media.MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface)
            format.setInteger(android.media.MediaFormat.KEY_BIT_RATE, bitrate * 1000)
            format.setInteger(android.media.MediaFormat.KEY_FRAME_RATE, fps)
            format.setInteger(android.media.MediaFormat.KEY_I_FRAME_INTERVAL, 1)

            val codec = android.media.MediaCodec.createEncoderByType(mimeType)
            codec.configure(format, null, null, android.media.MediaCodec.CONFIGURE_FLAG_ENCODE)

            val inputSurface = codec.createInputSurface()
            codec.start()

            val muxer = android.media.MediaMuxer(outputPath, android.media.MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
            var muxerTrackIndex = -1
            var muxerStarted = false

            val totalFrames = (duration * fps).toInt()
            val frameDurationUs = (1_000_000L / fps)

            val bufferInfo = android.media.MediaCodec.BufferInfo()

            for (frameIndex in 0 until totalFrames) {
                // Draw the bitmap to the input surface
                val surfaceCanvas = inputSurface.lockCanvas(null)
                surfaceCanvas.drawBitmap(bitmap, 0f, 0f, null)
                inputSurface.unlockCanvasAndPost(surfaceCanvas)

                // Drain encoder output
                drainEncoder(codec, muxer, bufferInfo, muxerTrackIndex, muxerStarted).let { (track, started) ->
                    muxerTrackIndex = track
                    muxerStarted = started
                }
            }

            // Signal end of stream
            codec.signalEndOfInputStream()

            // Drain remaining
            var draining = true
            while (draining) {
                val outputBufferIndex = codec.dequeueOutputBuffer(bufferInfo, 10000)
                when {
                    outputBufferIndex == android.media.MediaCodec.INFO_TRY_AGAIN_LATER -> draining = false
                    outputBufferIndex == android.media.MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
                        if (!muxerStarted) {
                            muxerTrackIndex = muxer.addTrack(codec.outputFormat)
                            muxer.start()
                            muxerStarted = true
                        }
                    }
                    outputBufferIndex >= 0 -> {
                        val encodedData = codec.getOutputBuffer(outputBufferIndex)
                        if (encodedData != null && bufferInfo.size > 0 && muxerStarted) {
                            encodedData.position(bufferInfo.offset)
                            encodedData.limit(bufferInfo.offset + bufferInfo.size)
                            muxer.writeSampleData(muxerTrackIndex, encodedData, bufferInfo)
                        }
                        codec.releaseOutputBuffer(outputBufferIndex, false)
                        if (bufferInfo.flags and android.media.MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
                            draining = false
                        }
                    }
                }
            }

            codec.stop()
            codec.release()
            inputSurface.release()
            if (muxerStarted) {
                muxer.stop()
            }
            muxer.release()
            bitmap.recycle()

            return File(outputPath).exists() && File(outputPath).length() > 0
        } catch (e: Exception) {
            android.util.Log.e("FFmpeg", "generateEndingClipNative error: ${e.message}")
            return false
        }
    }

    private fun drainEncoder(
        codec: android.media.MediaCodec,
        muxer: android.media.MediaMuxer,
        bufferInfo: android.media.MediaCodec.BufferInfo,
        currentTrackIndex: Int,
        currentMuxerStarted: Boolean
    ): Pair<Int, Boolean> {
        var trackIndex = currentTrackIndex
        var muxerStarted = currentMuxerStarted

        while (true) {
            val outputBufferIndex = codec.dequeueOutputBuffer(bufferInfo, 0)
            when {
                outputBufferIndex == android.media.MediaCodec.INFO_TRY_AGAIN_LATER -> return Pair(trackIndex, muxerStarted)
                outputBufferIndex == android.media.MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
                    if (!muxerStarted) {
                        trackIndex = muxer.addTrack(codec.outputFormat)
                        muxer.start()
                        muxerStarted = true
                    }
                }
                outputBufferIndex >= 0 -> {
                    val encodedData = codec.getOutputBuffer(outputBufferIndex)
                    if (encodedData != null && bufferInfo.size > 0 && muxerStarted) {
                        encodedData.position(bufferInfo.offset)
                        encodedData.limit(bufferInfo.offset + bufferInfo.size)
                        muxer.writeSampleData(trackIndex, encodedData, bufferInfo)
                    }
                    codec.releaseOutputBuffer(outputBufferIndex, false)
                }
            }
        }
    }
}