
from dotenv import load_dotenv
import os
load_dotenv('backend/.env')

from supabase import create_client

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    res = supabase.table('css_responses').select('id', count='exact').limit(1).execute()
    print('Table exists, count:', res.count)
except Exception as e:
    print('Error:', e)

