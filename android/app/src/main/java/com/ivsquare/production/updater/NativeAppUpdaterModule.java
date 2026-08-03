package com.ivsquare.production.updater;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;

import androidx.annotation.NonNull;
import androidx.core.content.FileProvider;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.File;
import java.io.FileInputStream;
import java.security.MessageDigest;
import java.util.Locale;

public class NativeAppUpdaterModule extends ReactContextBaseJavaModule {
  private static final String EVENT_NAME = "NativeAppUpdateEvent";
  private static final long POLL_INTERVAL_MS = 500L;

  private final ReactApplicationContext reactContext;
  private final Handler handler = new Handler(Looper.getMainLooper());
  private DownloadManager downloadManager;
  private long activeDownloadId = -1L;
  private File activeApkFile;
  private String expectedSha256;
  private boolean receiverRegistered = false;

  public NativeAppUpdaterModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
    this.downloadManager =
        (DownloadManager) reactContext.getSystemService(Context.DOWNLOAD_SERVICE);
  }

  @NonNull
  @Override
  public String getName() {
    return "NativeAppUpdater";
  }

  @ReactMethod
  public void getCurrentVersion(Promise promise) {
    try {
      PackageInfo packageInfo = reactContext
          .getPackageManager()
          .getPackageInfo(reactContext.getPackageName(), 0);

      long versionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
          ? packageInfo.getLongVersionCode()
          : packageInfo.versionCode;

      WritableMap result = Arguments.createMap();
      result.putDouble("versionCode", versionCode);
      result.putString("versionName", packageInfo.versionName == null ? "" : packageInfo.versionName);
      promise.resolve(result);
    } catch (Exception error) {
      promise.reject("VERSION_READ_FAILED", "Unable to read the installed app version.", error);
    }
  }

  @ReactMethod
  public void canRequestPackageInstalls(Promise promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      promise.resolve(true);
      return;
    }

    promise.resolve(reactContext.getPackageManager().canRequestPackageInstalls());
  }

  @ReactMethod
  public void openInstallPermissionSettings(Promise promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        promise.resolve(true);
        return;
      }

      Intent intent = new Intent(
          Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
          Uri.parse("package:" + reactContext.getPackageName())
      );
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      reactContext.startActivity(intent);
      promise.resolve(true);
    } catch (Exception error) {
      promise.reject("SETTINGS_OPEN_FAILED", "Unable to open installation settings.", error);
    }
  }

  @ReactMethod
  public void downloadAndInstall(
      String apkUrl,
      String sha256,
      double requestedVersionCode,
      Promise promise
  ) {
    try {
      if (activeDownloadId != -1L) {
        promise.reject("DOWNLOAD_ACTIVE", "An app update is already downloading.");
        return;
      }

      Uri uri = Uri.parse(apkUrl);
      if (!"https".equalsIgnoreCase(uri.getScheme())) {
        promise.reject("INSECURE_URL", "The APK download URL must use HTTPS.");
        return;
      }

      String normalizedSha = sha256 == null ? "" : sha256.trim().toLowerCase(Locale.US);
      if (!normalizedSha.matches("^[a-f0-9]{64}$")) {
        promise.reject("INVALID_SHA256", "The server did not provide a valid APK SHA-256 hash.");
        return;
      }

      if (
          Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
          !reactContext.getPackageManager().canRequestPackageInstalls()
      ) {
        promise.reject("INSTALL_PERMISSION_REQUIRED", "Allow IV APP to install unknown apps first.");
        return;
      }

      long versionCode = Math.max(1L, (long) requestedVersionCode);
      String fileName = "iv-production-v" + versionCode + ".apk";
      File downloadsDir = reactContext.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
      if (downloadsDir == null) {
        promise.reject("STORAGE_UNAVAILABLE", "The app update directory is unavailable.");
        return;
      }

      activeApkFile = new File(downloadsDir, fileName);
      if (activeApkFile.exists() && !activeApkFile.delete()) {
        promise.reject("OLD_APK_DELETE_FAILED", "Unable to replace an earlier APK download.");
        activeApkFile = null;
        return;
      }

      DownloadManager.Request request = new DownloadManager.Request(uri)
          .setTitle("IV APP update")
          .setDescription("Downloading version " + versionCode)
          .setMimeType("application/vnd.android.package-archive")
          .setNotificationVisibility(
              DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
          )
          .setAllowedOverMetered(true)
          .setAllowedOverRoaming(false)
          .setDestinationInExternalFilesDir(
              reactContext,
              Environment.DIRECTORY_DOWNLOADS,
              fileName
          );

      expectedSha256 = normalizedSha;
      registerDownloadReceiver();
      activeDownloadId = downloadManager.enqueue(request);
      startProgressPolling();
      promise.resolve((double) activeDownloadId);
    } catch (Exception error) {
      clearActiveDownload();
      promise.reject("DOWNLOAD_START_FAILED", "Unable to start the APK download.", error);
    }
  }

  private final BroadcastReceiver downloadReceiver = new BroadcastReceiver() {
    @Override
    public void onReceive(Context context, Intent intent) {
      long completedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
      if (completedId != activeDownloadId) {
        return;
      }

      handler.removeCallbacks(progressRunnable);
      handleCompletedDownload();
    }
  };

  private void registerDownloadReceiver() {
    if (receiverRegistered) {
      return;
    }

    IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      reactContext.registerReceiver(downloadReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
    } else {
      reactContext.registerReceiver(downloadReceiver, filter);
    }
    receiverRegistered = true;
  }

  private void startProgressPolling() {
    handler.removeCallbacks(progressRunnable);
    handler.post(progressRunnable);
  }

  private final Runnable progressRunnable = new Runnable() {
    @Override
    public void run() {
      if (activeDownloadId == -1L) {
        return;
      }

      DownloadManager.Query query = new DownloadManager.Query().setFilterById(activeDownloadId);
      try (android.database.Cursor cursor = downloadManager.query(query)) {
        if (cursor != null && cursor.moveToFirst()) {
          int downloadedIndex = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR);
          int totalIndex = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES);
          int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
          long downloaded = downloadedIndex >= 0 ? cursor.getLong(downloadedIndex) : 0L;
          long total = totalIndex >= 0 ? cursor.getLong(totalIndex) : -1L;
          int status = statusIndex >= 0 ? cursor.getInt(statusIndex) : 0;

          if (total > 0L) {
            int progress = (int) Math.min(100L, (downloaded * 100L) / total);
            WritableMap payload = Arguments.createMap();
            payload.putString("type", "progress");
            payload.putInt("progress", progress);
            emit(payload);
          }

          if (status == DownloadManager.STATUS_FAILED) {
            emitError("Android Download Manager could not download the update.");
            clearActiveDownload();
            return;
          }
        }
      } catch (Exception error) {
        emitError("Unable to read update download progress.");
        clearActiveDownload();
        return;
      }

      handler.postDelayed(this, POLL_INTERVAL_MS);
    }
  };

  private void handleCompletedDownload() {
    DownloadManager.Query query = new DownloadManager.Query().setFilterById(activeDownloadId);
    try (android.database.Cursor cursor = downloadManager.query(query)) {
      if (cursor == null || !cursor.moveToFirst()) {
        emitError("The downloaded update could not be found.");
        clearActiveDownload();
        return;
      }

      int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
      int status = statusIndex >= 0 ? cursor.getInt(statusIndex) : 0;
      if (status != DownloadManager.STATUS_SUCCESSFUL || activeApkFile == null) {
        emitError("The APK download did not complete successfully.");
        clearActiveDownload();
        return;
      }

      WritableMap verifying = Arguments.createMap();
      verifying.putString("type", "verifying");
      emit(verifying);

      String actualSha256 = calculateSha256(activeApkFile);
      if (!expectedSha256.equalsIgnoreCase(actualSha256)) {
        activeApkFile.delete();
        emitError("Update verification failed. The downloaded APK was removed.");
        clearActiveDownload();
        return;
      }

      openPackageInstaller(activeApkFile);
    } catch (Exception error) {
      emitError("Unable to verify or install the downloaded update.");
      clearActiveDownload();
    }
  }

  private String calculateSha256(File file) throws Exception {
    MessageDigest digest = MessageDigest.getInstance("SHA-256");
    byte[] buffer = new byte[8192];
    int count;

    try (FileInputStream stream = new FileInputStream(file)) {
      while ((count = stream.read(buffer)) > 0) {
        digest.update(buffer, 0, count);
      }
    }

    StringBuilder result = new StringBuilder();
    for (byte value : digest.digest()) {
      result.append(String.format(Locale.US, "%02x", value));
    }
    return result.toString();
  }

  private void openPackageInstaller(File apkFile) {
    Uri apkUri = FileProvider.getUriForFile(
        reactContext,
        reactContext.getPackageName() + ".update-file-provider",
        apkFile
    );

    Intent installIntent = new Intent(Intent.ACTION_VIEW);
    installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
    installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

    WritableMap installing = Arguments.createMap();
    installing.putString("type", "installing");
    emit(installing);

    reactContext.startActivity(installIntent);
    clearActiveDownload();
  }

  private void emitError(String message) {
    WritableMap payload = Arguments.createMap();
    payload.putString("type", "error");
    payload.putString("message", message);
    emit(payload);
  }

  private void emit(WritableMap payload) {
    if (reactContext.hasActiveReactInstance()) {
      reactContext
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
          .emit(EVENT_NAME, payload);
    }
  }

  private void clearActiveDownload() {
    handler.removeCallbacks(progressRunnable);
    activeDownloadId = -1L;
    activeApkFile = null;
    expectedSha256 = null;
    if (receiverRegistered) {
      try {
        reactContext.unregisterReceiver(downloadReceiver);
      } catch (Exception ignored) {
      }
      receiverRegistered = false;
    }
  }

  @ReactMethod
  public void addListener(String eventName) {
    // Required by NativeEventEmitter.
  }

  @ReactMethod
  public void removeListeners(double count) {
    // Required by NativeEventEmitter.
  }

  @Override
  public void invalidate() {
    super.invalidate();
    clearActiveDownload();
  }
}
