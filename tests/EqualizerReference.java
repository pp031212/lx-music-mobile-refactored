package com.guichaguri.trackplayer.service;

import java.util.Arrays;

/** PCM16 checkpoints from Electron 42.11.6 OfflineAudioContext, all ten bands at +15 dB. */
public final class EqualizerReference {
  public static void main(String[] args) {
    compare(44100, new int[][] {
      {0, 0}, {-19092, 3182}, {-32768, 6149}, {-16741, -6871}, {-16744, -6097},
      {-942, -6046}, {-12196, -1526}, {6440, -9745}, {-10626, -11356},
    });
    compare(48000, new int[][] {
      {0, 0}, {-19535, 3256}, {-32768, 6479}, {8218, 559}, {17297, 1154},
      {-17720, 941}, {-18456, -1059}, {-4106, 1531}, {16497, 13138},
    });
  }

  private static void compare(int rate, int[][] expected) {
    float[] gains = new float[10];
    Arrays.fill(gains, 15);
    TenBandEqualizer eq = new TenBandEqualizer(rate, 2, gains);
    WebAudioCompressor compressor = new WebAudioCompressor(rate, 2);
    int delay = (int) (rate * 0.006);
    int[] checkpoints = {delay - 1, delay, delay + 1, 512, 1024, 2048, 4096 + delay, 6144, 8191};
    double[] frame = new double[2];
    int checkpoint = 0;
    for (int i = 0; i <= checkpoints[checkpoints.length - 1]; i++) {
      int left = ((i * 997 % 16384) - 8192) * (i < 4096 ? 3 : 1);
      int right = i % 64 < 32 ? 4096 : -4096;
      frame[0] = eq.processDouble(left, 0);
      frame[1] = eq.processDouble(right, 1);
      compressor.process(frame);
      if (i != checkpoints[checkpoint]) continue;
      for (int ch = 0; ch < 2; ch++) {
        int sample = TenBandEqualizer.toPcm16(frame[ch]);
        // The desktop and Android use different floating-point math libraries.
        if (Math.abs(sample - expected[checkpoint][ch]) > 5) {
          throw new AssertionError(rate + " Hz, frame " + i + ", channel " + ch
              + ": expected " + expected[checkpoint][ch] + ", got " + sample);
        }
      }
      checkpoint++;
    }
  }
}
