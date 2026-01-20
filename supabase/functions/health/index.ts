// Placeholder edge function for Lovable Cloud
// This project uses PHP API + MySQL as its backend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  return new Response(JSON.stringify({ 
    status: "ok",
    message: "This project uses PHP API + MySQL backend. See php-api folder."
  }), {
    headers: { "Content-Type": "application/json" },
  });
});
