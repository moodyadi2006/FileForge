"use client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useParams, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { Loader2, Sparkles, Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

const page = () => {
  const router = useRouter();
  const params = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isError, setIsError] = useState(false);
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
      verifyCode: "",
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
      const response = await axios.post(`/api/verifyCode`, {
        email: params.email,
        verifyCode: data.verifyCode,
      });
      showToastMessage(response.data.message);
      router.replace("/");
    } catch (error) {
      setIsError(true);
      showToastMessage(error.response?.data.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async (data) => {
    setIsResending(true);
    try {
      await axios.post(`/api/resendCode`, {
        email: params.email,
        verifyCode: data.verifyCode,
      });
      showToastMessage("A new verification code has been sent to your email.");
    } catch (error) {
      setIsError(true);
      showToastMessage("Failed to resend, Please try again later...");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gray-900">
      {showToast && (
        <div
          className={
            "fixed top-4 right-4 z-50 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 animate-pulse " +
            (isError ? "bg-red-500" : "bg-green-500")
          }
        >
          {toastMessage}
        </div>
      )}
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900/20 to-cyan-900/20">
        {/* Floating Orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>

        {/* Dynamic Mouse Follower */}
        <div
          className="absolute w-96 h-96 bg-gradient-radial from-purple-500/10 to-transparent rounded-full blur-2xl transition-all duration-300 ease-out pointer-events-none"
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
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="cursor-pointer mb-8 flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>

            {/* Glass Card */}
            <div className="relative">
              {/* Card Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-2xl blur-xl"></div>

              {/* Main Card */}
              <div className="relative bg-gray-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      Verify Your Account
                    </h2>
                    <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
                  </div>
                  <p className="text-gray-400">
                    Enter the 6-digit code sent to your email
                  </p>
                </div>

                {/* Form */}
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <FormField
                      name="verifyCode"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem className="group">
                          <FormLabel className="text-gray-200 group-focus-within:text-purple-400 transition-colors">
                            Verification Code
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Enter 6-digit code"
                                {...field}
                                value={field.value || ""}
                                maxLength={6}
                                className="bg-gray-700/50 border-gray-600 focus:border-purple-500 focus:ring-purple-500/20 text-white placeholder-gray-400 rounded-lg h-12 text-center text-lg font-mono tracking-widest transition-all duration-300 focus:bg-gray-700/70"
                              />
                              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/0 to-cyan-500/0 group-focus-within:from-purple-500/10 group-focus-within:to-cyan-500/10 transition-all duration-300 pointer-events-none"></div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Submit Button */}
                    <Button
                      className="cursor-pointer w-full h-12 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                      disabled={isSubmitting}
                      type="submit"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-600"></div>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify Account"
                      )}
                    </Button>
                  </form>
                </Form>

                {/* Resend Section */}
                <div className="text-center mt-6 pt-6 border-t border-gray-700">
                  <p className="text-gray-400 mb-2">Didn't receive the code?</p>
                  <button
                    onClick={handleResendCode}
                    disabled={isResending}
                    className="cursor-pointer text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text hover:from-purple-300 hover:to-cyan-300 font-semibold transition-all duration-300 disabled:opacity-50"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="inline h-4 w-4 animate-spin mr-1 text-purple-400" />
                        Resending...
                      </>
                    ) : (
                      "Resend verification code"
                    )}
                  </button>
                </div>

                {/* Help Text */}
                <div className="mt-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                  <p className="text-gray-400 text-xs text-center">
                    Check your spam folder if you don't see the email. The code
                    expires in 10 minutes.
                  </p>
                </div>

                {/* Sign In Link */}
                <div className="text-center mt-6">
                  <p className="text-gray-400">
                    Want to try a different account?{" "}
                    <Link
                      href="/signIn"
                      className="text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text hover:from-purple-300 hover:to-cyan-300 font-semibold transition-all duration-300"
                    >
                      Sign In
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
