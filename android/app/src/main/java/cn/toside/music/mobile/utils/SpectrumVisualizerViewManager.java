package cn.toside.music.mobile.utils;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.view.View;

import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;
import com.guichaguri.trackplayer.service.AudioEffects;

/**
 * 1:1 native Android Canvas port of LX Music Desktop's AudioVisualizer.vue.
 */
public final class SpectrumVisualizerViewManager extends SimpleViewManager<SpectrumVisualizerViewManager.SpectrumView> {
  public static final String REACT_CLASS = "SpectrumVisualizerView";

  @Override
  public String getName() {
    return REACT_CLASS;
  }

  @Override
  protected SpectrumView createViewInstance(ThemedReactContext reactContext) {
    return new SpectrumView(reactContext);
  }

  @ReactProp(name = "active", defaultBoolean = false)
  public void setActive(SpectrumView view, boolean active) {
    view.setActive(active);
  }

  @ReactProp(name = "barColor", customType = "Color")
  public void setBarColor(SpectrumView view, Integer color) {
    view.setBarColor(color != null ? color : Color.rgb(77, 175, 124));
  }

  @ReactProp(name = "darkMode", defaultBoolean = false)
  public void setDarkMode(SpectrumView view, boolean darkMode) {
    view.setDarkMode(darkMode);
  }

  public static final class SpectrumView extends View {
    private static final int MAX_VISIBLE_BARS = 128;
    private static final int MAX_NUM = 255;

    private final float[] rendered = new float[MAX_VISIBLE_BARS];
    private final Paint paint = new Paint();

    private boolean active = false;
    private boolean darkMode = false;
    private boolean animating = false;
    private int barColor = Color.rgb(77, 175, 124);
    private long lastDrawNs = 0L;

    public SpectrumView(Context context) {
      super(context);
      paint.setStyle(Paint.Style.FILL);
      paint.setAntiAlias(false);
      updatePaintColor();
    }

    private void updatePaintColor() {
      // Matches desktop --color-primary-light-200-alpha-800 solid flat translucent fill
      int alpha = darkMode ? 52 : 42;
      paint.setColor(Color.argb(alpha, Color.red(barColor), Color.green(barColor), Color.blue(barColor)));
    }

    public void setActive(boolean nextActive) {
      if (this.active == nextActive) return;
      this.active = nextActive;
      if (nextActive || isAttachedToWindow()) {
        startAnimating();
      }
    }

    public void setBarColor(int color) {
      if (this.barColor == color) return;
      this.barColor = color;
      updatePaintColor();
      invalidate();
    }

    public void setDarkMode(boolean dark) {
      if (this.darkMode == dark) return;
      this.darkMode = dark;
      updatePaintColor();
      invalidate();
    }

    private void startAnimating() {
      if (!isAttachedToWindow()) return;
      if (!animating) {
        animating = true;
        lastDrawNs = System.nanoTime();
        postInvalidateOnAnimation();
      }
    }

    @Override
    protected void onAttachedToWindow() {
      super.onAttachedToWindow();
      if (active) startAnimating();
    }

    @Override
    protected void onDetachedFromWindow() {
      animating = false;
      super.onDetachedFromWindow();
    }

    // Exact desktop AudioVisualizer.vue getBarWidth(canvasWidth) in logical dp
    private static float getBarWidthDp(float dpWidth) {
      float barWidth = (dpWidth / 128f) * 2.5f;
      float width = dpWidth / 86f;
      float diffWidth = barWidth - width;
      return diffWidth > 32f
          ? dpWidth / 128f
          : (diffWidth > 12f ? width : barWidth);
    }

    @Override
    protected void onDraw(Canvas canvas) {
      int width = getWidth();
      int height = getHeight();
      if (width <= 0 || height <= 0) return;

      long now = System.nanoTime();
      float dt = lastDrawNs == 0L ? 0.016f : (now - lastDrawNs) / 1_000_000_000f;
      if (dt < 0.001f) dt = 0.001f;
      else if (dt > 0.05f) dt = 0.05f;
      lastDrawNs = now;

      float density = getResources().getDisplayMetrics().density;
      float dpWidth = density > 0f ? width / density : width;
      float barWidthDp = getBarWidthDp(dpWidth);
      int barCount = Math.max(1, Math.min(MAX_VISIBLE_BARS, (int) Math.ceil(dpWidth / barWidthDp)));

      // Exact desktop MAX_HEIGHT = Math.round(HEIGHT * 0.4 / 255 * 10000) / 10000
      float maxHeightScale = (float) (Math.round((height * 0.4 / 255.0) * 10000.0) / 10000.0);
      boolean hasEnergy = false;

      if (active) {
        float[] dataArray = AudioEffects.getSpectrum();
        int bufferLength = dataArray != null ? dataArray.length : 0;

        // Exact desktop frequencyAvg calculation
        double frequencyAvg = 0.0;
        if (bufferLength > 0) {
          for (int i = 0; i < bufferLength; i++) {
            int mult = i / MAX_NUM;
            int num = (mult % 2 == 0) ? (i - MAX_NUM * mult) : (MAX_NUM - (i - MAX_NUM * mult));
            int idx = num + 20;
            double spectrum = (num > 90 || idx >= bufferLength) ? 0.0 : dataArray[idx];
            frequencyAvg += spectrum * 1.2;
          }
          frequencyAvg /= bufferLength;
          frequencyAvg *= 1.4;
          frequencyAvg /= MAX_NUM;
        }

        // Fast VSync micro-interpolation for 90/120Hz displays without altering desktop's 0.8 decay curve
        float blend = 1f - (float) Math.exp(-dt * 30.0);

        for (int i = 0; i < barCount; i++) {
          float rawVal = (i < bufferLength) ? dataArray[i] : 0f;
          float targetHeight = (float) ((rawVal * frequencyAvg + rawVal * 0.42) * maxHeightScale);
          float next = rendered[i] + (targetHeight - rendered[i]) * blend;
          if (next < 0.3f) next = 0f;
          rendered[i] = next;
          if (next > 0f) hasEnergy = true;
        }
      } else {
        float decay = 1f - (float) Math.exp(-dt * 9.0);
        for (int i = 0; i < barCount; i++) {
          float next = rendered[i] * (1f - decay);
          if (next < 0.3f) next = 0f;
          rendered[i] = next;
          if (next > 0f) hasEnergy = true;
        }
      }

      if (hasEnergy) {
        for (int i = 0; i < barCount; i++) {
          float barH = rendered[i];
          if (barH <= 0.5f) continue;
          if (barH > height) barH = height;
          int left = (i * width) / barCount;
          int right = ((i + 1) * width) / barCount;
          if (right <= left) continue;
          canvas.drawRect(left, height - barH, right, height, paint);
        }
      }

      if (active || hasEnergy) {
        animating = true;
        postInvalidateOnAnimation();
      } else {
        animating = false;
      }
    }
  }
}
