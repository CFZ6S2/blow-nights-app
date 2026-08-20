import json
import urllib.request
import urllib.parse
import re
import os
import time

def translate(text):
    if not isinstance(text, str):
        return text
    if not text.strip():
        return text
        
    # Replace {{var}} with __var__ to protect it
    protected_text = re.sub(r'\{\{(.*?)\}\}', r'__\1__', text)
    
    q = urllib.parse.quote(protected_text)
    url = f'https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=en&dt=t&q={q}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                res = json.loads(response.read().decode('utf-8'))
                translated = ''.join([t[0] for t in res[0] if t[0]])
                
                # Revert __var__ back to {{var}}
                translated = re.sub(r'__(.*?)__', r'{{\1}}', translated)
                return translated
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"Failed to translate: {text}, error: {e}")
                return text
            time.sleep(1)

def merge_and_translate(es_dict, en_dict):
    result = en_dict.copy()
    
    for k, v in es_dict.items():
        if isinstance(v, dict):
            if k not in result or not isinstance(result[k], dict):
                result[k] = {}
            result[k] = merge_and_translate(v, result[k])
        else:
            if k not in result or result[k] == v:
                # if value is identical, it might be an untranslated string or a coincidentally same string.
                # Just translate it.
                translated = translate(v)
                result[k] = translated
    return result

es_path = r'c:\dev\blow-nights-app\frontend\src\i18n\locales\es.json'
en_path = r'c:\dev\blow-nights-app\frontend\src\i18n\locales\en.json'

with open(es_path, 'r', encoding='utf-8') as f:
    es_data = json.load(f)
    
with open(en_path, 'r', encoding='utf-8') as f:
    en_data = json.load(f)

print("Starting merge and translation...")
final_en = merge_and_translate(es_data, en_data)

with open(en_path, 'w', encoding='utf-8') as f:
    json.dump(final_en, f, indent=2, ensure_ascii=False)

print("Done!")
