package com.anonymous.LaundryClassifier

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import org.tensorflow.lite.InterpreterApi
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder

class LaundryYOLOModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var interpreter: InterpreterApi? = null

    private val INPUT_SIZE = 640
    private val NUM_BOXES = 8400
    private val NUM_CLASSES = 38
    private val OUTPUT_CHANNELS = 42 // 4(bbox) + 38(classes)
    private val CONF_THRESHOLD = 0.25f
    private val IOU_THRESHOLD = 0.45f

    override fun getName(): String = "LaundryYOLO"

    @ReactMethod
    fun loadModel(promise: Promise) {
        try {
            val startTime = System.currentTimeMillis()

            val modelFile = File(reactContext.assets.open("models/best_int8.tflite").use { input ->
                val tempFile = File.createTempFile("laundry_model", ".tflite", reactContext.cacheDir)
                tempFile.outputStream().use { output ->
                    input.copyTo(output)
                }
                tempFile.absolutePath
            })

            val options = InterpreterApi.Options()
            options.setNumThreads(4)

            interpreter = InterpreterApi.create(modelFile, options)

            val elapsed = System.currentTimeMillis() - startTime
            android.util.Log.d(TAG, "Model loaded (${elapsed}ms)")

            promise.resolve("Model loaded successfully")
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Model load failed: ${e.message}")
            promise.reject("LOAD_ERROR", "Model load failed: ${e.message}", e)
        }
    }

    @ReactMethod
    fun runInference(imagePath: String, promise: Promise) {
        try {
            val totalStart = System.currentTimeMillis()

            if (interpreter == null) {
                promise.reject("MODEL_NOT_LOADED", "Model not loaded")
                return
            }

            // 1. Load image
            val file = File(imagePath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "Image not found: $imagePath")
                return
            }

            val bitmap = BitmapFactory.decodeFile(imagePath) ?: run {
                promise.reject("DECODE_ERROR", "Image decode failed")
                return
            }

            // 2. Resize to 640x640
            val resizedBitmap = if (bitmap.width != INPUT_SIZE || bitmap.height != INPUT_SIZE) {
                val scaled = Bitmap.createScaledBitmap(bitmap, INPUT_SIZE, INPUT_SIZE, true)
                bitmap.recycle()
                scaled
            } else {
                bitmap
            }

            // 3. Convert to float32 tensor [1, 640, 640, 3] NHWC
            val inputBuffer = bitmapToTensor(resizedBitmap)
            resizedBitmap.recycle()

            // 4. Run inference - output [1, 42, 8400]
            val outputArray = Array(1) { Array(OUTPUT_CHANNELS) { FloatArray(NUM_BOXES) } }
            interpreter?.run(inputBuffer, outputArray)

            val inferenceTime = System.currentTimeMillis() - totalStart
            android.util.Log.d(TAG, "Inference: ${inferenceTime}ms")

            // 5. Post-process
            val detections = postprocess(outputArray[0])

            // 6. Build result
            val result = WritableNativeMap()
            val detectionsArray = WritableNativeArray()

            for (det in detections) {
                val detMap = WritableNativeMap()
                detMap.putDouble("x1", det.x1.toDouble())
                detMap.putDouble("y1", det.y1.toDouble())
                detMap.putDouble("x2", det.x2.toDouble())
                detMap.putDouble("y2", det.y2.toDouble())
                detMap.putDouble("confidence", det.confidence.toDouble())
                detMap.putInt("classId", det.classId)

                val bboxArray = WritableNativeArray()
                bboxArray.pushDouble(det.x1.toDouble())
                bboxArray.pushDouble(det.y1.toDouble())
                bboxArray.pushDouble(det.x2.toDouble())
                bboxArray.pushDouble(det.y2.toDouble())
                detMap.putArray("bbox", bboxArray)

                detectionsArray.pushMap(detMap)
            }

            result.putArray("detections", detectionsArray)
            result.putInt("count", detections.size)
            result.putInt("inferenceTime", (System.currentTimeMillis() - totalStart).toInt())

            android.util.Log.d(TAG, "Result: ${detections.size} detections")
            promise.resolve(result)

        } catch (e: Exception) {
            android.util.Log.e(TAG, "Inference failed: ${e.message}")
            e.printStackTrace()
            promise.reject("INFERENCE_ERROR", "Inference failed: ${e.message}", e)
        }
    }

    private fun bitmapToTensor(bitmap: Bitmap): ByteBuffer {
        val buffer = ByteBuffer.allocateDirect(INPUT_SIZE * INPUT_SIZE * 3 * 4)
        buffer.order(ByteOrder.nativeOrder())

        val pixels = IntArray(INPUT_SIZE * INPUT_SIZE)
        bitmap.getPixels(pixels, 0, INPUT_SIZE, 0, 0, INPUT_SIZE, INPUT_SIZE)

        for (pixel in pixels) {
            val r = ((pixel shr 16) and 0xFF) / 255.0f
            val g = ((pixel shr 8) and 0xFF) / 255.0f
            val b = (pixel and 0xFF) / 255.0f

            buffer.putFloat(r)
            buffer.putFloat(g)
            buffer.putFloat(b)
        }

        buffer.rewind()
        return buffer
    }

    private fun postprocess(output: Array<FloatArray>): List<Detection> {
        // output shape: [42, 8400]
        // rows 0-3: xywh (normalized 0~1), rows 4-41: class scores

        val allDetections = mutableListOf<Detection>()

        for (i in 0 until NUM_BOXES) {
            var maxScore = 0f
            var maxClassId = 0

            for (c in 0 until NUM_CLASSES) {
                val score = output[4 + c][i]
                if (score > maxScore) {
                    maxScore = score
                    maxClassId = c
                }
            }

            if (maxScore < CONF_THRESHOLD) continue

            // bbox is normalized (0~1), scale to INPUT_SIZE pixels
            val xCenter = output[0][i] * INPUT_SIZE
            val yCenter = output[1][i] * INPUT_SIZE
            val width = output[2][i] * INPUT_SIZE
            val height = output[3][i] * INPUT_SIZE

            allDetections.add(Detection(
                x1 = xCenter - width / 2,
                y1 = yCenter - height / 2,
                x2 = xCenter + width / 2,
                y2 = yCenter + height / 2,
                confidence = maxScore,
                classId = maxClassId
            ))
        }

        return applyNMS(allDetections)
    }

    private fun applyNMS(detections: List<Detection>): List<Detection> {
        if (detections.isEmpty()) return emptyList()

        val sorted = detections.sortedByDescending { it.confidence }.toMutableList()
        val keep = mutableListOf<Detection>()

        while (sorted.isNotEmpty()) {
            val current = sorted.removeAt(0)
            keep.add(current)

            sorted.removeAll { other ->
                calculateIoU(current, other) > IOU_THRESHOLD
            }
        }

        return keep
    }

    private fun calculateIoU(a: Detection, b: Detection): Float {
        val x1 = maxOf(a.x1, b.x1)
        val y1 = maxOf(a.y1, b.y1)
        val x2 = minOf(a.x2, b.x2)
        val y2 = minOf(a.y2, b.y2)

        val intersection = maxOf(0f, x2 - x1) * maxOf(0f, y2 - y1)
        val area1 = (a.x2 - a.x1) * (a.y2 - a.y1)
        val area2 = (b.x2 - b.x1) * (b.y2 - b.y1)
        val union = area1 + area2 - intersection

        return if (union > 0) intersection / union else 0f
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        interpreter?.close()
    }

    data class Detection(
        val x1: Float,
        val y1: Float,
        val x2: Float,
        val y2: Float,
        val confidence: Float,
        val classId: Int
    )

    companion object {
        private const val TAG = "LaundryYOLO"
    }
}
