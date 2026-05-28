"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Completing sign in…");

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.push("/dashboard");
      } else if (event === "SIGNED_OUT") {
        router.push("/login");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.push("/dashboard");
      } else {
        setTimeout(() => {
          setStatus("Could not verify email. Try signing in again.");
        }, 3000);
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-xl mx-auto mb-4 animate-pulse">🛡️</div>
        <p className="text-sm text-white/50">{status}</p>
      </div>
    </div>
  );
}
