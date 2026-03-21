import { useEffect, useState } from "react";

export function useResetToken() {
  const [token, setToken] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const t = new URLSearchParams(window.location.search).get("token") || "";
      setToken(t);
    }
  }, []);

  return token;
}
