package com.guichaguri.trackplayer.service;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import androidx.media3.common.C;
import androidx.media3.common.PlaybackParameters;
import androidx.media3.common.Player;
import androidx.media3.common.TrackSelectionParameters;
import androidx.media3.common.TrackSelectionParameters.AudioOffloadPreferences;
import androidx.media3.common.audio.AudioProcessor;
import androidx.media3.common.audio.BaseAudioProcessor;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.audio.AudioSink;
import androidx.media3.exoplayer.audio.DefaultAudioSink;
import androidx.media3.exoplayer.audio.ForwardingAudioSink;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;

@UnstableApi
public final class AudioEffects {
  private static final float[] EMPTY_SPECTRUM = new float[0];
  // One identity per enable cycle, even if off/on happens between audio buffers.
  private static final class EqSettings {
    final float[] gains;
    final Object session;
    EqSettings(float[] gains, Object session) {
      this.gains = gains;
      this.session = session;
    }
  }

  private static volatile EqSettings eqSettings;
  private static volatile float pitch = 1.0f;
  private static volatile boolean pannerEnabled = false;
  private static volatile float pannerSpeed = 5.0f;
  private static volatile float pannerRadius = 5.0f;
  private static volatile Object captureRequest;
  private static volatile Attachment active;

  private AudioEffects() {}

  public static synchronized void setEqualizer(boolean enabled, float[] levels) {
    if (levels.length != TenBandEqualizer.BAND_COUNT) throw new IllegalArgumentException("Expected ten EQ bands");
    EqSettings previous = eqSettings;
    if (enabled) {
      for (float level : levels) {
        if (Float.isNaN(level) || Math.abs(level) > TenBandEqualizer.MAX_GAIN_DB) throw new IllegalArgumentException("Invalid EQ gain");
      }
      if (previous != null && Arrays.equals(previous.gains, levels)) return;
      eqSettings = new EqSettings(levels.clone(), previous == null ? new Object() : previous.session);
    } else {
      if (previous == null) return;
      eqSettings = null;
    }
    if ((previous != null) != enabled) refreshOffload();
  }

  public static void setPitch(float nextPitch) {
    if (Float.isNaN(nextPitch)) nextPitch = 1.0f;
    float clamped = Math.max(0.5f, Math.min(1.5f, nextPitch));
    if (Math.abs(clamped - pitch) < 0.001f) return;
    boolean wasDefault = Math.abs(pitch - 1.0f) < 0.001f;
    boolean isDefault = Math.abs(clamped - 1.0f) < 0.001f;
    pitch = clamped;
    applyPitch();
    if (wasDefault != isDefault) refreshOffload();
  }

  public static void setPanner(boolean enabled, float speed, float radius) {
    boolean prevEnabled = pannerEnabled;
    pannerEnabled = enabled;
    pannerSpeed = Math.max(1.0f, Math.min(10.0f, Float.isNaN(speed) ? 5.0f : speed));
    pannerRadius = Math.max(1.0f, Math.min(10.0f, Float.isNaN(radius) ? 5.0f : radius));
    if (prevEnabled != enabled) refreshOffload();
  }

  public static void setSpectrumEnabled(boolean enabled) {
    if (enabled == (captureRequest != null)) return;
    captureRequest = enabled ? new Object() : null;
    refreshOffload();
  }

  public static float[] getSpectrum() {
    Attachment current = active;
    Object request = captureRequest;
    if (request == null || current == null || current.processor.capture != request) return EMPTY_SPECTRUM;
    return current.processor.analyzer.getSpectrum(current.processor.playbackTimeUs);
  }

  public static void attach(ExoPlayer player, RenderersFactory factory, boolean preferOffload) {
    Attachment next = new Attachment(player, factory.processor, preferOffload);
    active = next;
    player.addListener(next.listener);
    applyPitch();
    refreshOffload();
  }

  public static void detach(Player player) {
    Attachment current = active;
    if (current != null && current.player == player) {
      player.removeListener(current.listener);
      active = null;
    }
  }

  private static void applyPitch() {
    Attachment current = active;
    if (current == null) return;
    Runnable update = () -> {
      if (active != current) return;
      PlaybackParameters params = current.player.getPlaybackParameters();
      float targetPitch = pitch;
      if (Math.abs(params.pitch - targetPitch) < 0.001f) return;
      current.player.setPlaybackParameters(new PlaybackParameters(params.speed, targetPitch));
    };
    if (Looper.myLooper() == current.player.getApplicationLooper()) update.run();
    else current.handler.post(update);
  }

  private static void refreshOffload() {
    Attachment current = active;
    if (current == null || !current.preferOffload) return;
    Runnable update = () -> {
      if (active != current) return;
      boolean useOffload = eqSettings == null && captureRequest == null && !pannerEnabled && Math.abs(pitch - 1.0f) < 0.001f;
      if (useOffload == current.offloadEnabled) return;
      current.offloadEnabled = useOffload;
      TrackSelectionParameters parameters = current.player.getTrackSelectionParameters().buildUpon()
          .setAudioOffloadPreferences(new AudioOffloadPreferences.Builder()
              .setAudioOffloadMode(useOffload
                  ? AudioOffloadPreferences.AUDIO_OFFLOAD_MODE_ENABLED
                  : AudioOffloadPreferences.AUDIO_OFFLOAD_MODE_DISABLED)
              .setIsSpeedChangeSupportRequired(true)
              .build())
          .build();
      current.player.setTrackSelectionParameters(parameters);
    };
    if (Looper.myLooper() == current.player.getApplicationLooper()) update.run();
    else current.handler.post(update);
  }

  private static final class Attachment {
    final ExoPlayer player;
    final Processor processor;
    final Handler handler;
    final boolean preferOffload;
    final Player.Listener listener;
    boolean offloadEnabled;

    Attachment(ExoPlayer player, Processor processor, boolean preferOffload) {
      this.player = player;
      this.processor = processor;
      this.handler = new Handler(player.getApplicationLooper());
      this.preferOffload = preferOffload;
      this.offloadEnabled = preferOffload;
      this.listener = new Player.Listener() {
        @Override
        public void onPlaybackParametersChanged(PlaybackParameters playbackParameters) {
          float targetPitch = pitch;
          if (Math.abs(playbackParameters.pitch - targetPitch) > 0.001f) {
            player.setPlaybackParameters(new PlaybackParameters(playbackParameters.speed, targetPitch));
          }
        }
      };
    }
  }

  public static final class RenderersFactory extends DefaultRenderersFactory {
    private final Processor processor = new Processor();

    public RenderersFactory(Context context) {
      super(context);
    }

    @Override
    protected AudioSink buildAudioSink(Context context, boolean enableFloatOutput, boolean enableAudioTrackPlaybackParams) {
      AudioSink sink = new DefaultAudioSink.Builder(context)
          .setEnableFloatOutput(enableFloatOutput)
          .setEnableAudioTrackPlaybackParams(enableAudioTrackPlaybackParams)
          .setAudioProcessors(new AudioProcessor[]{processor})
          .build();
      return new ForwardingAudioSink(sink) {
        private ByteBuffer pendingBuffer;

        @Override
        public boolean handleBuffer(ByteBuffer buffer, long presentationTimeUs, int encodedAccessUnitCount)
            throws InitializationException, WriteException {
          // Media3 can retry a partially consumed buffer with the same timestamp.
          if (pendingBuffer != buffer) {
            processor.analyzer.beginBuffer(presentationTimeUs);
            pendingBuffer = buffer;
          }
          boolean consumed = super.handleBuffer(buffer, presentationTimeUs, encodedAccessUnitCount);
          if (consumed) pendingBuffer = null;
          return consumed;
        }

        @Override
        public long getCurrentPositionUs(boolean sourceEnded) {
          long positionUs = super.getCurrentPositionUs(sourceEnded);
          processor.playbackTimeUs = positionUs;
          return positionUs;
        }

        @Override
        public void flush() {
          pendingBuffer = null;
          processor.playbackTimeUs = AudioSink.CURRENT_POSITION_NOT_SET;
          super.flush();
        }

        @Override
        public void reset() {
          pendingBuffer = null;
          processor.playbackTimeUs = AudioSink.CURRENT_POSITION_NOT_SET;
          super.reset();
        }
      };
    }
  }

  private static final class Processor extends BaseAudioProcessor {
    final SpectrumAnalyzer analyzer = new SpectrumAnalyzer();
    volatile long playbackTimeUs = AudioSink.CURRENT_POSITION_NOT_SET;
    volatile Object capture;
    private EqSettings appliedEq;
    private WebAudioCompressor compressor;
    private TenBandEqualizer equalizer;
    private SpatialPanner panner;
    private double[] frame = new double[0];

    @Override
    protected AudioFormat onConfigure(AudioFormat format) {
      return format.encoding == C.ENCODING_PCM_16BIT ? format : AudioFormat.NOT_SET;
    }

    @Override
    protected void onFlush() {
      appliedEq = null;
      compressor = null;
      equalizer = null;
      if (panner != null) panner.reset();
      analyzer.reset();
    }

    @Override
    protected void onQueueEndOfStream() {
      EqSettings current = eqSettings;
      if (compressor == null || current == null || appliedEq.session != current.session) return;
      ByteBuffer tail = replaceOutputBuffer(compressor.delayFrames * frame.length * 2).order(ByteOrder.LITTLE_ENDIAN);
      boolean runPanner = pannerEnabled && frame.length == 2 && panner != null;
      for (int i = 0; i < compressor.delayFrames; i++) {
        Arrays.fill(frame, 0);
        compressor.process(frame);
        if (runPanner) panner.processStereo(frame);
        for (double sample : frame) tail.putShort(TenBandEqualizer.toPcm16(sample));
      }
      tail.flip();
    }

    @Override
    public void queueInput(ByteBuffer input) {
      if (!input.hasRemaining()) return;

      EqSettings currentEq = eqSettings;
      boolean currentPannerEnabled = pannerEnabled;
      Object requestedCapture = captureRequest;
      if (capture != requestedCapture) {
        analyzer.reset();
        capture = requestedCapture;
      }

      ByteBuffer output = replaceOutputBuffer(input.remaining());
      if (requestedCapture == null && currentEq == null && !currentPannerEnabled) {
        equalizer = null;
        appliedEq = null;
        compressor = null;
        if (panner != null) {
          panner.configure(false, pannerSpeed, pannerRadius);
          panner.reset();
        }
        output.put(input).flip();
        return;
      }

      int channels = inputAudioFormat.channelCount;
      int sampleRate = inputAudioFormat.sampleRate;

      if (frame.length != channels) frame = new double[channels];
      if (currentEq == null) {
        equalizer = null;
        compressor = null;
      } else if (appliedEq == null || appliedEq.session != currentEq.session || !equalizer.matches(sampleRate, channels)) {
        equalizer = new TenBandEqualizer(sampleRate, channels, currentEq.gains);
        compressor = new WebAudioCompressor(sampleRate, channels);
      } else if (appliedEq != currentEq) {
        equalizer.updateGains(currentEq.gains);
      }
      appliedEq = currentEq;

      if (currentPannerEnabled && channels >= 2) {
        if (panner == null || !panner.matches(sampleRate)) {
          panner = new SpatialPanner(sampleRate);
        }
        panner.configure(true, pannerSpeed, pannerRadius);
      } else if (panner != null) {
        panner.configure(false, pannerSpeed, pannerRadius);
        panner.reset();
      }

      boolean runPanner = currentPannerEnabled && channels == 2 && panner != null;

      input.order(ByteOrder.LITTLE_ENDIAN);
      output.order(ByteOrder.LITTLE_ENDIAN);
      while (input.remaining() >= channels * 2) {
        int mix = 0;
        for (int ch = 0; ch < channels; ch++) {
          short sample = input.getShort();
          if (requestedCapture != null) mix += sample;
          frame[ch] = equalizer == null ? sample : equalizer.processDouble(sample, ch);
        }
        if (compressor != null) compressor.process(frame);
        if (runPanner) panner.processStereo(frame);
        for (double sample : frame) {
          output.putShort(runPanner && compressor == null
              ? TenBandEqualizer.softLimitToShort(sample) : TenBandEqualizer.toPcm16(sample));
        }
        if (requestedCapture != null) analyzer.add(mix / (32768f * channels), sampleRate);
      }
      output.put(input).flip();
    }
  }
}
