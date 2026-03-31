import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { API_BASE_URL } from "@/config";
import { showCyberToast } from "@/lib/toast-utils";

export default function RiotCallbackPage() {
  const [status, setStatus] = useState("Connecting to Riot...");
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      setStatus("No authorization code received.");
      setTimeout(() => navigate("/login"), 2000);
      return;
    }

    // Clean URL
    window.history.replaceState({}, "", "/auth/riot/callback");

    (async () => {
      try {
        // Check if user is already logged in (link mode)
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;

        setStatus(userId ? "Linking Riot account..." : "Creating account...");

        const res = await fetch(`${API_BASE_URL}/api/auth/riot/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, userId, mode: userId ? "link" : "login" }),
        });

        if (!res.ok) {
          const errText = await res.text();
          setStatus(`Failed: ${errText}`);
          showCyberToast({ title: "Riot auth failed", description: errText, variant: "error", tag: "ERR" });
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        const data = await res.json();

        if (data.mode === "login" && data.hashed_token) {
          setStatus("Signing in...");
          const { error: verifyErr } = await supabase.auth.verifyOtp({
            token_hash: data.hashed_token,
            type: "magiclink",
          });

          if (verifyErr) {
            console.error("OTP verify error:", verifyErr);
            setStatus("Login failed. Redirecting...");
            showCyberToast({ title: "Login failed", description: verifyErr.message, variant: "error", tag: "ERR" });
            setTimeout(() => navigate("/login"), 3000);
            return;
          }

          showCyberToast({ title: "Welcome", description: `Signed in as ${data.nametag}`, variant: "status" });
          navigate("/dashboard");
          return;
        }

        // Link mode — already logged in
        showCyberToast({ title: "Riot account linked", description: `${data.nametag} (${data.region.toUpperCase()})`, variant: "status" });
        navigate("/dashboard");
      } catch (err: any) {
        console.error("Riot callback error:", err);
        setStatus("Something went wrong.");
        showCyberToast({ title: "Error", description: err?.message ?? "Unknown error", variant: "error", tag: "ERR" });
        setTimeout(() => navigate("/login"), 3000);
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060F11]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-jade/30 border-t-jade rounded-full animate-spin" />
        <span className="font-mono text-[11px] text-flash/40 tracking-[0.2em] uppercase">
          {status}
        </span>
      </div>
    </div>
  );
}
