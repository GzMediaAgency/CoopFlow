"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";

interface LoginErrorProps {
  error?: string;
  invalidMsg: string;
  expiredMsg: string;
  forgotMsg: string;
}

export function LoginError({ error, invalidMsg, expiredMsg, forgotMsg }: LoginErrorProps) {
  const [isOtpExpired, setIsOtpExpired] = useState(error === "otp_expired");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash.includes("otp_expired") || hash.includes("access_denied")) {
        setIsOtpExpired(true);
      }
    }
  }, []);

  if (isOtpExpired) {
    return (
      <div role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">
        <p className="font-semibold">{expiredMsg}</p>
        <p className="mt-1 text-xs">
          <Link href="/forgot-password" className="underline font-medium hover:text-danger/80">
            {forgotMsg}
          </Link>
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">
        {invalidMsg}
      </p>
    );
  }

  return null;
}
