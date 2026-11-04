# mlc-app2

Common messages and Call, SMS, and WhatsApp click indicators are saved separately for each signed-in account. Contact indicators show the latest click time for each action, not confirmation that the call or message was completed. Accounts without a saved common message inherit the previous shared message once as their starting copy.

The phone or browser back button returns to the previous in-app screen.

On Android phones with both WhatsApp and WhatsApp Business installed, the WhatsApp button asks which app to use and carries the prepared message (and photo, if selected) into that app. You still review and send the message yourself.

### Persistent Android APK updates

The APK workflow is prepared to sign release builds with a persistent key so future APKs can install as updates without uninstalling. Until all four GitHub Actions secrets below are configured, the APK build is intentionally skipped. Create the key once on a trusted Windows computer, outside this repository:

```powershell
keytool -genkeypair -v -keystore "$HOME\mlc-release.keystore" -alias mlc-release -keyalg RSA -keysize 2048 -validity 10000
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\mlc-release.keystore")) | Set-Clipboard
```

Keep the keystore and passwords private and backed up. In GitHub, open **Settings → Secrets and variables → Actions** and add these repository secrets:

- `ANDROID_KEYSTORE_BASE64`: paste the clipboard contents from the second command.
- `ANDROID_KEYSTORE_PASSWORD`: the keystore password you created.
- `ANDROID_KEY_ALIAS`: `mlc-release`.
- `ANDROID_KEY_PASSWORD`: the key password (press Enter during key creation to use the keystore password).

Do not commit or share the keystore. After adding all four secrets, run the **Build APK** workflow from the Actions tab. Its `MLC-Ward-List-APK` artifact is signed with that key. Keep the same keystore for every future build; losing or replacing it prevents installing future APKs over this signed version.

The older debug APKs were signed with temporary build keys, so Android cannot update those with the new persistent key. Uninstall the old debug APK once, install the first signed APK, and subsequent signed APK builds can update it without uninstalling.

The separate responsive team portal is published at `/portal/`; it shares the same app, Supabase accounts, and records as the main website. On iPhone, open that page in Safari and use Share → Add to Home Screen.

The configured admin account (`ravulasrinivas994@gmail.com`) can review tester sign-ins, member changes, and contact-button clicks from Settings. Before activity logging works, run `supabase/activity-monitoring.sql` in the Supabase SQL Editor. Row-level security lets each tester insert only their own action records and allows only the configured admin email to read them. The log stores tester email, action, timestamp, and counts; it does not store member names or message contents. The dashboard shows the last 30 days, but records remain in Supabase until deleted. Testers are informed on the sign-in screen.
