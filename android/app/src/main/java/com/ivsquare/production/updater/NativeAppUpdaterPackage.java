package com.ivsquare.production.updater;

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.Collections;
import java.util.List;

public class NativeAppUpdaterPackage implements ReactPackage {
  @NonNull
  @Override
  public List<NativeModule> createNativeModules(
      @NonNull ReactApplicationContext reactContext
  ) {
    return Collections.singletonList(new NativeAppUpdaterModule(reactContext));
  }

  @NonNull
  @Override
  public List<ViewManager> createViewManagers(
      @NonNull ReactApplicationContext reactContext
  ) {
    return Collections.emptyList();
  }
}
