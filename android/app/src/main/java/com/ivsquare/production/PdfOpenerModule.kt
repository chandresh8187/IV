package com.ivsquare.production

import android.content.Intent
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import java.io.File

class PdfOpenerModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "PdfOpenerModule"

    @ReactMethod
    fun openPdf(filePath: String, promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "Activity not found")
                return
            }

            val file = File(filePath)

            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "PDF file not found")
                return
            }

            val uri = FileProvider.getUriForFile(
                activity,
                "${activity.packageName}.fileprovider",
                file
            )

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/pdf")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val chooser = Intent.createChooser(intent, "Open PDF with")
            activity.startActivity(chooser)

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("OPEN_PDF_ERROR", e.message, e)
        }
    }
}