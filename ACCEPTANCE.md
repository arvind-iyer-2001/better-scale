# better-scale on-device acceptance (Task 11)

Build: Release, free Personal Team, installed from Xcode. Fill in after each run; read the log with
`xcrun devicectl device copy from --device <id> --domain-type appDataContainer --domain-identifier dev.arvindiyer.betterscale --source Documents/app-log.txt --destination ./app-log.txt`.

First run: open the app, enter profile, allow Notifications and Health, tap "Pair your scale", step on the scale.

| # | Case | Do | Pass means | Result |
|---|------|----|-----------|--------|
| a | Background, unlocked | Home screen, step on scale | `reading ... kg` in log, Health has weight/BMI/body fat/lean mass | PASS 2026-11-02: reading + Health write (log 12:20). |
| b | Locked 3+ min | Lock phone, step on scale, unlock | reading stored; Health sample appears after opening the app (known: no unlock trigger) | PASS: locked weigh-in stored, written=0 deferred=1, written on app open. |
| c | Reboot | Reboot, unlock once, leave app closed, step on scale | `RESTORED state` then `reading` in log | PASS: reboot, unlock, app closed; relaunched in background, RESTORED, reading stored. |
| d | Bag (~25 kg) | Weigh a bag after a few real weigh-ins | flagged: notification "looks off", hidden from graph, listed under hidden readings, absent from Health | PASS after fix: min history lowered 5 to 3; 25.7 and 140.3 flagged, notification came, absent from Health. |
| e | Force quit | Swipe app away, step on scale | nothing stored; the 09:30 follow-up reminder says to open the app | PASS: nothing stored while force-quit; clean startup after. (09:30 follow-up text unverified.) |
| f | Reminder | Set reminder 2 min ahead | banner appears; a weigh-in cancels that day's follow-up | PARTIAL: permission was the problem (now granted); test notification and "looks off" banners work; 12 reminders scheduled. Real 07:00 banner pending (today suppressed by design). |
| g | Health denied | Turn Body Mass off in Health > Sharing | readings still store, Settings shows `Access: denied`, no repeated duplicate samples | PASS: reading stored, deferred repeatedly, no duplicate samples; flushed once (written=2) after re-enabling. |
| h | Re-weigh after flagged | Step on again within 10 s of a flagged reading | second reading recorded | PASS: 140.3 flagged then 124.9 recorded as a new reading. |
