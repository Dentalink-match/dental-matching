import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wfxjhmmdxsjyhstxjipf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmeGpobW1keHNqeWhzdHhqaXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NDAyNjMsImV4cCI6MjA3NDAxNjI2M30.Ymw7_TI99qIhSqC8z5uKzhLo3mK8unl9cJUCwMyv43Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
