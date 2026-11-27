package com.guichaguri.trackplayer.service;

/**
 * Spectrum analysis with LX Music Desktop's AnalyserNode settings:
 * fftSize = 256 (128 linear frequency bins), Blackman window,
 * smoothingTimeConstant = 0.8, minDecibels = -100, maxDecibels = -30 -> [0..255].
 *
 * Frames are timestamped on the PCM media timeline and selected by the audio sink playback head.
 */
final class SpectrumAnalyzer {
  private static final int FFT_SIZE = 256;
  static final int BIN_COUNT = FFT_SIZE / 2;
  private static final int FFT_BITS = Integer.numberOfTrailingZeros(FFT_SIZE);
  private static final double SMOOTHING_TIME_CONSTANT = 0.8;
  private static final double MIN_DECIBELS = -100.0;
  private static final double MAX_DECIBELS = -30.0;
  private static final double INV_DB_RANGE = 255.0 / (MAX_DECIBELS - MIN_DECIBELS);
  private static final double[] WINDOW = new double[FFT_SIZE];

  private static final int HISTORY_SIZE = 256;

  static {
    final double a0 = 0.42;
    final double a1 = 0.5;
    final double a2 = 0.08;
    for (int i = 0; i < FFT_SIZE; i++) {
      double phase = 2.0 * Math.PI * i / (FFT_SIZE - 1);
      WINDOW[i] = a0 - a1 * Math.cos(phase) + a2 * Math.cos(2.0 * phase);
    }
  }

  private static final class TimedFrame {
    final float[] bins;
    final long endTimeUs;

    TimedFrame(float[] bins, long endTimeUs) {
      this.bins = bins;
      this.endTimeUs = endTimeUs;
    }
  }

  private static final float[] EMPTY_BINS = new float[BIN_COUNT];

  private final float[] samples = new float[FFT_SIZE];
  private final double[] real = new double[FFT_SIZE];
  private final double[] imaginary = new double[FFT_SIZE];
  private final double[] smoothedMag = new double[BIN_COUNT];
  private final TimedFrame[] history = new TimedFrame[HISTORY_SIZE];
  private int nextSlot;
  private int storedFrames;

  private int position;
  private int count;
  private int samplesSinceHop;
  private long bufferTimeUs;
  private int bufferFrames;

  synchronized void reset() {
    count = 0;
    position = 0;
    samplesSinceHop = 0;
    bufferFrames = 0;
    for (int i = 0; i < BIN_COUNT; i++) smoothedMag[i] = 0.0;
    for (int i = 0; i < HISTORY_SIZE; i++) history[i] = null;
    nextSlot = 0;
    storedFrames = 0;
  }

  void beginBuffer(long presentationTimeUs) {
    bufferTimeUs = presentationTimeUs;
    bufferFrames = 0;
  }

  void add(float sample, int sampleRate) {
    bufferFrames++;
    samples[position] = sample;
    position = (position + 1) & (FFT_SIZE - 1);
    if (count < FFT_SIZE) count++;
    samplesSinceHop++;

    int hopSamples = Math.max(128, sampleRate / 60);
    if (count >= FFT_SIZE && samplesSinceHop >= hopSamples) {
      samplesSinceHop -= hopSamples;
      computeFrame(bufferTimeUs + bufferFrames * 1_000_000L / sampleRate);
    }
  }

  synchronized float[] getSpectrum(long playbackTimeUs) {
    for (int offset = 1; offset <= storedFrames; offset++) {
      TimedFrame frame = history[(nextSlot - offset) & (HISTORY_SIZE - 1)];
      if (frame.endTimeUs <= playbackTimeUs) return frame.bins;
    }
    return EMPTY_BINS;
  }

  private void computeFrame(long endTimeUs) {
    for (int i = 0; i < FFT_SIZE; i++) {
      int reversed = Integer.reverse(i) >>> (32 - FFT_BITS);
      real[reversed] = samples[(position + i) & (FFT_SIZE - 1)] * WINDOW[i];
      imaginary[reversed] = 0.0;
    }

    for (int block = 2; block <= FFT_SIZE; block *= 2) {
      int half = block / 2;
      double angle = -2.0 * Math.PI / block;
      double stepR = Math.cos(angle);
      double stepI = Math.sin(angle);
      for (int start = 0; start < FFT_SIZE; start += block) {
        double phaseR = 1.0;
        double phaseI = 0.0;
        for (int i = start; i < start + half; i++) {
          int j = i + half;
          double r = real[j] * phaseR - imaginary[j] * phaseI;
          double im = real[j] * phaseI + imaginary[j] * phaseR;
          real[j] = real[i] - r;
          imaginary[j] = imaginary[i] - im;
          real[i] += r;
          imaginary[i] += im;
          double nextPhaseR = phaseR * stepR - phaseI * stepI;
          phaseI = phaseR * stepI + phaseI * stepR;
          phaseR = nextPhaseR;
        }
      }
    }

    float[] out = new float[BIN_COUNT];
    double invFft = 1.0 / FFT_SIZE;
    for (int bin = 0; bin < BIN_COUNT; bin++) {
      double mag = Math.hypot(real[bin], imaginary[bin]) * invFft;
      double smoothed = SMOOTHING_TIME_CONSTANT * smoothedMag[bin] + (1.0 - SMOOTHING_TIME_CONSTANT) * mag;
      smoothedMag[bin] = smoothed;
      double db = 20.0 * Math.log10(Math.max(1e-20, smoothed));
      double scaled = (db - MIN_DECIBELS) * INV_DB_RANGE;
      if (scaled < 0.0) scaled = 0.0;
      else if (scaled > 255.0) scaled = 255.0;
      out[bin] = (float) scaled;
    }

    publish(out, endTimeUs);
  }

  private synchronized void publish(float[] bins, long endTimeUs) {
    history[nextSlot] = new TimedFrame(bins, endTimeUs);
    nextSlot = (nextSlot + 1) & (HISTORY_SIZE - 1);
    storedFrames = Math.min(storedFrames + 1, HISTORY_SIZE);
  }
}
