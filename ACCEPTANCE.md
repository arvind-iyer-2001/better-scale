# better-scale on-device acceptance (Task 11)

Build: Release, free Personal Team, installed from Xcode. Fill in after each run; read the log with
`xcrun devicectl device copy from --device <id> --domain-type appDataContainer --domain-identifier dev.arvindiyer.betterscale --source Documents/app-log.txt --destination ./app-log.txt`.

First run: open the app, enter profile, allow Notifications and Health, tap "Pair your scale", step on the scale.

| # | Case | Do | Pass means | Result |
|---|------|----|-----------|--------|
| a | Background, unlocked | Home screen, step on scale | `reading ... kg` in log, Health has weight/BMI/body fat/lean mass | |
| b | Locked 3+ min | Lock phone, step on scale, unlock | reading stored; Health sample appears after opening the app (known: no unlock trigger) | |
| c | Reboot | Reboot, unlock once, leave app closed, step on scale | `RESTORED state` then `reading` in log | |
| d | Bag (~25 kg) | Weigh a bag after a few real weigh-ins | flagged: notification "looks off", hidden from graph, listed under hidden readings, absent from Health | |
| e | Force quit | Swipe app away, step on scale | nothing stored; the 09:30 follow-up reminder says to open the app | |
| f | Reminder | Set reminder 2 min ahead | banner appears; a weigh-in cancels that day's follow-up | |
| g | Health denied | Turn Body Mass off in Health > Sharing | readings still store, Settings shows `Access: denied`, no repeated duplicate samples | |
| h | Re-weigh after flagged | Step on again within 10 s of a flagged reading | second reading recorded | |
