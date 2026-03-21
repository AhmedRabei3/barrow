"use client";

import { useState, useEffect } from "react";

interface UseClientInterface {
  children: React.ReactNode;
}

const ClientOnly: React.FC<UseClientInterface> = ({ children }) => {
  const [isMounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return isMounted ? <div>{children}</div> : null;
};

export default ClientOnly;
