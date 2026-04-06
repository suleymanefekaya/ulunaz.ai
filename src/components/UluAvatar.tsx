"use client";

import { motion } from "framer-motion";
import Image from "next/image";

type UluState = "idle" | "typing" | "generating";

interface UluAvatarProps {
  state?: UluState;
  size?: "sm" | "md" | "lg";
}

export function UluAvatar({ state = "idle", size = "md" }: UluAvatarProps) {
  // Büyüklük ayarları
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-32 h-32",
  };

  const containerClasses = sizeClasses[size];

  return (
    <div className={`relative flex items-end justify-center ${containerClasses}`}>
      {/* Glow effect for modernity when generating */}
      {state === "generating" && (
        <motion.div
          className="absolute -inset-4 bg-ulu-orange/20 rounded-full blur-2xl z-0"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
      )}

      {/* Actual Frameless Avatar Image with Drop Shadow */}
      <motion.div
        className="relative z-10 w-full h-full drop-shadow-xl"
        animate={
          state === "idle"
            ? { y: [0, -3, 0] }
            : state === "typing"
            ? { rotate: [0, -5, 5, 0] }
            : { scale: [1, 1.05, 1], y: [0, -4, 0] }
        }
        transition={
          state === "idle"
            ? { repeat: Infinity, duration: 4, ease: "easeInOut" }
            : state === "typing"
            ? { repeat: Infinity, duration: 2, ease: "easeInOut" }
            : { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
        }
      >
        <Image 
          src="/ulu.png" 
          alt="Ulu" 
          fill 
          className="object-contain" // object-contain ensures it fits without being cut
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </motion.div>
      
      {/* Modern Status Element */}
      {state === "generating" && (
        <motion.div
          className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-ulu-orange rounded-full ring-4 ring-white dark:ring-dark-bg z-20 shadow-lg"
          animate={{ opacity: [0, 1, 0], scale: [0.8, 1.1, 0.8] }}
          transition={{ repeat: Infinity, duration: 1 }}
        />
      )}
    </div>
  );
}
