package com.ivsquare.production
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.res.Configuration
import android.os.Build
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.ivsquare.production.ShareIntentPackage
import com.ivsquare.production.updater.NativeAppUpdaterPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
          add(ShareIntentPackage())
          add(NativeAppUpdaterPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    createProductionNotificationChannel()
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  private fun createProductionNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val channel = NotificationChannel(
      "iv_production_alerts",
      "Production alerts",
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "Production zinc consumption and operational alerts"
      enableVibration(true)
    }

    getSystemService(NotificationManager::class.java)
      .createNotificationChannel(channel)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
