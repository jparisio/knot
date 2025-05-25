"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

export default function RouteButton({ route }: { route: string }) {
  const router = useRouter();

  function handleClick() {
    router.push("/" + route);
  }

  return <Button onClick={handleClick}>Start Analyzing</Button>;
}
