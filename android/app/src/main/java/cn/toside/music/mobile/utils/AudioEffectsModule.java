package cn.toside.music.mobile.utils;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.guichaguri.trackplayer.service.AudioEffects;

public final class AudioEffectsModule extends ReactContextBaseJavaModule {
  AudioEffectsModule(ReactApplicationContext context) {
    super(context);
  }

  @Override
  public String getName() {
    return "AudioEffectsModule";
  }

  @ReactMethod
  public void setEqualizer(boolean enabled, ReadableArray levels, Promise result) {
    try {
      float[] gains = new float[levels.size()];
      for (int i = 0; i < gains.length; i++) gains[i] = (float) levels.getDouble(i);
      AudioEffects.setEqualizer(enabled, gains);
      result.resolve(null);
    } catch (RuntimeException error) {
      result.reject("AUDIO_EQUALIZER", error);
    }
  }

  @ReactMethod
  public void setPitch(double pitch, Promise result) {
    try {
      AudioEffects.setPitch((float) pitch);
      result.resolve(null);
    } catch (RuntimeException error) {
      result.reject("AUDIO_PITCH", error);
    }
  }

  @ReactMethod
  public void setPanner(boolean enabled, double speed, double radius, Promise result) {
    try {
      AudioEffects.setPanner(enabled, (float) speed, (float) radius);
      result.resolve(null);
    } catch (RuntimeException error) {
      result.reject("AUDIO_PANNER", error);
    }
  }

  @ReactMethod
  public void setSpectrumEnabled(boolean enabled) {
    AudioEffects.setSpectrumEnabled(enabled);
  }

  @ReactMethod
  public void getSpectrum(Promise result) {
    WritableArray values = Arguments.createArray();
    for (float band : AudioEffects.getSpectrum()) values.pushDouble(band);
    result.resolve(values);
  }

  @Override
  public void invalidate() {
    AudioEffects.setSpectrumEnabled(false);
    super.invalidate();
  }
}
