"use client";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";

export const page = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [dots, setDots] = useState([]); //Biggest error that I saw

  useEffect(() => {
    const newDots = Array.from({ length: 50 }, () => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 3}s`,
      animationDuration: `${2 + Math.random() * 3}s`,
    }));
    setDots(newDots);
  }, []);

  const form = useForm({
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  useEffect(() => {
    setIsLoaded(true);
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        identifier: data.identifier,
        password: data.password,
      });

      if (result.error) {
        showToastMessage("Incorrect username or password");
      } else if (result?.url) {
        router.replace("/");
      }
    } catch (error) {
      showToastMessage(
        result.error || "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gray-900">
      {/* Animated Background */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 animate-pulse">
          {toastMessage}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20">
        {/* Floating Orbs */}
        <div className="absolute top-32 left-32 w-80 h-80 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 right-32 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-2/3 left-1/4 w-72 h-72 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>

        {/* Dynamic Mouse Follower */}
        <div
          className="absolute w-96 h-96 bg-gradient-radial from-blue-500/10 to-transparent rounded-full blur-2xl transition-all duration-300 ease-out pointer-events-none"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
          }}
        ></div>
      </div>

      {/* Animated Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {dots.map((dot, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-ping"
            style={{
              left: dot.left,
              top: dot.top,
              animationDelay: dot.animationDelay,
              animationDuration: dot.animationDuration,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative">
          <div
            className={`transform transition-all duration-1000 ${
              isLoaded
                ? "translate-y-0 opacity-100"
                : "translate-y-10 opacity-0"
            }`}
          >
            {/* Logo Animation */}

            <div className="w-50 h-50 animate-[spin_3s_linear_infinite] drop-shadow-[0_0_12px_white]">
              <img
                src="/logo.png"
                alt="FileForge Logo"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Brand Name */}
            <h1 className="text-6xl font-light tracking-wide mb-4 bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-white drop-shadow-[0_0_12px_white]">
              FileForge
            </h1>

            {/* Welcome Back Message */}
            <p className="text-2xl text-gray-300 mb-4 font-light">
              Welcome back!
            </p>
            <p className="text-lg text-gray-400 mb-8 max-w-md leading-relaxed">
              Compress, decompress, and compare – your all-in-one portal for
              smarter file handling with real-time stats and multiple
              algorithms.
            </p>

            {/* Stats or Features */}
            <div className="grid grid-cols-1 gap-4 max-w-sm">
              {[
                {
                  icon: "📦",
                  label: "Smart Compression",
                  desc: "Compress files using Huffman, RLE, LZ77 & more",
                },
                {
                  icon: "🧩",
                  label: "Instant Decompression",
                  desc: "Restore your files anytime with a click",
                },
                {
                  icon: "📥",
                  label: "1-Click Downloads",
                  desc: "Easily download compressed or decompressed files",
                },
                {
                  icon: "📊",
                  label: "Compression Insights",
                  desc: "Compare ratios, sizes & speeds across algorithms",
                },
                {
                  icon: "📁",
                  label: "All File Types Welcome",
                  desc: "Upload text, images, or binaries with ease",
                },
                {
                  icon: "📘",
                  label: "Learn While You Use",
                  desc: "Explore how each algorithm works behind the scenes",
                },
              ].map((item, index) => (
                <div
                  key={item.label}
                  className={`flex items-center space-x-3 p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 transform transition-all duration-500 hover:scale-105 hover:bg-white/10 ${
                    isLoaded
                      ? "translate-x-0 opacity-100"
                      : "translate-x-5 opacity-0"
                  }`}
                  style={{ transitionDelay: `${index * 200 + 400}ms` }}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="text-white font-medium">{item.label}</p>
                    <p className="text-gray-400 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div
            className={`w-full max-w-md transform transition-all duration-1000 ${
              isLoaded
                ? "translate-x-0 opacity-100"
                : "translate-x-10 opacity-0"
            }`}
          >
            {/* Glass Card */}
            <div className="relative">
              {/* Card Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl"></div>

              {/* Main Card */}
              <div className="relative bg-gray-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <Lock className="w-6 h-6 text-blue-400 animate-pulse" />
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      Sign In
                    </h2>
                    <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
                  </div>
                  <p className="text-gray-400">Access your FileForge account</p>
                </div>

                {/* Form */}
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <FormField
                      name="identifier"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem className="group">
                          <FormLabel className="text-gray-200 group-focus-within:text-blue-400 transition-colors flex items-center space-x-2">
                            <Mail className="w-4 h-4" />
                            <span>Email Address</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Enter your email"
                                type="email"
                                {...field}
                                className="bg-gray-700/50 border-gray-600 focus:border-blue-500 focus:ring-blue-500/20 text-white placeholder-gray-400 rounded-lg h-12 pl-4 transition-all duration-300 focus:bg-gray-700/70"
                              />
                              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-focus-within:from-blue-500/10 group-focus-within:to-purple-500/10 transition-all duration-300 pointer-events-none"></div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      name="password"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem className="group">
                          <FormLabel className="text-gray-200 group-focus-within:text-blue-400 transition-colors flex items-center space-x-2">
                            <Lock className="w-4 h-4" />
                            <span>Password</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Enter your password"
                                type={showPassword ? "text" : "password"}
                                {...field}
                                className="bg-gray-700/50 border-gray-600 focus:border-blue-500 focus:ring-blue-500/20 text-white placeholder-gray-400 rounded-lg h-12 pl-4 pr-12 transition-all duration-300 focus:bg-gray-700/70"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="cursor-pointer absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                              >
                                {showPassword ? (
                                  <EyeOff className="w-5 h-5" />
                                ) : (
                                  <Eye className="w-5 h-5" />
                                )}
                              </button>
                              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-focus-within:from-blue-500/10 group-focus-within:to-purple-500/10 transition-all duration-300 pointer-events-none"></div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Submit Button */}
                    <Button
                      className="cursor-pointer w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                      disabled={isSubmitting}
                      type="submit"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-600"></div>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Signing you in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                </Form>

                {/* Divider */}
                <div className="flex items-center my-6">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
                  <span className="px-4 text-gray-400 text-sm">or</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
                </div>

                {/* Social Login (Optional) */}
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer w-full h-12 bg-white/5 border-gray-600 hover:bg-white/10 text-white rounded-lg transition-all duration-300"
                    onClick={() => signIn("google")}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                </div>

                {/* Sign Up Link */}
                <div className="text-center mt-6 pt-6 border-t border-gray-700">
                  <p className="text-gray-400">
                    Don't have an account?{" "}
                    <Link
                      href="/signUp"
                      className="text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text hover:from-blue-300 hover:to-purple-300 font-semibold transition-all duration-300"
                    >
                      Sign Up
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default page;
