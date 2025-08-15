import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect authenticated users to dashboard
    setLocation("/dashboard");
  }, [setLocation]);

  return null;
}
