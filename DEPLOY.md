# Shipping Pitch Pass to the App Store and Google Play

## How the project fits together

- **The app** lives at the repo root (`index.html`, `css/`, `js/`, `fonts/`, `icons/`). It is plain HTML, CSS and JavaScript with no build step.
- **GitHub Pages** serves the root, so every push to `main` updates https://danielsimeon1000-byte.github.io/PITCH-PASS/
- **Capacitor** wraps the same code into native apps: `android/` and `ios/`.
  - `npm run build` copies the app into `www/`
  - `npx cap sync` copies `www/` into both native projects
- **App ID:** `com.simeondaniel.pitchpass` (in `capacitor.config.json`). Change it now if you want a different one. It can't change after the first store upload.

## 1. Accounts and costs

| Store | Cost | Notes |
|---|---|---|
| Google Play Console | $25 once | A personal account made after 13 Nov 2023 must run a **closed test with at least 12 testers for 14 days in a row** before it can publish. An organization account (needs a D-U-N-S number) skips this. |
| Apple Developer Program | $99 a year | Identity check, usually approved within a day or two. |

Both stores also need:
- **Privacy policy URL:** `privacy.html` is already in this repo, at https://danielsimeon1000-byte.github.io/PITCH-PASS/privacy.html
- **Support email:** danielsimeon400@gmail.com is in the policy.
- **Screenshots, description and age rating** (see section 6).

## 2. Test on your own phone now

- **Any phone:** open the GitHub Pages link in Chrome or Safari and allow the mic. On iPhone, Share › Add to Home Screen makes it open full screen like an app.
- **Android APK:** every push to `main` runs the "Android test build" workflow.
  1. Open the repo's **Actions** tab and pick the latest run.
  2. Download **pitch-pass-debug-apk**, unzip it and open `app-debug.apk` on the phone.
  3. Android will ask you to allow installs from that source.

## 3. Google Play release

1. Install **Android Studio** on your laptop (Windows is fine).
2. In the repo folder, run `npm install` then `npm run android`. Android Studio opens the project.
3. **Build › Generate Signed App Bundle / APK › Android App Bundle.** Create an upload key when asked. Back up the `.jks` file and its passwords somewhere safe and never commit them. Losing them makes updates painful.
4. In **Play Console**, create the app and fill in:
   - **Store listing:** use section 6.
   - **Content rating questionnaire:** expect Everyone / PEGI 3.
   - **Data safety:** audio is processed on the device and not collected or shared, and progress stays on the device. If you add RevenueCat, declare purchase history as collected for app functionality.
   - **Target audience:** pick an adult age group unless you plan to follow the Families policy.
5. **Testing › Closed testing:** create a track, upload the `.aab`, and add at least 12 testers by email list or Google Group. Ask them to open the app over the 14 days; Google now checks that testers actually use it.
6. After 14 days, apply for **production access**, then roll out to production.

Each update: bump `versionCode` and `versionName` in `android/app/build.gradle`, then run `npm run sync` and rebuild.

## 4. App Store release

Building for iPhone needs macOS. Choose one:
- **A Mac** (yours, borrowed, or rented by the hour): run `npm install`, then `npm run ios`. In Xcode, pick your Team under Signing & Capabilities, then **Product › Archive › Distribute App › App Store Connect**.
- **No Mac:** use a cloud Mac service that builds Capacitor apps from GitHub, such as **Codemagic** (free monthly macOS minutes), **Capgo Build**, **Capawesome Cloud** or **Xcode Cloud**. Connect the repo, add an App Store Connect API key, and it signs the build and uploads it to TestFlight.

Then in **App Store Connect**:
1. Create the app with bundle ID `com.simeondaniel.pitchpass`.
2. Add the build to **TestFlight** and test on your iPhone.
3. Fill in:
   - **App Privacy:** Data Not Collected, unless you add analytics or RevenueCat.
   - **Age rating:** 4+.
   - **Category:** Music, with Education as the secondary category.
   - **Screenshots:** 6.9-inch iPhone, at least 3.
4. Submit for review. The microphone permission text is already in `ios/App/App/Info.plist`.

Review risk to know about: Apple rejects apps that feel like a website in a wrapper (guideline 4.2). Pitch Pass ships everything inside the app, works offline and is a full game, which helps. Keep it that way: no visible browser UI and no screens that just link out to web pages.

## 5. In-app purchases (Pro)

Both stores require their own billing for digital subscriptions. The simplest route is **RevenueCat** (free until you earn real revenue):

1. Create the products in both stores:
   - `pitchpass_pro_monthly`: $7.99
   - `pitchpass_pro_yearly`: $49.99 with a 7-day free trial
   - Set lower local prices per country (for example Nigeria) in each store's pricing screen.
2. In RevenueCat, add both apps, create an entitlement called `pro`, and attach both products to an offering.
3. Run `npm i @revenuecat/purchases-capacitor`, then `npx cap sync`.
4. Add `js/billing.js`, which:
   - configures RevenueCat with your API keys on launch
   - sets `S.pro` from the `pro` entitlement
   - defines `window.PitchPassBilling.purchase(plan)`, which the paywall already calls if it exists
   - adds a Restore Purchases button (Apple requires one)
5. Set `ALLOW_PRO_PREVIEW = false` in `js/config.js` before submitting. That removes the free test unlock.

## 6. Store listing draft

- **Name:** Pitch Pass: Ear Training
- **Subtitle / short description:** Sing the note. Pass the wall.
- **Description:**
  > Pitch Pass turns ear training into a game. Hear a note, sing it back, and your voice moves the ball. Hit the pitch and it slips through the hole in the wall. Miss, and the app tells you exactly how many cents sharp or flat you were.
  >
  > Free: the major scale course, a daily challenge, streaks and weekly progress.
  > Pro: riffs and runs, vibrato and sustain drills, intervals, sharps and flats, short melodies, Perfect mode (±15 cents) and full history.
  >
  > Your voice is analysed on your phone. Nothing is recorded or uploaded.
- **Keywords:** pitch, ear training, singing, vocal, voice, tuner, solfege, runs, riffs, vibrato
- **Icon:** `assets/icon-only.png` (1024×1024)

## 7. Day-to-day workflow

1. Edit the files at the repo root.
2. Push to `main`. GitHub Pages updates the web version and a new test APK builds.
3. For a store update, run `npm run sync`, bump the version numbers, then build and upload as in sections 3 and 4.
