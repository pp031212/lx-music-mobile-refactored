package com.guichaguri.trackplayer.service;

/**
 * Peaking 10-band biquad equalizer using the same center frequencies and Q (1.4)
 * as LX Music Desktop. PCM samples retain headroom until the downstream compressor.
 */
final class TenBandEqualizer {
  private static final int[] FREQUENCIES = {31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000};
  static final int BAND_COUNT = FREQUENCIES.length;
  static final int MAX_GAIN_DB = 15;

  private final int sampleRate;
  private final int channels;
  private final Filter[] filters;

  TenBandEqualizer(int sampleRate, int channels, float[] gains) {
    this.sampleRate = sampleRate;
    this.channels = channels;
    this.filters = new Filter[BAND_COUNT];
    for (int band = 0; band < BAND_COUNT; band++) {
      this.filters[band] = new Filter(FREQUENCIES[band], sampleRate, channels);
    }
    updateGains(gains);
  }

  boolean matches(int sampleRate, int channels) {
    return this.sampleRate == sampleRate && this.channels == channels;
  }

  void updateGains(float[] gains) {
    for (int band = 0; band < BAND_COUNT; band++) {
      float g = (gains != null && band < gains.length) ? gains[band] : 0f;
      filters[band].setGain(g);
    }
  }

  double processDouble(double sample, int channel) {
    double value = sample;
    for (int i = 0; i < BAND_COUNT; i++) {
      value = (float) filters[i].process(value, channel);
    }
    return value;
  }

  static short toPcm16(double sample) {
    return (short) Math.max(Short.MIN_VALUE, Math.min(Short.MAX_VALUE, Math.round(sample)));
  }

  static short softLimitToShort(double sample) {
    double norm = sample / 32768.0;
    double abs = Math.abs(norm);
    if (abs > 0.90) {
      double excess = (abs - 0.90) / 0.10;
      double shaped = 0.90 + 0.10 * Math.tanh(excess);
      norm = norm >= 0 ? shaped : -shaped;
    }
    long rounded = Math.round(norm * 32767.0);
    if (rounded > Short.MAX_VALUE) return Short.MAX_VALUE;
    if (rounded < Short.MIN_VALUE) return Short.MIN_VALUE;
    return (short) rounded;
  }

  private static final class Filter {
    private final double alpha, cosine;
    private final boolean belowNyquist;
    private final double[] x1, x2, y1, y2;
    private float previousGain = Float.NaN;
    private double b0 = 1, b1, b2, a2;

    Filter(int frequency, int sampleRate, int channels) {
      belowNyquist = frequency * 2 < sampleRate;
      double angle = 2 * Math.PI * frequency / sampleRate;
      alpha = Math.sin(angle) / (2 * 1.4);
      cosine = Math.cos(angle);
      x1 = new double[channels];
      x2 = new double[channels];
      y1 = new double[channels];
      y2 = new double[channels];
    }

    void setGain(float gain) {
      if (!belowNyquist || previousGain == gain) return;
      previousGain = gain;
      double amplitude = Math.pow(10, gain / 40.0);
      double a0 = 1 + alpha / amplitude;
      b0 = (1 + alpha * amplitude) / a0;
      b1 = -2 * cosine / a0;
      b2 = (1 - alpha * amplitude) / a0;
      a2 = (1 - alpha / amplitude) / a0;
    }

    // Keep input/output history across gain changes, including transitions through 0 dB.
    double process(double input, int ch) {
      double output = b0 * input + b1 * (x1[ch] - y1[ch]) + b2 * x2[ch] - a2 * y2[ch];
      x2[ch] = x1[ch];
      x1[ch] = input;
      y2[ch] = y1[ch];
      y1[ch] = output;
      return output;
    }
  }
}
