"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthLayout({ title, subtitle, children }: Props) {
  return (
    <div className="h-screen bg-background text-foreground">
      <div className="grid h-full grid-cols-1 lg:grid-cols-2">
        <div className="flex flex-col overflow-y-auto bg-background">
          <div className="p-8">
            <Link href="/" className="inline-flex items-center gap-3">
              <Image src="/logo.svg" alt="Newslytic logo" width={48} height={48} priority />
              <span className="text-xl font-bold">Newslytic</span>
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center px-8 pb-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-full max-w-md"
            >
              <h2 className="mb-2 text-2xl font-bold">{title}</h2>
              <p className="mb-6 text-muted-foreground">{subtitle}</p>
              {children}
            </motion.div>
          </div>
        </div>

        <div className="hidden overflow-y-auto bg-slate-900 text-white lg:flex">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative h-full w-full"
          >
            <Image
              src="/images/LoginSignup-LightTheme.png"
              alt="Newslytic authentication visual for light theme"
              fill
              priority
              className="object-cover dark:hidden"
            />
            <Image
              src="/images/LoginSignup-DarkTheme.jfif"
              alt="Newslytic authentication visual for dark theme"
              fill
              priority
              className="hidden object-cover dark:block"
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
