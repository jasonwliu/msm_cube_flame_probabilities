import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

def validate():
    json_path = "data/probabilities.json"
    if not os.path.exists(json_path):
        print(f"Error: {json_path} does not exist.")
        sys.exit(1)
        
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error: Failed to parse JSON: {e}")
        sys.exit(1)
        
    print("JSON successfully loaded.")
    
    # Check top level keys
    required_keys = ["potentials", "bonus_potentials", "flames"]
    for k in required_keys:
        if k not in data:
            print(f"Error: Missing top-level key '{k}'")
            sys.exit(1)
        print(f"Key '{k}' is present.")
        
    # Validate potentials
    print("\n--- Validating Potentials ---")
    pots = data["potentials"]
    print(f"Parsed potentials for {len(pots)} equipment types: {list(pots.keys())}")
    for eq_type, eq_data in pots.items():
        for tier, tier_data in eq_data.items():
            if "first" not in tier_data or "second_third" not in tier_data:
                print(f"Error: Potential item '{eq_type}' tier '{tier}' is missing 'first' or 'second_third' lines")
                sys.exit(1)
            # Check options
            for line_name in ["first", "second_third"]:
                opts = tier_data[line_name]
                prob_sum = sum(o["prob"] for o in opts)
                if prob_sum > 1.0001:
                    print(f"Warning: Potential '{eq_type}' ({tier}, {line_name}) has prob sum {prob_sum:.4f} > 1.0")
                for o in opts:
                    if o["prob"] < 0 or o["prob"] > 1.0:
                        print(f"Error: Option '{o['option']}' has invalid probability {o['prob']} in potential '{eq_type}'")
                        sys.exit(1)
                        
    # Validate bonus potentials
    print("\n--- Validating Bonus Potentials ---")
    bps = data["bonus_potentials"]
    print(f"Parsed bonus potentials for {len(bps)} equipment types: {list(bps.keys())}")
    for eq_type, eq_data in bps.items():
        for tier, tier_data in eq_data.items():
            if "first" not in tier_data or "second_third" not in tier_data:
                print(f"Error: Bonus potential item '{eq_type}' tier '{tier}' is missing 'first' or 'second_third' lines")
                sys.exit(1)
            # Check options
            for line_name in ["first", "second_third"]:
                opts = tier_data[line_name]
                prob_sum = sum(o["prob"] for o in opts)
                if prob_sum > 1.0001:
                    print(f"Warning: Bonus Potential '{eq_type}' ({tier}, {line_name}) has prob sum {prob_sum:.4f} > 1.0")
                for o in opts:
                    if o["prob"] < 0 or o["prob"] > 1.0:
                        print(f"Error: Option '{o['option']}' has invalid probability {o['prob']} in bonus potential '{eq_type}'")
                        sys.exit(1)

    # Validate flames
    print("\n--- Validating Rebirth Flames ---")
    flames = data["flames"]
    print(f"Parsed flames for {len(flames)} equipment types: {list(flames.keys())}")
    for eq_type, eq_data in flames.items():
        for tier, opts in eq_data.items():
            prob_sum = sum(o["prob"] for o in opts)
            if prob_sum > 1.0001:
                print(f"Warning: Rebirth Flame '{eq_type}' ({tier}) has prob sum {prob_sum:.4f} > 1.0")
            for o in opts:
                if o["prob"] < 0 or o["prob"] > 1.0:
                    print(f"Error: Option '{o['option']}' has invalid probability {o['prob']} in flame '{eq_type}'")
                    sys.exit(1)
                    
    print("\nValidation completed successfully! All checks passed.")

if __name__ == "__main__":
    validate()
