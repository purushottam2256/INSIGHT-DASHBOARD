import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
    const { data, error } = await supabase.from('leaves').select('*');
    if (error) {
        console.error("DB Error:", error);
    } else {
        console.log("LEAVES COUNT:", data.length);
        console.log("LEAVES:", JSON.stringify(data, null, 2));
    }
}

main();
