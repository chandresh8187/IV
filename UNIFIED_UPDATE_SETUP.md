# Unified OTA + native APK update popup

`src/components/AppUpdateManager.js` is the only popup manager. It checks:

1. The backend native Android version endpoint.
2. Expo OTA only when no native update is required.

Native updates download and open Android's installer. OTA updates download the
new JavaScript/assets and change the action to **Reload now**.

## JavaScript integration

`App.js` must import and render the unified manager once, outside the
navigator:

```js
import AppUpdateManager from './src/components/AppUpdateManager';
```

```jsx
<RootNavigator />
<AppUpdateManager />
```

Remove the old `NativeUpdateManager` import, render, and file.

## Expo OTA requirement

This uploaded snapshot does not contain `expo-updates`, although the current
installed IV APP may already have it. In the current real project, verify:

```bash
npm ls expo-updates
```

If Expo modules and `expo-updates` are already configured, do not reinstall
them. Otherwise follow Expo's existing React Native integration and run the
version-compatible installer rather than manually choosing a package version:

```bash
npx install-expo-modules@latest
npx expo install expo-updates
eas update:configure
```

Configure manual checks so Expo does not download an update before this popup
asks the user:

```json
{
  "expo": {
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "updates": {
      "checkAutomatically": "NEVER"
    }
  }
}
```

Keep the existing Expo project ID, update URL, channel, and native Expo setup
created by `eas update:configure`. Do not replace the complete app config with
the small example above.

`expo-updates` checks and downloads work in a configured release build. They do
not work normally in a Metro development build.

## Native APK requirement

Complete every step in `ANDROID_UPDATER_INTEGRATION.md`. The backend endpoint is:

```text
GET /api/app-update/android
```

The first APK containing both `expo-updates` and `NativeAppUpdaterPackage` must
be installed manually. Later native releases can be downloaded from the popup.

## Release rules

- JavaScript/assets only: publish an Expo OTA update using the same channel and
  compatible runtime version.
- Native/dependency/Android changes: increase `versionCode` and app version,
  build with the same package name and signing keystore, upload the APK, and
  enable the backend manifest.
- Native updates always take priority. This avoids loading an OTA bundle onto
  an incompatible old native runtime.
