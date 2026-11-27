/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

package com.guichaguri.trackplayer.service;

/**
 * Fixed-parameter port of Blink's platform/audio/dynamics_compressor.cc.
 * LX Desktop uses DynamicsCompressorNode defaults on the dry EQ signal.
 * Input and output are in PCM16 units with floating-point headroom.
 */
final class WebAudioCompressor {
  private static final double THRESHOLD = Math.pow(10, -24.0 / 20);
  private static final double KNEE_END = Math.pow(10, (-24.0 + 30) / 20);
  private static final double SLOPE = 1.0 / 12;
  private static final double KNEE = findKnee();
  private static final double COMPRESSED_KNEE_END = kneeCurve(KNEE_END, KNEE);
  private static final double MAKEUP_GAIN = Math.pow(1 / saturate(1), 0.6);

  final int delayFrames;
  private final double[][] delay;
  private final double attackFrames, releaseFrames, detectorReleaseScale;
  private int position, divisionFrame;
  private double detector, target, envelopeRate;
  private double gain = 1;
  private double maxAttackDb = -1;

  WebAudioCompressor(int sampleRate, int channels) {
    delayFrames = Math.max(1, Math.min(1023, (int) (sampleRate * 0.006f)));
    delay = new double[channels][delayFrames];
    attackFrames = sampleRate * 0.003;
    releaseFrames = sampleRate * 0.250;
    detectorReleaseScale = Math.log(10) / (20 * sampleRate * 0.0025);
  }

  private static double kneeCurve(double input, double k) {
    return THRESHOLD + (1 - Math.exp(-k * (input - THRESHOLD))) / k;
  }

  private static double findKnee() {
    double lo = 0.1, hi = 10000, k = 5;
    for (int i = 0; i < 15; i++) {
      double slope = Math.log(kneeCurve(KNEE_END * 1.001, k) / kneeCurve(KNEE_END, k)) / Math.log(1.001);
      if (slope < SLOPE) hi = k;
      else lo = k;
      k = Math.sqrt(lo * hi);
    }
    return k;
  }

  private static double saturate(double input) {
    if (input <= THRESHOLD) return input;
    if (input < KNEE_END) return kneeCurve(input, KNEE);
    return COMPRESSED_KNEE_END * Math.pow(input / KNEE_END, SLOPE);
  }

  private void updateEnvelope() {
    target = Math.asin(detector) / (Math.PI / 2);
    double differenceDb = target == 0 ? 1 : 20 * Math.log10(gain / target);
    if (target > gain) {
      maxAttackDb = -1;
      double x = (Math.max(-12, Math.min(0, differenceDb)) + 12) / 4;
      // Blink's release polynomial evaluated at the default zones (0.09, 0.16, 0.42, 0.98).
      double zone = 0.09 + x * (0.005988750244 + x * (0.050409513441 + x * (0.012655416911 + x * 0.000946319404)));
      envelopeRate = Math.pow(10, 5 / (20 * releaseFrames * zone));
    } else {
      maxAttackDb = Math.max(maxAttackDb, differenceDb);
      envelopeRate = 1 - Math.pow(0.25 / Math.max(0.5, maxAttackDb), 1 / attackFrames);
    }
  }

  void process(double[] frame) {
    if (divisionFrame == 0) updateEnvelope();
    double peak = 0;
    for (double sample : frame) peak = Math.max(peak, Math.abs(sample));
    peak /= 32768;
    double attenuation = peak <= THRESHOLD ? 1 : saturate(peak) / peak;
    if (attenuation > detector) {
      double releaseDb = Math.max(2, -20 * Math.log10(attenuation));
      double rate = Math.expm1(releaseDb * detectorReleaseScale);
      detector = Math.min(1, detector + (attenuation - detector) * rate);
    } else {
      detector = attenuation;
    }
    gain = envelopeRate < 1 ? gain + (target - gain) * envelopeRate : Math.min(1, gain * envelopeRate);
    double scale = MAKEUP_GAIN * Math.sin(Math.PI / 2 * gain);
    for (int ch = 0; ch < frame.length; ch++) {
      double delayed = delay[ch][position];
      delay[ch][position] = frame[ch];
      frame[ch] = delayed * scale;
    }
    if (++position == delayFrames) position = 0;
    divisionFrame = (divisionFrame + 1) & 31;
  }
}
