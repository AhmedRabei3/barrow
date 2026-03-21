import { useState } from "react";

export function useResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (token: string, e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setMessage("كلمتا المرور غير متطابقتين");
      return;
    }
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(data.message);
  };

  return {
    password,
    setPassword,
    confirm,
    setConfirm,
    message,
    setMessage,
    loading,
    setLoading,
    handleSubmit,
  };
}
