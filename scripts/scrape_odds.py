import urllib.request
import re
import html
import json
import time
import os
import sys

# Ensure UTF-8 output in logs
sys.stdout.reconfigure(encoding='utf-8')

MAIN_URL = "https://m.nexon.com/probability?client_id=MTY3MDg3NDAy&language=en"
BASE_SUB_URL = "https://m.nexon.com/probability/"

# List of target stats for potential and bonus potential
TARGET_POTENTIALS = {
    "Max HP": "Max HP",  # Separated later into (flat) or (%)
    "PHY ATK": "PHY ATK",
    "MAG ATK": "MAG ATK",
    "Crit DMG": "Crit DMG",
    "Crit DMG (%)": "Crit DMG",
    "Item Drop Rate Increase": "Item Drop Rate Increase",
    "EXP Increase": "EXP Increase",
    "PHY ATK Increase": "PHY ATK Increase",
    "PHY ATK(%)": "PHY ATK Increase",
    "MAG ATK Increase": "MAG ATK Increase",
    "MAG ATK(%)": "MAG ATK Increase",
    "PHY DMG Increase": "PHY DMG Increase",
    "MAG DMG Increase": "MAG DMG Increase",
    "Boss ATK Increase": "Boss ATK Increase (%)",
    "Boss ATK Increase (%)": "Boss ATK Increase (%)",
    "SPD Increase": "SPD Increase"
}

# List of target stats for rebirth flames (mapped by prefix)
TARGET_FLAMES = {
    "PHY ATK scales with": "PHY ATK scales with X",
    "MAG ATK scales with": "MAG ATK scales with X",
    "Crit DMG scales with": "Crit DMG scales with X",
    "Final DMG Increase": "Final DMG Increase",
    "DEF Ignore Rate": "DEF Ignore Rate"
}

def fetch_page(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def clean_html(text):
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text)
    return ' '.join(text.split()).strip()

def parse_percentage(val_str):
    """Parse percentage string (e.g. 1.39%) to decimal float (0.0139)"""
    val_str = val_str.replace('%', '').strip()
    try:
        return float(val_str) / 100.0
    except ValueError:
        return 0.0

def parse_potentials(table_html, page_name, category="Potential"):
    """
    Parse a potential table.
    For regular potential (Table 1), rows are divided by headers like Potential Rank: Rare.
    For bonus potential (Table 2), rows have Left Label and Right Label specifying the tier and line.
    """
    rows = re.findall(r'<tr.*?>(.*?)</tr>', table_html, re.DOTALL | re.IGNORECASE)
    
    data = {} # tier -> line (first vs second_third) -> list of options
    
    current_tier = None
    
    # Check if this table has Left Label/Right Label structure (Bonus Potential)
    is_bonus_potential = False
    if len(rows) > 0:
        first_row_cells = [clean_html(c) for c in re.findall(r'<t[dh].*?>(.*?)</t[dh]>', rows[0], re.DOTALL | re.IGNORECASE)]
        if "Equipment Type (Rank)" in first_row_cells:
            is_bonus_potential = True

    if is_bonus_potential:
        # Parse Bonus Potential
        for row in rows[1:]: # Skip header
            cells = [clean_html(c) for c in re.findall(r'<t[dh].*?>(.*?)</t[dh]>', row, re.DOTALL | re.IGNORECASE)]
            if len(cells) < 8:
                continue
            
            # Left side: First Potential
            left_label, left_opt, left_val, left_prob = cells[0], cells[1], cells[2], cells[3]
            # Right side: Second/Third Potential
            right_label, right_opt, right_val, right_prob = cells[5], cells[6], cells[7], cells[8]
            
            # Helper to parse side
            def parse_bp_side(label, opt, val, prob, line_name):
                if not opt or not prob:
                    return
                # Extract tier from label
                tier_match = re.search(r'\((Rare|Epic|Unique|Legendary)\)', label, re.IGNORECASE)
                if not tier_match:
                    return
                tier = tier_match.group(1)
                
                # Check target stats
                if opt in TARGET_POTENTIALS:
                    clean_opt = TARGET_POTENTIALS[opt]
                    if clean_opt == "Max HP":
                        clean_opt = "Max HP (%)" if "%" in val else "Max HP (flat)"
                    
                    if tier not in data:
                        data[tier] = {"first": [], "second_third": []}
                    
                    data[tier][line_name].append({
                        "raw_option": opt,
                        "option": clean_opt,
                        "value": val,
                        "prob": parse_percentage(prob)
                    })
            
            parse_bp_side(left_label, left_opt, left_val, left_prob, "first")
            parse_bp_side(right_label, right_opt, right_val, right_prob, "second_third")
            
    else:
        # Parse Regular Potential
        for row in rows:
            cells = [clean_html(c) for c in re.findall(r'<t[dh].*?>(.*?)</t[dh]>', row, re.DOTALL | re.IGNORECASE)]
            if len(cells) == 0:
                continue
            
            # Check for tier change header
            # Row 1: ['Potential Rank', 'Rare', '', 'Equipment Type', 'Weapon']
            if "Potential Rank" in cells[0]:
                for cell in cells:
                    if cell in ["Rare", "Epic", "Unique", "Legendary"]:
                        current_tier = cell
                continue
                
            if not current_tier or len(cells) < 7:
                continue
                
            # Columns: Left side (1st potential), Right side (2nd/3rd potential)
            left_opt, left_val, left_prob = cells[0], cells[1], cells[2]
            right_opt, right_val, right_prob = cells[4], cells[5], cells[6]
            
            if left_opt in TARGET_POTENTIALS and left_prob:
                clean_opt = TARGET_POTENTIALS[left_opt]
                if clean_opt == "Max HP":
                    clean_opt = "Max HP (%)" if "%" in left_val else "Max HP (flat)"
                
                if current_tier not in data:
                    data[current_tier] = {"first": [], "second_third": []}
                
                data[current_tier]["first"].append({
                    "raw_option": left_opt,
                    "option": clean_opt,
                    "value": left_val,
                    "prob": parse_percentage(left_prob)
                })
                
            if right_opt in TARGET_POTENTIALS and right_prob:
                clean_opt = TARGET_POTENTIALS[right_opt]
                if clean_opt == "Max HP":
                    clean_opt = "Max HP (%)" if "%" in right_val else "Max HP (flat)"
                
                if current_tier not in data:
                    data[current_tier] = {"first": [], "second_third": []}
                
                data[current_tier]["second_third"].append({
                    "raw_option": right_opt,
                    "option": clean_opt,
                    "value": right_val,
                    "prob": parse_percentage(right_prob)
                })
                
    return data

def parse_rebirth_flames(table_html):
    """
    Parse rebirth flames table.
    It contains multiple equipment types (Weapon, Hat, Gloves, Outfit, etc.) separated by header rows.
    """
    rows = re.findall(r'<tr.*?>(.*?)</tr>', table_html, re.DOTALL | re.IGNORECASE)
    
    data = {} # equipment -> tier -> list of options
    
    current_equipment = "Weapon" # default start
    tiers = ["Rare", "Epic", "Unique", "Legendary", "Mythic"]
    
    for row in rows:
        cells = [clean_html(c) for c in re.findall(r'<t[dh].*?>(.*?)</t[dh]>', row, re.DOTALL | re.IGNORECASE)]
        if len(cells) == 0:
            continue
            
        # Check for equipment header
        # E.g. ['Outfit', 'Rare', 'Epic', 'Unique', 'Legendary', 'Mythic']
        if len(cells) >= 3 and cells[1] == "Rare" and cells[2] == "Epic":
            current_equipment = cells[0]
            if current_equipment == "Shoulder":
                current_equipment = "Shoulders"
            continue
            
        if len(cells) < 11:
            continue
            
        opt = cells[0]
        # Map options
        matched_clean = None
        for prefix, clean_name in TARGET_FLAMES.items():
            if opt.startswith(prefix):
                matched_clean = clean_name
                break
                
        if not matched_clean:
            continue
            
        if current_equipment not in data:
            data[current_equipment] = {t: [] for t in tiers}
            
        # Columns:
        # Col 0: Option name
        # Col 1: Rare Value, Col 2: Rare Prob
        # Col 3: Epic Value, Col 4: Epic Prob
        # Col 5: Unique Value, Col 6: Unique Prob
        # Col 7: Legendary Value, Col 8: Legendary Prob
        # Col 9: Mythic Value, Col 10: Mythic Prob
        for i, tier in enumerate(tiers):
            val_idx = 1 + i * 2
            prob_idx = 2 + i * 2
            
            val = cells[val_idx]
            prob = cells[prob_idx]
            
            if val and prob and prob != "0.00%" and prob != "-":
                data[current_equipment][tier].append({
                    "raw_option": opt,
                    "option": matched_clean,
                    "value": val,
                    "prob": parse_percentage(prob)
                })
                
    return data

def main():
    print("Scraper started...")
    
    # Step 1: Discover subpages
    main_html = fetch_page(MAIN_URL)
    if not main_html:
        print("Failed to fetch main page. Exiting.")
        sys.exit(1)
        
    matches = re.findall(r'data-id="(\d+)"[^>]*>.*?<span>(.*?)</span>', main_html, re.DOTALL)
    
    targets = []
    for data_id, name in matches:
        name_clean = name.strip()
        is_target = "Cube" in name_clean or "Rebirth Flame" in name_clean
        if is_target:
            targets.append((data_id, name_clean))
            
    print(f"Discovered {len(targets)} target pages.")
    
    results = {
        "potentials": {},
        "bonus_potentials": {},
        "flames": {}
    }
    
    # Mapping of name to item type
    # e.g. "Cube/Bonus Potential Cube (Weapon)" -> "Weapon"
    def extract_item_type(name):
        match = re.search(r'\((.*?)\)', name)
        if match:
            return match.group(1).strip()
        return name
        
    for data_id, name in targets:
        print(f"Processing ID {data_id}: {name}...")
        url = f"{BASE_SUB_URL}{data_id}?language=en"
        page_html = fetch_page(url)
        if not page_html:
            print(f"  Failed to fetch page for ID {data_id}")
            continue
            
        tables = re.findall(r'<table.*?>(.*?)</table>', page_html, re.DOTALL | re.IGNORECASE)
        print(f"  Found {len(tables)} tables")
        
        if "Rebirth Flame" in name:
            if len(tables) > 0:
                flame_data = parse_rebirth_flames(tables[0])
                results["flames"] = flame_data
                print(f"  Parsed Rebirth Flames data. Equipment categories: {list(flame_data.keys())}")
        else:
            item_type = extract_item_type(name)
            
            # Regular Potential: always Table 1 (index 0)
            if len(tables) > 0:
                pot_data = parse_potentials(tables[0], name, "Potential")
                results["potentials"][item_type] = pot_data
                print(f"  Parsed Regular Potential for {item_type}. Tiers: {list(pot_data.keys())}")
                
            # Bonus Potential: Table[-2] if tables > 2
            if len(tables) > 2:
                bp_data = parse_potentials(tables[-2], name, "Bonus Potential")
                results["bonus_potentials"][item_type] = bp_data
                print(f"  Parsed Bonus Potential for {item_type}. Tiers: {list(bp_data.keys())}")
                
        # Pause between requests
        time.sleep(0.5)
        
    # Ensure data dir exists
    os.makedirs("data", exist_ok=True)
    
    output_path = "data/probabilities.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
        
    print(f"Finished! Parsed data saved to {output_path}")

if __name__ == "__main__":
    main()
