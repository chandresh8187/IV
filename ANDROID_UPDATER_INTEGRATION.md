# Native Android updater integration

The unified OTA/native update popup and API client are already connected in
`App.js`. Also complete `UNIFIED_UPDATE_SETUP.md`.
The uploaded project did not contain its real `android/` directory, so complete
the following native merge in the current project.

## 1. Copy the native files

Copy:

```text
android-updater-files/NativeAppUpdaterModule.java
android-updater-files/NativeAppUpdaterPackage.java
```

to:

```text
android/app/src/main/java/com/ivsquare/production/updater/
```

Copy:

```text
android-updater-files/update_file_paths.xml
```

to:

```text
android/app/src/main/res/xml/update_file_paths.xml
```

Create the `xml` directory if it does not exist.

## 2. Register the package

In `MainApplication.kt`, import the package:

```kotlin
import com.ivsquare.production.updater.NativeAppUpdaterPackage
```

Inside `getPackages()`, add it to the automatically linked packages:

```kotlin
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
      add(NativeAppUpdaterPackage())
    }
```

If the project has `MainApplication.java` instead, add this import:

```java
import com.ivsquare.production.updater.NativeAppUpdaterPackage;
```

and add this line to the returned packages list:

```java
packages.add(new NativeAppUpdaterPackage());
```

## 3. Update AndroidManifest.xml

Add this permission directly inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
```

Add this provider inside `<application>`:

```xml
<provider
    android:name="androidx.core.content.FileProvider"
    android:authorities="${applicationId}.update-file-provider"
    android:exported="false"
    android:grantUriPermissions="true">
    <meta-data
        android:name="android.support.FILE_PROVIDER_PATHS"
        android:resource="@xml/update_file_paths" />
</provider>
```

## 4. Build requirements

For every native release:

1. Increase `versionCode` in `android/app/build.gradle`.
2. Keep `applicationId "com.ivsquare.production"` unchanged.
3. Sign with the exact same release keystore.
4. Build the release APK.
5. Calculate its SHA-256.
6. Upload it to the backend `downloads/` directory.
7. Update `backend/config/android-update.json` and set `enabled` to `true`.
8. Restart the backend process.

The first APK containing this module must still be installed manually. All
later signed native APKs can be announced and downloaded through the popup.
