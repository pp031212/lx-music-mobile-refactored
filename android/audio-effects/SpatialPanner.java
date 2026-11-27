package com.guichaguri.trackplayer.service;

import java.util.Arrays;

/**
 * Lightweight 3D orbital stereo panner: orbits a downmixed point source across
 * left and right ears with constant-power panning, micro-ITD delay, and front/back depth.
 */
final class SpatialPanner {
  private static final int DELAY_BUFFER_SIZE = 64; // > 1ms at 48kHz
  private static final int DELAY_MASK = DELAY_BUFFER_SIZE - 1;

  private final int sampleRate;
  private final double[] monoDelay = new double[DELAY_BUFFER_SIZE];
  private int delayIndex = 0;
  private double angle = 0.0;

  private volatile boolean enabled = false;
  private volatile double speed = 5.0;  // 1..10
  private volatile double radius = 5.0; // 1..10

  SpatialPanner(int sampleRate) {
    this.sampleRate = sampleRate;
  }

  boolean matches(int sampleRate) {
    return this.sampleRate == sampleRate;
  }

  void configure(boolean enabled, float speed, float radius) {
    this.enabled = enabled;
    this.speed = Math.max(1.0, Math.min(10.0, speed));
    this.radius = Math.max(1.0, Math.min(10.0, radius));
  }

  void reset() {
    Arrays.fill(monoDelay, 0.0);
    delayIndex = 0;
  }

  void processStereo(double[] frame) {
    if (!enabled) return;

    double inL = frame[0];
    double inR = frame[1];
    double mono = (inL + inR) * 0.5;

    monoDelay[delayIndex] = mono;

    // Angular velocity matching desktop PannerNode feel: 2 * (speed / 10) rad/s
    double angularVel = 2.0 * (speed / 10.0);
    angle += angularVel / sampleRate;
    if (angle >= Math.PI * 2.0) angle -= Math.PI * 2.0;

    // Normalized panning depth 0.15..0.92 based on radius (1..10)
    double depth = 0.15 + (radius / 10.0) * 0.77;
    double pan = Math.sin(angle) * depth; // -depth..+depth
    double frontBack = 0.86 + 0.14 * Math.cos(angle);

    // Subtle interaural time difference (up to ~0.42ms) on the far ear
    double maxDelaySamples = Math.min(20.0, sampleRate * 0.00042);
    double itd = Math.abs(pan) * maxDelaySamples;
    int delaySamples = (int) itd;
    double frac = itd - delaySamples;
    double delayedMono = readDelay(monoDelay, delaySamples, frac);

    double earL = pan > 0 ? delayedMono : mono;
    double earR = pan < 0 ? delayedMono : mono;

    // Constant-power stereo gain law across both ears
    double panAngle = (pan + 1.0) * (Math.PI * 0.25);
    double gainL = Math.cos(panAngle) * 1.41421356 * frontBack;
    double gainR = Math.sin(panAngle) * 1.41421356 * frontBack;

    // 85% orbiting 3D point source (cross-feeds L/R cleanly) + 15% original stereo anchor
    frame[0] = earL * gainL * 0.85 + inL * 0.15;
    frame[1] = earR * gainR * 0.85 + inR * 0.15;

    delayIndex = (delayIndex + 1) & DELAY_MASK;
  }

  private double readDelay(double[] buf, int samples, double frac) {
    int idx0 = (delayIndex - samples) & DELAY_MASK;
    int idx1 = (delayIndex - samples - 1) & DELAY_MASK;
    return buf[idx0] * (1.0 - frac) + buf[idx1] * frac;
  }
}
