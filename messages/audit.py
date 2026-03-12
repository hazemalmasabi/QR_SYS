import json
import os

def find_missing_keys(base_dict, target_dict, path=""):
    missing = []
    for key, value in base_dict.items():
        current_path = f"{path}.{key}" if path else key
        if key not in target_dict:
            missing.append(current_path)
        elif isinstance(value, dict):
            if not isinstance(target_dict[key], dict):
                missing.append(current_path)
            else:
                missing.extend(find_missing_keys(value, target_dict[key], current_path))
    return missing

def audit_translations():
    # Since the script is inside the 'messages' directory, we use its own path
    messages_dir = os.path.dirname(os.path.abspath(__file__))
    base_file = os.path.join(messages_dir, 'en.json')
    
    if not os.path.exists(base_file):
        print(f"Error: Base file 'en.json' not found in {messages_dir}")
        return

    with open(base_file, 'r', encoding='utf-8') as f:
        en = json.load(f)
    
    print(f"Base Language: English (en.json)")
    print("-" * 40)
    
    found_issues = False
    # List all files except the script itself and the base language
    for filename in os.listdir(messages_dir):
        if filename.endswith('.json') and filename != 'en.json':
            target_file = os.path.join(messages_dir, filename)
            with open(target_file, 'r', encoding='utf-8') as f:
                target_data = json.load(f)
            
            lang_code = filename.replace('.json', '')
            missing = find_missing_keys(en, target_data)
            
            if missing:
                found_issues = True
                print(f"❌ Language: {lang_code.upper()} ({filename})")
                print(f"   Missing Keys: {len(missing)}")
                for key in missing:
                    print(f"     - {key}")
            else:
                print(f"✅ Language: {lang_code.upper()} ({filename}) - Fully Synchronized")
    
    if not found_issues:
        print("-" * 40)
        print("Success: All language files are fully synchronized with English!")

if __name__ == "__main__":
    audit_translations()
