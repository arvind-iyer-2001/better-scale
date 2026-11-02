"""Generate golden vectors for src/domain/bodycomp.ts from the Python reference port.
Run: uv run --with numpy python scripts/gen_golden.py
The vendor binary / Unicorn oracle are not used here; the Python port already matches it exactly."""
import json, random, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root.parent / "re" / "cultconnect" / "port"))
from bh_legs140 import legs

def metrics(o, W):
    return {
        "weightKg": W / 10, "bmi": o[6] / 10, "fatPct": o[1] / 10, "fatKg": o[0] / 10,
        "subcutPct": o[0xE] / 10, "subcutKg": o[0xD] / 10, "visceral": o[0x18],
        "muscleKg": o[0x20] / 10, "musclePct": o[0x1F] / 10, "skeletalMuscleKg": o[0x1A] / 10,
        "waterPct": o[0x15] / 10, "proteinKg": W * o[0x1D] / 10000, "boneKg": o[0x12] / 10,
        "bmr": o[9], "bodyAge": o[0xB], "idealWeightKg": o[0x14] / 10, "ffmKg": o[0xC] / 10,
    }

def case(male, athlete, h, age, W, z):
    return {"male": male, "athlete": athlete, "heightCm": h, "ageYears": age, "weightX10": W, "impedanceOhm": z,
            "expected": metrics(legs(int(male), int(athlete), h, age, W, z), W)}

random.seed(1)
cases = [case(True, False, 180, 25, 1247, 416), case(True, False, 180, 25, 1249, 413)]
for _ in range(500):
    cases.append(case(random.random() < .5, random.random() < .2, random.randint(140, 200), random.randint(10, 80),
                      random.randint(400, 1400), random.randint(250, 800)))
out = root / "__tests__" / "golden" / "legs140.json"
out.write_text(json.dumps(cases))
print("wrote", len(cases), "cases to", out)
