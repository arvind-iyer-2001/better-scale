# Task 1 gate results (2026-11-02, Release build on iPhone, free Personal Team)

- HealthKit available: yes. Authorization granted; wrote body mass 70 kg and read it back (70). Works on a free account.
- Write while locked: inconclusive. A JS timer does not fire while the app is suspended, so check (c) never ran. Real test happens in Task 11 (weigh-in while locked). HealthKit also exposes `isProtectedDataAvailable`, used by the sync flush.
- Local notification banners: appeared while the phone was locked (user confirmed). Which trigger (60 s timer or daily calendar) was not distinguished; Task 9 verifies the calendar trigger on device.
- Entitlements: `scripts/fix-entitlements.sh` strips `aps-environment` and the HealthKit background-delivery entitlement; `com.apple.developer.healthkit` stays.
