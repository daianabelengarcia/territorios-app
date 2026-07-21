import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL  = 'https://zywwdpycovrrigtchldg.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5d3dkcHljb3ZycmlndGNobGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MTIwMDEsImV4cCI6MjEwMDE4ODAwMX0.qarUGR3XQ4x83NaLYrygfSEMkvUWCbTtLjSIek_xJ2E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    // En mobile usa AsyncStorage; en web usa localStorage (comportamiento por defecto)
    storage: Platform.OS !== 'web' ? AsyncStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
