
from dotenv import load_dotenv
import os
import pandas as pd
import math
from supabase import create_client

load_dotenv('backend/.env')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

df = pd.read_csv(r'c:\Projects\rag-governance\referencesPic\css dashboard\css_responses_rows.csv')

records = df.to_dict(orient='records')
cleaned_records = []
for r in records:
    clean_r = {}
    for k, v in r.items():
        if pd.isna(v):
            clean_r[k] = None
        else:
            clean_r[k] = v
    cleaned_records.append(clean_r)

try:
    for record in cleaned_records:
        supabase.table('css_responses').upsert(record, on_conflict='id').execute()
    print(f'Upserted {len(cleaned_records)} records successfully.')
except Exception as e:
    print('Error:', e)

