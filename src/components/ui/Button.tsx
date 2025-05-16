"use client";

import React from "react";
import { motion } from "motion/react";

export default function Button({
  children,
  onClick,
  className = "m-20 p-5 bg-black rounded-full text-white",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <motion.button
      className={className}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}
