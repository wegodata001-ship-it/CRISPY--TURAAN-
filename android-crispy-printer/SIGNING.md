# CRISPY Printer release signing

The production tablet already has `com.crispy.turaan.printer` installed.
Every future update must use the same package name and the same signing certificate.
Generating a new keystore makes Android reject the update.

The keystore and passwords stay outside this repository.

Required environment variables:

- `CRISPY_KEYSTORE_FILE` — absolute path to the persistent keystore
- `CRISPY_KEYSTORE_PASSWORD` — store password
- `CRISPY_KEY_ALIAS` — key alias
- `CRISPY_KEY_PASSWORD` — key password

If those variables are unset, `npm run android:release` reads the same values from:

`%USERPROFILE%\.crispy-signing\keystore.properties`

That file is not part of the project. Do not copy it into git.

The release script checks the APK certificate against the certificate already installed on the tablet:

`1748c43f45648e157717b2891fe8e9f1d9e4f0b8e168fc0435173a7bb412d25b`

That certificate is the persistent identity. Release builds set `debuggable=false`, but they must still be signed with this same certificate. Generating a different keystore makes Android reject the update over the installed app.

Do not delete or regenerate that key. A release build without it is not an installable update.
