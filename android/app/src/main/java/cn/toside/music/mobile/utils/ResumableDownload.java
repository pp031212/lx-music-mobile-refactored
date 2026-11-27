package cn.toside.music.mobile.utils;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Streams audio into a private file and binds partial bytes to a validated HTTP representation. */
final class ResumableDownload {
  private static final Pattern CONTENT_RANGE = Pattern.compile("bytes ([0-9]+)-([0-9]+)/([0-9]+)");
  private static final String USER_AGENT = "Mozilla/5.0 (Linux; Android 10; Pixel 3a XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Mobile Safari/537.36";

  interface Progress {
    void onProgress(long written, long total);
  }

  static final class Partial {
    final long written;
    final long total;
    final String requestUrl;
    final String responseUrl;
    final String etag;

    Partial(long written, long total, String requestUrl, String responseUrl, String etag) {
      this.written = written;
      this.total = total;
      this.requestUrl = requestUrl;
      this.responseUrl = responseUrl;
      this.etag = etag;
    }
  }

  static final class Result {
    final int statusCode;
    final long bytesWritten;
    final long total;

    Result(int statusCode, long bytesWritten, long total) {
      this.statusCode = statusCode;
      this.bytesWritten = bytesWritten;
      this.total = total;
    }
  }

  private volatile boolean cancelled;
  private volatile HttpURLConnection connection;

  void cancel() {
    cancelled = true;
    HttpURLConnection current = connection;
    if (current != null) current.disconnect();
  }

  private void checkCancelled() throws IOException {
    if (cancelled) throw new IOException("Download cancelled");
  }

  static Partial inspect(File file) {
    if (!file.isFile()) return null;
    long written = file.length();
    if (written <= 0) return null;
    try (DataInputStream input = new DataInputStream(new FileInputStream(checkpointFile(file)))) {
      String requestUrl = input.readUTF();
      String responseUrl = input.readUTF();
      String etag = input.readUTF();
      long total = input.readLong();
      if (requestUrl.isEmpty() || responseUrl.isEmpty() || !isStrongEtag(etag) || total <= written) return null;
      return new Partial(written, total, requestUrl, responseUrl, etag);
    } catch (IOException ignored) {
      return null;
    }
  }

  Result download(String requestUrl, File file, Progress progress) throws IOException {
    checkCancelled();
    Partial partial = inspect(file);
    if (partial != null && !partial.requestUrl.equals(requestUrl)) {
      partial = null;
    }
    try {
      HttpURLConnection response = open(new URL(requestUrl), partial);
      int status = response.getResponseCode();
      boolean append = status == HttpURLConnection.HTTP_PARTIAL && matchesRange(response, partial);
      if (partial != null && !append && (status == HttpURLConnection.HTTP_PARTIAL || status == 416)) {
        response.disconnect();
        response = open(new URL(requestUrl), null);
        status = response.getResponseCode();
      }
      if (!append && status != HttpURLConnection.HTTP_OK) return new Result(status, 0, 0);
      validateContent(response);
      long offset = append ? partial.written : 0;
      long total = append ? partial.total : parseLength(response.getHeaderField("Content-Length"));
      long written = copy(response, requestUrl, file, offset, total, progress);
      return new Result(status, written, total);
    } finally {
      HttpURLConnection current = connection;
      connection = null;
      if (current != null) current.disconnect();
    }
  }

  private HttpURLConnection open(URL address, Partial partial) throws IOException {
    for (int redirects = 0; redirects <= 5; redirects++) {
      checkCancelled();
      String scheme = address.getProtocol();
      if (!scheme.equals("https") && !scheme.equals("http")) throw new IOException("Invalid download address");
      HttpURLConnection response = (HttpURLConnection) address.openConnection();
      connection = response;
      checkCancelled();
      response.setInstanceFollowRedirects(false);
      response.setConnectTimeout(15000);
      response.setReadTimeout(30000);
      response.setRequestProperty("User-Agent", USER_AGENT);
      response.setRequestProperty("Accept-Encoding", "identity");
      if (partial != null) {
        response.setRequestProperty("Range", "bytes=" + partial.written + "-");
        response.setRequestProperty("If-Range", partial.etag);
      }
      int status = response.getResponseCode();
      if (status != 301 && status != 302 && status != 303 && status != 307 && status != 308) return response;
      String location = response.getHeaderField("Location");
      response.disconnect();
      if (location == null || location.isEmpty()) throw new IOException("Missing download redirect address");
      address = new URL(address, location);
    }
    throw new IOException("Too many download redirects");
  }

  private static boolean matchesRange(HttpURLConnection response, Partial partial) {
    if (partial == null || !partial.responseUrl.equals(response.getURL().toExternalForm())
        || !partial.etag.equals(response.getHeaderField("ETag"))) return false;

    String header = response.getHeaderField("Content-Range");
    if (header == null) return false;
    Matcher range = CONTENT_RANGE.matcher(header.trim());
    if (!range.matches()) return false;
    long length = parseLength(response.getHeaderField("Content-Length"));
    return parseLength(range.group(1)) == partial.written
        && parseLength(range.group(2)) == partial.total - 1
        && parseLength(range.group(3)) == partial.total
        && (length < 0 || length == partial.total - partial.written);
  }

  private static void validateContent(HttpURLConnection response) throws IOException {
    String contentType = response.getContentType();
    if (contentType != null) {
      contentType = contentType.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
      if (contentType.equals("text/html") || contentType.equals("application/json") || contentType.endsWith("+json")) {
        throw new IOException("Unexpected download content type");
      }
    }
    String encoding = response.getHeaderField("Content-Encoding");
    if (encoding != null && !encoding.trim().equalsIgnoreCase("identity")) {
      throw new IOException("Unsupported download content encoding");
    }
  }

  private long copy(HttpURLConnection response, String requestUrl, File file, long offset, long total,
                    Progress progress) throws IOException {
    File checkpoint = checkpointFile(file);
    try (InputStream input = response.getInputStream()) {
      checkCancelled();
      if (offset == 0) removeCheckpoint(checkpoint);
      else if (file.length() != offset) throw new IOException("Partial download size changed");

      try (FileOutputStream output = new FileOutputStream(file, offset > 0)) {
        if (offset == 0) {
          String etag = response.getHeaderField("ETag");
          if (total > 0 && isStrongEtag(etag)) {
            // The old checkpoint is gone and the file is empty before binding the new response.
            try (DataOutputStream state = new DataOutputStream(new FileOutputStream(checkpoint))) {
              state.writeUTF(requestUrl);
              state.writeUTF(response.getURL().toExternalForm());
              state.writeUTF(etag);
              state.writeLong(total);
            }
          }
        }
        long written = offset;
        progress.onProgress(written, total);
        long lastProgress = System.nanoTime();
        byte[] buffer = new byte[32 * 1024];
        int count;
        while ((count = input.read(buffer)) != -1) {
          checkCancelled();
          if (total >= 0 && count > total - written) {
            removeCheckpoint(checkpoint);
            throw new IOException("Audio exceeds the declared download size");
          }
          output.write(buffer, 0, count);
          written += count;
          long now = System.nanoTime();
          if (now - lastProgress >= 500_000_000L) {
            progress.onProgress(written, total);
            lastProgress = now;
          }
        }
        checkCancelled();
        if (written <= 0 || (total >= 0 && written != total)) {
          throw new IOException("Download ended before the file was complete");
        }
        output.getFD().sync();
        return written;
      }
    }
  }

  private static File checkpointFile(File file) {
    return new File(file.getPath() + ".resume");
  }

  private static void removeCheckpoint(File checkpoint) throws IOException {
    if (checkpoint.exists() && !checkpoint.delete()) throw new IOException("Unable to remove the download checkpoint");
  }

  private static boolean isStrongEtag(String etag) {
    return etag != null && etag.length() >= 2 && etag.startsWith("\"") && etag.endsWith("\"")
        && etag.indexOf('"', 1) == etag.length() - 1;
  }

  private static long parseLength(String value) {
    if (value == null) return -1;
    try {
      long length = Long.parseLong(value.trim());
      return length >= 0 ? length : -1;
    } catch (NumberFormatException ignored) {
      return -1;
    }
  }
}
