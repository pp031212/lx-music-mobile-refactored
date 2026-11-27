package cn.toside.music.mobile.utils;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class ResumableDownloadModule extends ReactContextBaseJavaModule {
  private final File stagingDirectory;
  private final UtilsEvent events;
  private final ExecutorService workers = Executors.newFixedThreadPool(3);
  private final Map<Integer, ResumableDownload> transfers = new ConcurrentHashMap<>();

  ResumableDownloadModule(ReactApplicationContext context) {
    super(context);
    stagingDirectory = new File(context.getFilesDir(), "download-tasks");
    events = new UtilsEvent(context);
  }

  @Override
  public String getName() {
    return "ResumableDownloadModule";
  }

  private File partialFile(String path) throws IOException {
    File file = new File(path).getCanonicalFile();
    if (!stagingDirectory.getCanonicalFile().equals(file.getParentFile())
        || !file.getName().matches("download_[0-9]+_[0-9]+\\.part")) {
      throw new IOException("Invalid download temporary file");
    }
    return file;
  }

  @ReactMethod
  public void inspect(String path, Promise promise) {
    try {
      ResumableDownload.Partial partial = ResumableDownload.inspect(partialFile(path));
      if (partial == null) {
        promise.resolve(null);
        return;
      }
      WritableMap result = Arguments.createMap();
      result.putDouble("written", partial.written);
      result.putDouble("total", partial.total);
      promise.resolve(result);
    } catch (IOException error) {
      promise.reject("DOWNLOAD_CHECKPOINT", error);
    }
  }

  @ReactMethod
  public void start(int id, String url, String path, Promise promise) {
    ResumableDownload transfer = new ResumableDownload();
    if (transfers.putIfAbsent(id, transfer) != null) {
      promise.reject("DOWNLOAD_BUSY", "Download is already running");
      return;
    }
    try {
      workers.execute(() -> {
        try {
          ResumableDownload.Result result = transfer.download(url, partialFile(path), (written, total) -> {
            WritableMap progress = Arguments.createMap();
            progress.putInt("id", id);
            progress.putDouble("written", written);
            progress.putDouble("total", total);
            events.sendEvent("audio-download-progress", progress);
          });
          WritableMap response = Arguments.createMap();
          response.putInt("statusCode", result.statusCode);
          response.putDouble("bytesWritten", result.bytesWritten);
          response.putDouble("total", result.total);
          promise.resolve(response);
        } catch (Exception error) {
          promise.reject("DOWNLOAD_FAILED", error);
        } finally {
          transfers.remove(id, transfer);
        }
      });
    } catch (RuntimeException error) {
      transfers.remove(id, transfer);
      promise.reject("DOWNLOAD_FAILED", error);
    }
  }

  @ReactMethod
  public void cancel(int id) {
    ResumableDownload transfer = transfers.get(id);
    if (transfer != null) transfer.cancel();
  }

  @Override
  public void invalidate() {
    for (ResumableDownload transfer : transfers.values()) transfer.cancel();
    workers.shutdown();
    super.invalidate();
  }
}
