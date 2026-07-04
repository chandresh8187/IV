package com.ivsquare.production

import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ShareIntentModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "ShareIntentModule"
    }

    @ReactMethod
    fun getSharedPdf(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity

            if (activity == null) {
                promise.resolve(null)
                return
            }

            val intent = activity.intent

            if (intent == null || intent.action != Intent.ACTION_SEND) {
                promise.resolve(null)
                return
            }

            val uri: Uri? = intent.getParcelableExtra(Intent.EXTRA_STREAM)

            if (uri == null) {
                promise.resolve(null)
                return
            }

            val result = Arguments.createMap()
            result.putString("uri", uri.toString())
            result.putString("name", "shared-challan.pdf")
            result.putString("type", "application/pdf")

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("SHARE_INTENT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearSharedPdf() {
        val activity = reactApplicationContext.currentActivity
        activity?.intent?.removeExtra(Intent.EXTRA_STREAM)
    }
}