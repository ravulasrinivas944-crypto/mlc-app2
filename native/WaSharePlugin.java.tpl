package __PKG__;

import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.content.pm.PackageManager;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;

@CapacitorPlugin(name = "WaShare")
public class WaSharePlugin extends Plugin {
    private boolean isInstalled(String packageName) {
        try {
            getContext().getPackageManager().getPackageInfo(packageName, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    @PluginMethod
    public void send(PluginCall call) {
        String phone = call.getString("phone", "");
        String text = call.getString("text", "");
        String image = call.getString("image", "");
        String mime = call.getString("mime", "image/jpeg");
        if (phone.isEmpty()) { call.reject("NO_PHONE"); return; }
        try {
            Intent i = new Intent(Intent.ACTION_SEND);
            if (!image.isEmpty()) {
                byte[] bytes = Base64.decode(image, Base64.DEFAULT);
                File dir = new File(getContext().getCacheDir(), "shared");
                dir.mkdirs();
                File[] old = dir.listFiles();
                if (old != null) { for (File o : old) { o.delete(); } }
                File f = new File(dir, "photo_" + System.currentTimeMillis() + ".jpg");
                try (FileOutputStream out = new FileOutputStream(f)) { out.write(bytes); }
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
                i.setType(mime);
                i.putExtra(Intent.EXTRA_STREAM, uri);
                i.setClipData(ClipData.newRawUri("photo", uri));
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } else {
                i.setType("text/plain");
            }
            i.putExtra(Intent.EXTRA_TEXT, text);
            i.putExtra("jid", phone + "@s.whatsapp.net");
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            boolean regularInstalled = isInstalled("com.whatsapp");
            boolean businessInstalled = isInstalled("com.whatsapp.w4b");
            if (regularInstalled && businessInstalled) {
                Intent regular = new Intent(i);
                regular.setPackage("com.whatsapp");
                Intent business = new Intent(i);
                business.setPackage("com.whatsapp.w4b");
                Intent chooser = Intent.createChooser(regular, "Choose WhatsApp app");
                chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[] { business });
                getContext().startActivity(chooser);
            } else if (regularInstalled || businessInstalled) {
                i.setPackage(regularInstalled ? "com.whatsapp" : "com.whatsapp.w4b");
                getContext().startActivity(i);
            } else {
                call.reject("WHATSAPP_NOT_INSTALLED");
                return;
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("FAILED: " + e.getMessage());
        }
    }
}
