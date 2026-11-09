"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const STAGGER_STEP_SECONDS = 0.06;

export function Reveal({
  children,
  index = 0,
  className,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * STAGGER_STEP_SECONDS, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
