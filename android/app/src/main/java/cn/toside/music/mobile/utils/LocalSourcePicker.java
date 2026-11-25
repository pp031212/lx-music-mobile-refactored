package cn.toside.music.mobile.utils;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashSet;

/** App-local SAF picker; the existing file library only returns one data URI. */
final class LocalSourcePicker extends BaseActivityEventListener {
  private static final int REQUEST_CODE = 18547;
  private static final int MAX_SCRIPT_BYTES = 9_000_000;
  private final ReactApplicationContext context;
  // Accessed on the UI thread only.
  private Promise pending;

  LocalSourcePicker(ReactApplicationContext context) {
    this.context = context;
    context.addActivityEventListener(this);
  }

  void open(Promise promise) {
    context.runOnUiQueueThread(() -> {
      if (pending != null) {
        promise.reject("PICKER_BUSY", "A file picker is already open");
        return;
      }
      Activity activity = context.getCurrentActivity();
      if (activity == null) {
        promise.reject("NO_ACTIVITY", "No active activity");
        return;
      }
      Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
      intent.addCategory(Intent.CATEGORY_OPENABLE);
      // Some providers label JavaScript files as text/plain or application/octet-stream.
      // Validate display names after selection rather than hiding valid scripts by MIME type.
      intent.setType("*/*");
      intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
      intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
      pending = promise;
      try {
        activity.startActivityForResult(intent, REQUEST_CODE);
      } catch (Exception error) {
        pending = null;
        promise.reject("PICKER_FAILED", error.getMessage());
      }
    });
  }

  @Override
  public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
    if (requestCode != REQUEST_CODE || pending == null) return;
    Promise promise = pending;
    pending = null;
    if (resultCode == Activity.RESULT_CANCELED) {
      promise.resolve(null);
      return;
    }
    if (resultCode != Activity.RESULT_OK || data == null) {
      promise.reject("PICKER_FAILED", "No document selection returned");
      return;
    }
    LinkedHashSet<Uri> uris = new LinkedHashSet<>();
    ClipData clips = data.getClipData();
    if (clips != null) {
      for (int index = 0; index < clips.getItemCount(); index++) {
        Uri uri = clips.getItemAt(index).getUri();
        if (uri != null) uris.add(uri);
      }
    }
    if (data.getData() != null) uris.add(data.getData());
    AsyncTask.runTask(() -> {
      WritableArray files = Arguments.createArray();
      for (Uri uri : uris) {
        WritableMap file = Arguments.createMap();
        file.putString("uri", uri.toString());
        file.putString("name", uri.getLastPathSegment());
        try (Cursor cursor = context.getContentResolver().query(uri,
            new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
          if (cursor != null && cursor.moveToFirst()) {
            String name = cursor.getString(0);
            if (name != null) file.putString("name", name);
          }
        } catch (Exception error) {
          file.putString("error", error.getMessage());
        }
        files.pushMap(file);
      }
      return files;
    }, promise);
  }

  void read(String path, Promise promise) {
    AsyncTask.runTask(() -> {
      Uri uri = Uri.parse(path);
      if (!"content".equals(uri.getScheme())) throw new IOException("Expected a document URI");
      try (InputStream input = context.getContentResolver().openInputStream(uri);
           ByteArrayOutputStream output = new ByteArrayOutputStream()) {
        if (input == null) throw new IOException("Cannot open the selected file");
        byte[] buffer = new byte[8192];
        int count;
        int total = 0;
        while ((count = input.read(buffer)) != -1) {
          total += count;
          if (total > MAX_SCRIPT_BYTES) throw new IOException("Too large script (maximum 9 MB)");
          output.write(buffer, 0, count);
        }
        return new String(output.toByteArray(), StandardCharsets.UTF_8);
      }
    }, promise);
  }

  void dispose() {
    context.runOnUiQueueThread(() -> {
      context.removeActivityEventListener(this);
      if (pending != null) {
        pending.reject("PICKER_CLOSED", "The app session was closed");
        pending = null;
      }
    });
  }
}
