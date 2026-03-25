"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-red-600 border-b border-red-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex rounded-full items-center space-x-2">
            <Image
              src="/assets/logos/s-logo-sq.webp"
              alt="OrderZap"
              width={140}
              height={140}
              className="h-8 rounded-full w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">

            <Link
              href="/signup/new"
              className="px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-all duration-200 font-medium"
            >
              Get Started
            </Link>
            <Link
              href="/admin/login"
              className="px-4 py-2 border-2 border-white text-white rounded-lg hover:bg-white hover:text-red-600 transition-all duration-200 font-medium"
            >
              Restaurant Login
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden ">
          <div className="items-center gap-2 flex">
            <Link
              href="/signup/new"
              className="flex items-center rounded-md text-sm font-medium text-white hover:bg-red-500"
            >
              Get Started
            </Link>
            <Link
              href="/admin/login/"
              className="flex items-center rounded-md text-sm font-medium text-white hover:bg-red-500"
            >
              Restaurant Login
            </Link>
          </div>
        </div>
        </div>
      </div>

      {/* Mobile menu */}

    </nav>
  );
}
