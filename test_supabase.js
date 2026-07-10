import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rhpyhlrwwzmagohmbitk.supabase.co";
const supabaseKey = "sb_publishable_VWJt5AbN92-EHHyczJF8Fg_DMOR5Py9";

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Supabase client initialized successfully.");
console.log("Testing getUser...");
supabase.auth
  .getUser("some_invalid_token")
  .then(({ data, error }) => {
    if (error) {
      console.log("Auth getUser expected error response:", error.message);
    } else {
      console.log("Auth getUser response:", data);
    }
  })
  .catch((err) => {
    console.error("Auth getUser exception:", err);
  });
