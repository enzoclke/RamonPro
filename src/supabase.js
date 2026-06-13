import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xbzbrozvjnempbnymilc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiemJyb3p2am5lbXBibnltaWxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDU0MTEsImV4cCI6MjA5Njg4MTQxMX0.RXyLvo6-pObn_aLYejQmLb8EyyObAqPI3joyMmtHgwQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);