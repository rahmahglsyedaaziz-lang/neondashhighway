import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "@/integrations/supabase/client";

const oauthBrokerUrl = "https://neondashhighway.lovable.app/~oauth/initiate";

const socialAuth = createLovableAuth({ oauthBrokerUrl });

export async function signInWithGoogle(redirectUri: string) {
  const result = await socialAuth.signInWithOAuth("google", {
    redirect_uri: redirectUri,
  });

  if (result.redirected || result.error) return result;

  try {
    await supabase.auth.setSession(result.tokens);
    return result;
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}