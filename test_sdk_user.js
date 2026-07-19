import { createClient } from '@supabase/supabase-js';
const email = "hulkxdrav@gmail.com";
const password = "Vista@123new";
const supabaseUrl = "https://rhpyhlrwwzmagohmbitk.supabase.co";
const supabaseKey = "sb_publishable_VWJt5AbN92-EHHyczJF8Fg_DMOR5Py9";

async function run() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("1. Logging in to get access token...");
    const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (loginError) {
      console.error("Login failed:", loginError.message);
      return;
    }
    
    const token = sessionData.session.access_token;
    console.log("Logged in! Token length:", token.length);

    console.log("\n2. Testing supabase.auth.getUser(token) verification...");
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);

    if (getUserError) {
      console.error("getUser failed:", getUserError.message);
    } else {
      console.log("getUser succeeded! User ID:", user.id);
    }

  } catch (err) {
    console.error("Error:", err);
  }
}

run();
