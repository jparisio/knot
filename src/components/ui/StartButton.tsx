"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

export default function StartButton() {
  const router = useRouter();

  function handleClick() {
    router.push("/dashboard");
  }

  return <Button onClick={handleClick}>Start Analyzing</Button>;
}
