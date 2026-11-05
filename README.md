# MLC Ward List

MLC Ward List is a mobile-friendly outreach app built for organizing ward-wise citizen/member records and enabling fast communication with families, voters, or support contacts. It is designed for teams who need to:

- browse and search member data by ward,
- add or update records quickly,
- send prepared Call, SMS, and WhatsApp messages,
- track recent contact-click activity,
- keep data synced across devices and team members.

The app is used as a shared, team-facing tool with Supabase-backed data and native Android packaging via Capacitor.

## Highlights

- Ward-wise member directory for 48 wards plus mixed-data records
- Fast search, filters, and list browsing
- Add, edit, and delete member records
- Common message templates with placeholders like `{name}`, `{ward}`, and `{street}`
- One-tap Call, SMS, and WhatsApp actions
- Optional photo attachment for WhatsApp outreach
- Per-user contact status tracking and tester activity logs
- Offline-friendly local caching with live online synchronization
- Separate responsive portal at `/portal/` for team access on mobile browsers
- Android release builds signed with a persistent keystore for update-safe installs

## Tech stack

- Frontend: HTML, CSS, JavaScript
- Client framework: React (loaded via browser bundle)
- Data/auth: Supabase
- Mobile packaging: Capacitor
- Hosting: GitHub Pages for the web app
- CI/CD: GitHub Actions

## Repository structure

```text
.
├── app.js                 # Main app logic and UI
├── config.js             # Supabase URL and public key
├── index.html            # App entry point
├── style.css             # Styling
├── manifest.json         # PWA metadata
├── sw.js                 # Service worker
├── capacitor.config.json # Capacitor Android config
├── package.json          # Node dependencies
├── vendor/               # Third-party libraries
├── icons/                # App icons and assets
├── portal/               # Responsive team portal
├── native/               # Android patching support scripts
├── supabase/             # Supabase SQL/config assets
├── .github/workflows/    # GitHub Actions automation
├── README.md             # Project documentation
├── MLC Ward-Wise List_ Nalgonda Heritage Poster.png
└── .gitignore
```

## Features in more detail

### Ward-wise records and search

The app presents data in ward groups and also supports a mixed-data view. Search works across names, relation details, address fields, phone numbers, and village names.

### Common messaging

Team members can create a reusable common message with placeholders. When a member record is opened, the app fills in fields like the contact name, relation, street, ward, and village before sending to WhatsApp or SMS.

### Contact actions and tracking

Each member card shows the latest Call/SMS/WhatsApp click status for a signed-in user. This helps a team know whether outreach has been attempted without relying on a separate tracker.

### Admin and activity monitoring

The app can record tester sign-ins, member changes, and outreach clicks in a dedicated activity table. This is especially useful for review by the configured admin account.

### Responsive portal

A separate portal is published under `/portal/` and shares the same app data, account access, and records as the main site. This is useful when the same system is accessed from mobile Safari with an Add to Home Screen flow.

## Local development

### Prerequisites

- Node.js 20+
- npm
- A working Supabase project and valid public keys
- Optional: Android Studio / Java 17 for Android packaging

### 1) Clone the repo

```bash
git clone https://github.com/ravulasrinivas944-crypto/mlc-app2.git
cd mlc-app2
```

### 2) Install dependencies

```bash
npm install
```

### 3) Configure Supabase

Open `config.js` and update the Supabase URL and public key to match your project:

```javascript
const SUPA_URL = 'https://your-project.supabase.co';
const SUPA_KEY = 'your-anon-key';
```

This app expects the database tables and RLS/security setup to already exist in the Supabase project.

### 4) Run the web app locally

Because this project is a static web app, you can serve it from the repository root with any simple static server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

You can also use a local static server of your choice if you prefer.

### 5) Android package build

The repo includes Capacitor support for Android builds. The Android workflow in `.github/workflows/build.yml` installs the app, patches Android config, syncs Capacitor, and signs the APK using a persistent keystore.

Typical Android steps are:

```bash
mkdir www
cp -r index.html style.css app.js config.js manifest.json sw.js vendor icons www/
npx cap add android
python3 native/patch_android.py
npx cap sync android
```

Then open the Android project in Android Studio or build via Gradle.

## Deployment

### GitHub Pages

The repo includes `.github/workflows/pages.yml`, which prepares the site and deploys it to GitHub Pages on pushes to `main`.

The build step copies the main app assets into a `dist` folder and includes the `/portal/` directory.

### Android APK release

The release APK is built in `.github/workflows/build.yml` and uses GitHub Actions secrets for signing:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

The README originally described the local generation flow for the keystore. The app expects the same keystore and alias to be reused for future Android updates so new APKs can install over older signed releases without uninstalling.

Important:

- do not commit the keystore file,
- keep the keystore and passwords private,
- keep the same keystore across future release builds.

## Security and operational notes

- Keep the Supabase keys and repository secrets private.
- Do not commit signing keystores or certificate materials.
- The app is designed for team operations and should be protected behind proper authentication and access policies.
- Activity logging records action metadata such as timestamps, user email, and action type; it does not store passwords or message content.

## Recommended workflow

1. Set up Supabase tables and security rules.
2. Update `config.js` with valid project values.
3. Publish the web app to GitHub Pages.
4. Sign in with the configured admin or tester account.
5. Add or import member data.
6. Build and distribute the Android APK once the signing secrets are configured.

## License

This project does not currently declare a license in the repository. If you are publishing or distributing it externally, add an explicit license file before broader sharing.

## Maintainer note

This app is a practical field/outreach tool for a specific ward-based communication workflow. It is best used in a controlled team environment where member records, contact outreach, and activity audits are managed by the right administrators.
