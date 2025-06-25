"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Home,
  Plus,
  CheckCircle,
  User,
  LogOut,
  X,
  Settings,
  FileArchive,
  ArrowDownToLine,
  Workflow,
  ArrowUpToLine,
  FileUp,
  FunctionSquare,
  Zap,
  FileText,
  Database,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import axios from "axios";
import * as Chart from "chart.js/auto";

export default function FileForgeHome() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [selectedMode, setSelectedMode] = useState(null);
  const [searchValue, setSearchValue] = useState(null);
  const [file, setFile] = useState(null);
  const [compressionLoading, setCompressionLoading] = useState(false);
  const [decompressionLoading, setDecompressionLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isChat, setIsChat] = useState(false);
  const [initialResult, setInitialResult] = useState(null);
  const [dots, setDots] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mode, setMode] = useState(null);
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef(null);
  const comparisonChartRef = useRef(null);
  const donutChartRef = useRef(null);
  const efficiencyChartRef = useRef(null);
  const [animationStep, setAnimationStep] = useState(0);

  // Format bytes to human readable
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Only comparison chart ref for decompressed files
  const decompressedComparisonChartRef = useRef(null);

  // Single animation step for decompressed chart
  const [decompressedAnimationStep, setDecompressedAnimationStep] = useState(0);

  // Get decompressed file stats
  if (initialResult && initialResult.file_info) {
    // Calculate decompressed stats directly
    const decompressedStats = {
      originalSize: initialResult?.file_info.compressed_file_size || 0,
      decompressedSize: initialResult?.file_info.decompressed_size || 0,
      expansionRatio:
        initialResult?.file_info.compressed_file_size &&
        initialResult?.file_info.decompressed_size
          ? (
              initialResult.file_info.decompressed_size /
              initialResult.file_info.compressed_file_size
            ).toFixed(2)
          : 0,
      sizeDifferencePercent:
        initialResult?.file_info.compressed_file_size &&
        initialResult?.file_info.decompressed_size
          ? (
              ((initialResult.file_info.decompressed_size -
                initialResult.file_info.compressed_file_size) /
                initialResult.file_info.compressed_file_size) *
              100
            ).toFixed(1)
          : 0,
    };

    // Get decompressed algorithm colors directly
    const getDecompressedAlgorithmColors = (mode) => {
      const colorSchemes = {
        huffmanCoding: {
          primary: "#10B981",
          secondary: "#059669",
          accent: "#047857",
          gradient: ["#10B981", "#059669", "#047857"],
        },
        runLengthEncoding: {
          primary: "#F59E0B",
          secondary: "#D97706",
          accent: "#B45309",
          gradient: ["#F59E0B", "#D97706", "#B45309"],
        },
        lZ77: {
          primary: "#8B5CF6",
          secondary: "#7C3AED",
          accent: "#6D28D9",
          gradient: ["#8B5CF6", "#7C3AED", "#6D28D9"],
        },
      };
      return colorSchemes[mode] || colorSchemes.huffmanCoding;
    };

    const decompressedColors = getDecompressedAlgorithmColors(
      initialResult?.mode
    );

    // Simple animation effect for decompressed comparison chart only
    useEffect(() => {
      const timer = setTimeout(() => {
        if (decompressedAnimationStep < 1) {
          setDecompressedAnimationStep(1);
        }
      }, 700); // Slightly different timing to avoid interference

      return () => clearTimeout(timer);
    }, [decompressedAnimationStep]);

    // Decompressed file comparison chart useEffect
    useEffect(() => {
      let decompressedComparisonChart;

      if (
        decompressedComparisonChartRef.current &&
        decompressedAnimationStep >= 1
      ) {
        const ctx = decompressedComparisonChartRef.current.getContext("2d");

        decompressedComparisonChart = new Chart.Chart(ctx, {
          type: "bar",
          data: {
            labels: ["Original File", "Decompressed File"],
            datasets: [
              {
                label: "File Size",
                data: [
                  decompressedStats.originalSize,
                  decompressedStats.decompressedSize,
                ],
                backgroundColor: [
                  `${decompressedColors.primary}40`,
                  decompressedColors.primary,
                ],
                borderColor: [
                  decompressedColors.primary,
                  decompressedColors.secondary,
                ],
                borderWidth: 2,
                borderRadius: 12,
                borderSkipped: false,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleColor: "#fff",
                bodyColor: "#fff",
                borderColor: decompressedColors.primary,
                borderWidth: 1,
                cornerRadius: 8,
                callbacks: {
                  label: function (context) {
                    return `Size: ${formatBytes(context.raw)}`;
                  },
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: "rgba(255, 255, 255, 0.1)",
                },
                ticks: {
                  color: "#fff",
                  callback: function (value) {
                    return formatBytes(value);
                  },
                },
              },
              x: {
                grid: {
                  display: false,
                },
                ticks: {
                  color: "#fff",
                  font: {
                    weight: "bold",
                  },
                },
              },
            },
            animation: {
              duration: 2200,
              easing: "easeOutQuart",
            },
          },
        });
      }
      console.log(decompressedStats);

      return () => {
        if (decompressedComparisonChart) {
          decompressedComparisonChart.destroy();
        }
      };
    }, [
      decompressedAnimationStep,
      initialResult?.mode,
      initialResult?.file_info?.compressed_file_size,
      initialResult?.file_info?.decompressed_size,
    ]);
  } else {
    // Get algorithm colors directly
    const getAlgorithmColors = (mode) => {
      const colorSchemes = {
        huffmanCoding: {
          primary: "#00d4ff",
          secondary: "#6366f1",
          accent: "#8b5cf6",
          gradient: ["#00d4ff", "#6366f1", "#8b5cf6"],
        },
        runLengthEncoding: {
          primary: "#ff6b6b",
          secondary: "#ff8787",
          accent: "#ffa8a8",
          gradient: ["#ff6b6b", "#ff8787", "#ffa8a8"],
        },
        visuaLens: {
          primary: "#51cf66",
          secondary: "#69db7c",
          accent: "#8ce99a",
          gradient: ["#51cf66", "#69db7c", "#8ce99a"],
        },
      };
      return colorSchemes[mode] || colorSchemes.huffmanCoding;
    };

    const colors = getAlgorithmColors(initialResult?.mode);

    // Create stats object for compression chart data
    const stats = {
      originalSize: initialResult?.original_size || 0,
      compressedSize: initialResult?.compressed_size || 0,
      compressionRatio: parseFloat(initialResult?.compression_ratio) || 0,
      spaceSaved:
        parseFloat(initialResult?.space_saved_percent?.replace("%", "")) || 0,
    };

    // Compression charts animation
    useEffect(() => {
      // Animate components in sequence
      const timer = setTimeout(() => {
        if (animationStep < 3) {
          setAnimationStep(animationStep + 1);
        }
      }, 600);

      return () => clearTimeout(timer);
    }, [animationStep]);

    // Compression charts useEffect
    useEffect(() => {
      let comparisonChart, donutChart, efficiencyChart;

      // Comparison Bar Chart
      if (comparisonChartRef.current && animationStep >= 1) {
        const ctx = comparisonChartRef.current.getContext("2d");

        comparisonChart = new Chart.Chart(ctx, {
          type: "bar",
          data: {
            labels: ["Original File", "Compressed File"],
            datasets: [
              {
                label: "File Size",
                data: [stats.originalSize, stats.compressedSize],
                backgroundColor: [`${colors.primary}40`, colors.primary],
                borderColor: [colors.primary, colors.secondary],
                borderWidth: 2,
                borderRadius: 12,
                borderSkipped: false,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleColor: "#fff",
                bodyColor: "#fff",
                borderColor: colors.primary,
                borderWidth: 1,
                cornerRadius: 8,
                callbacks: {
                  label: function (context) {
                    return `Size: ${formatBytes(context.raw)}`;
                  },
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: "rgba(255, 255, 255, 0.1)",
                },
                ticks: {
                  color: "#fff",
                  callback: function (value) {
                    return formatBytes(value);
                  },
                },
              },
              x: {
                grid: {
                  display: false,
                },
                ticks: {
                  color: "#fff",
                  font: {
                    weight: "bold",
                  },
                },
              },
            },
            animation: {
              duration: 2000,
              easing: "easeOutQuart",
            },
          },
        });
      }

      // Donut Chart for Space Saved
      if (donutChartRef.current && animationStep >= 2) {
        const ctx = donutChartRef.current.getContext("2d");

        donutChart = new Chart.Chart(ctx, {
          type: "doughnut",
          data: {
            labels: ["Space Saved", "Remaining"],
            datasets: [
              {
                data: [stats.spaceSaved, 100 - stats.spaceSaved],
                backgroundColor: [colors.primary, "rgba(255, 255, 255, 0.1)"],
                borderColor: [colors.primary, "rgba(255, 255, 255, 0.2)"],
                borderWidth: 2,
                cutout: "70%",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleColor: "#fff",
                bodyColor: "#fff",
                borderColor: colors.primary,
                borderWidth: 1,
                cornerRadius: 8,
                callbacks: {
                  label: function (context) {
                    return `${context.label}: ${context.parsed}%`;
                  },
                },
              },
            },
            animation: {
              duration: 2500,
              easing: "easeOutBounce",
            },
          },
        });
      }

      // Efficiency Gauge (Polar Area)
      if (efficiencyChartRef.current && animationStep >= 3) {
        const ctx = efficiencyChartRef.current.getContext("2d");

        efficiencyChart = new Chart.Chart(ctx, {
          type: "polarArea",
          data: {
            labels: [
              "Compression Ratio",
              "Efficiency Score",
              "Space Optimization",
            ],
            datasets: [
              {
                data: [
                  stats.compressionRatio * 20,
                  stats.spaceSaved,
                  (stats.compressionRatio * stats.spaceSaved) / 5,
                ],
                backgroundColor: [
                  `${colors.primary}80`,
                  `${colors.secondary}80`,
                  `${colors.accent}80`,
                ],
                borderColor: [colors.primary, colors.secondary, colors.accent],
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  color: "#fff",
                  padding: 20,
                  font: {
                    size: 12,
                  },
                },
              },
              tooltip: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleColor: "#fff",
                bodyColor: "#fff",
                borderColor: colors.primary,
                borderWidth: 1,
                cornerRadius: 8,
              },
            },
            scales: {
              r: {
                grid: {
                  color: "rgba(255, 255, 255, 0.1)",
                },
                ticks: {
                  color: "#fff",
                  backdropColor: "transparent",
                },
              },
            },
            animation: {
              duration: 3000,
              easing: "easeOutElastic",
            },
          },
        });
      }

      // Cleanup function to destroy charts when component unmounts or re-renders
      return () => {
        if (comparisonChart) {
          comparisonChart.destroy();
        }
        if (donutChart) {
          donutChart.destroy();
        }
        if (efficiencyChart) {
          efficiencyChart.destroy();
        }
      };
    }, [
      animationStep,
      initialResult?.mode,
      initialResult?.original_size,
      initialResult?.compressed_size,
      initialResult?.compression_ratio,
      initialResult?.space_saved_percent,
    ]);
  }

  useEffect(() => {
    const newDots = Array.from({ length: 50 }, () => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 3}s`,
      animationDuration: `${2 + Math.random() * 3}s`,
    }));
    setDots(newDots);
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setUser(session.user);
      setIsLoggedIn(true);
    }
    if (session?.provider === "google" && session?.expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = session?.expiresAt - now;

      if (timeUntilExpiry <= 0) {
        signOut({ callbackUrl: "/signIn", redirect: true });
      } else if (timeUntilExpiry < 300) {
        showToastMessage("Session gonna expire soon...");
        const timer = setTimeout(() => {
          signOut({ callbackUrl: "/signIn", redirect: true });
        }, timeUntilExpiry * 1000);

        return () => clearTimeout(timer);
      }
    }
  }, [session, status]);

  const modes = {
    huffmanCoding: {
      icon: Workflow,
      label: "Huffman Coding",
      gradient: "from-green-500 to-emerald-500",
      acceptedFiles: ".txt,.jpg,.jpeg,.png,.bin,.rle,.huff,.lz77",
      placeholder:
        "Upload a text, binary, or image file for compression or decompression...",
      type: "file",
    },
    runLengthEncoding: {
      icon: Settings,
      label: "Run-Length Encoding",
      gradient: "from-red-500 to-pink-500",
      acceptedFiles: ".txt,.jpg,.jpeg,.png,.bin,.rle,.huff,.lz77",
      placeholder:
        "Upload a text, binary, or image file for compression or decompression...",
      type: "file",
    },
    lZ77: {
      icon: FunctionSquare,
      label: "LZ77",
      gradient: "from-blue-500 to-indigo-500",
      acceptedFiles: ".txt,.jpg,.jpeg,.png,.bin,.rle,.huff,.lz77",
      placeholder:
        "Upload a text, binary, or image file for compression or decompression...",
      type: "file",
    },
  };

  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleUserIconClick = () => {
    if (!isLoggedIn) {
      router.push("/signIn");
    } else {
      setShowUserModal(true);
    }
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
    setUser(null);
    setIsLoggedIn(false);
    setShowUserModal(false);
    showToastMessage("Logged out successfully!");
  };

  const checkAuthForFileOperation = () => {
    if (!isLoggedIn) {
      showToastMessage("Please login first to upload files");
      return false;
    }
    return true;
  };

  useEffect(() => {
    setIsLoaded(true);
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleModeSelect = (mode) => {
    setSelectedMode(mode);
    setFile(null);
    setSearchValue("");
    setInitialResult(null);
    setIsChat(false);
  };

  const handleFileChange = (e) => {
    if (!checkAuthForFileOperation()) {
      e.target.value = "";
      return;
    }

    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setSearchValue(`${selectedFile.name} selected`);
    }
  };

  const handleCompression = async () => {
    if (!selectedMode) {
      showToastMessage("No Mode selected");
      return;
    }

    if (!file) {
      showToastMessage("No file selected");
      return;
    }

    if (modes[selectedMode].type === "file" && !checkAuthForFileOperation()) {
      return;
    }

    setCompressionLoading(true);
    setMode("Compression");

    try {
      const formData = new FormData();
      formData.append("mode", selectedMode);
      formData.append("file", file);

      const res = await axios.post("/api/compression", formData);
      const data = res.data;
      setIsChat(true);
      setInitialResult(data);
      setSearchValue("");
    } catch (err) {
      console.error(err);
      showToastMessage(
        "Unknown error occurred while compressing file. Please try again."
      );
    }

    setCompressionLoading(false);
  };

  const handleDecompression = async () => {
    if (!selectedMode) {
      showToastMessage("No Mode selected");
      return;
    }

    if (!file) {
      showToastMessage("No file selected");
      return;
    }
    if (modes[selectedMode].type === "file" && !checkAuthForFileOperation()) {
      return;
    }

    setDecompressionLoading(true);
    setMode("Decompression");
    try {
      const formData = new FormData();
      formData.append("mode", selectedMode);

      formData.append("file", file);

      const res = await axios.post("/api/decompression", formData);

      const data = res.data;
      setIsChat(true);
      setInitialResult(data);
      setSearchValue("");
    } catch (err) {
      showToastMessage(
        "Unknown Error occured while decompressing file, Please try again"
      );
    }

    setDecompressionLoading(false);
  };

  const handleNewChat = () => {
    setIsChat(false);
    setSelectedMode(null);
    setFile(null);
    setSearchValue("");
    showToastMessage("New Chat");
    setMode(null);
    setInitialResult(null);
  };

  const IconComponent = selectedMode ? modes[selectedMode].icon : null;

  const renderInputField = () => {
    if (!selectedMode) {
      return (
        <input
          type="text"
          placeholder="Select a mode first..."
          value=""
          disabled
          className="flex-1 bg-transparent px-6 py-4 text-gray-500 placeholder-gray-500 focus:outline-none text-lg cursor-not-allowed"
        />
      );
    }

    const mode = modes[selectedMode];

    return (
      <div className="flex-1 flex items-center">
        <input
          type="text"
          placeholder={mode.placeholder}
          value={searchValue || ""}
          readOnly
          disabled={compressionLoading || decompressionLoading}
          className={`flex-1 bg-transparent px-6 py-4 text-white placeholder-gray-400 focus:outline-none text-lg ${
            decompressionLoading || compressionLoading
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer"
          }`}
          onClick={() => {
            if (
              !compressionLoading &&
              !decompressionLoading &&
              checkAuthForFileOperation()
            ) {
              fileInputRef.current?.click();
            }
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={mode.acceptedFiles}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    );
  };

  const renderActionButtons = () => {
    if (!selectedMode) return null;

    const mode = modes[selectedMode];

    return (
      <div className="flex items-center space-x-2 px-2">
        {mode.type === "file" && !isChat && (
          <button
            onClick={handleCompression}
            disabled={compressionLoading || decompressionLoading}
            className={`group relative cursor-pointer p-4 text-gray-400 hover:text-white bg-gray-800/40 hover:bg-gradient-to-br hover:from-purple-600/20 hover:via-pink-600/20 hover:to-cyan-600/20 rounded-xl border border-gray-600/30 hover:border-purple-500/50 transition-all duration-500 transform hover:scale-110 hover:shadow-lg hover:shadow-purple-500/25 active:scale-105 ${
              compressionLoading || decompressionLoading
                ? "opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-none"
                : ""
            }`}
            title="Compress Files - Click to select and compress files"
          >
            {/* Icon Container with Animation */}
            <div className="relative flex items-center justify-center space-x-1">
              {compressionLoading ? (
                <>
                  {/* Loading Spinner */}
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-500 border-t-transparent"></div>
                  <span className="text-xs text-purple-400 ml-2">
                    Compressing...
                  </span>
                </>
              ) : (
                <>
                  {/* File Archive Icon */}
                  <FileArchive
                    className="text-purple-500 group-hover:text-purple-400 transition-colors duration-300 transform group-hover:scale-110"
                    size={20}
                  />

                  {/* Animated Arrow */}
                  <ArrowDownToLine
                    className="text-pink-500 group-hover:text-pink-400 transition-all duration-300 transform group-hover:translate-y-1 group-hover:scale-110"
                    size={18}
                  />
                </>
              )}
            </div>

            {/* Tooltip/Label */}
            {!compressionLoading && (
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap border border-gray-600">
                  Compress Files
                </div>
              </div>
            )}

            {/* Subtle background animation */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/0 via-pink-500/0 to-cyan-500/0 group-hover:from-purple-500/10 group-hover:via-pink-500/10 group-hover:to-cyan-500/10 transition-all duration-500 -z-10"></div>
          </button>
        )}

        {mode.type === "file" && !isChat && (
          <button
            onClick={handleDecompression}
            disabled={compressionLoading || decompressionLoading}
            className={`group relative cursor-pointer p-4 text-gray-400 hover:text-white bg-gray-800/40 hover:bg-gradient-to-br hover:from-purple-600/20 hover:via-pink-600/20 hover:to-cyan-600/20 rounded-xl border border-gray-600/30 hover:border-purple-500/50 transition-all duration-500 transform hover:scale-110 hover:shadow-lg hover:shadow-purple-500/25 active:scale-105 ${
              compressionLoading || decompressionLoading
                ? "opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-none"
                : ""
            }`}
            title="Decompress Files - Click to select and extract files"
          >
            {/* Icon Container with Animation */}
            <div className="relative flex items-center justify-center space-x-1">
              {decompressionLoading ? (
                <>
                  {/* Loading Spinner */}
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500 border-t-transparent"></div>
                  <span className="text-xs text-cyan-400 ml-2">
                    Decompressing...
                  </span>
                </>
              ) : (
                <>
                  {/* File Archive Icon */}
                  <FileUp
                    className="text-purple-500 group-hover:text-purple-400 transition-colors duration-300 transform group-hover:scale-110"
                    size={20}
                  />

                  {/* Animated Extract Arrow */}
                  <ArrowUpToLine
                    className="text-cyan-500 group-hover:text-cyan-400 transition-all duration-300 transform group-hover:translate-y-1 group-hover:scale-110"
                    size={18}
                  />
                </>
              )}
            </div>

            {/* Tooltip/Label */}
            {!decompressionLoading && (
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap border border-gray-600">
                  Decompress Files
                </div>
              </div>
            )}

            {/* Subtle background animation */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/0 via-pink-500/0 to-cyan-500/0 group-hover:from-purple-500/10 group-hover:via-pink-500/10 group-hover:to-cyan-500/10 transition-all duration-500 -z-10"></div>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gray-900">
      {showToast && (
        <div className="fixed top-4 right-4 z-50 max-w-70 bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 animate-pulse">
          {toastMessage}
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 border border-white/10 relative">
            <button
              onClick={() => setShowUserModal(false)}
              className="cursor-pointer absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center">
              <div className="mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  FileForge
                </h2>
              </div>

              <div className="mb-6">
                <h3 className="text-xl text-white mb-2">
                  How is it going, {user?.fullName || user?.name || "User"}!
                </h3>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-gray-700/50 rounded-lg p-4 text-left">
                  <p className="text-gray-400 text-sm">Full Name</p>
                  <p className="text-white font-medium">
                    {user?.fullName || user?.name || "N/A"}
                  </p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4 text-left">
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white font-medium">
                    {user?.email || "N/A"}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="cursor-pointer w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900/20 to-cyan-900/20">
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>

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

      <div className="relative z-10 min-h-screen text-white flex">
        <div className="fixed left-0 top-0 h-screen w-20 bg-gray-800/50 backdrop-blur-xl border-r border-white/10 flex flex-col items-center py-6 space-y-6 z-50">
          <div className="relative group">
            <div className="w-25 h-25 relative animate-[spin_3s_linear_infinite] drop-shadow-[0_0_12px_white]">
              <img
                src="/logo.png"
                alt="FileForge Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <button
            onClick={handleNewChat}
            disabled={compressionLoading || decompressionLoading}
            className="cursor-pointer w-12 h-12 text-gray-400 hover:text-white transition-all duration-300 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl backdrop-blur-sm border border-gray-600/30 hover:border-purple-500/50 transform hover:scale-110 group"
          >
            <Plus className="w-6 h-6 mx-auto group-hover:rotate-90 transition-transform duration-300" />
          </button>

          <div className="flex flex-col space-y-6 mt-8">
            <div className="flex flex-col items-center space-y-2 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl blur-md opacity-75"></div>
                <button
                  onClick={() => router.push("/")}
                  className="cursor-pointer relative w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center transform transition-all duration-300 hover:scale-110"
                >
                  <Home className="w-6 h-6 text-white" />
                </button>
              </div>
              <span className="text-xs font-medium bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Home
              </span>
            </div>
          </div>

          <div className="flex-1"></div>
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full blur-md opacity-50"></div>
              <div
                onClick={handleUserIconClick}
                className="cursor-pointer relative w-12 h-12 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg transform transition-transform hover:scale-110"
              >
                <User className="w-5 h-5" />
              </div>
            </div>
            <div
              className={`w-3 h-3 rounded-full animate-pulse shadow-lg ${
                isLoggedIn
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 shadow-green-500/50"
                  : "bg-gradient-to-r from-red-500 to-pink-500 shadow-red-500/50"
              }`}
            ></div>
          </div>
        </div>

        <div className="flex-1 flex flex-col ml-20">
          {!isChat ? (
            <div className="flex-1 flex flex-col items-center justify-center px-2">
              <div
                className={`mb-6 transform transition-all duration-1000 ${
                  isLoaded
                    ? "translate-y-0 opacity-100"
                    : "translate-y-10 opacity-0"
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
                  </div>

                  <div className="relative z-10 flex items-center space-x-2">
                    <div className="w-50 h-50 relative animate-[spin_3s_linear_infinite] drop-shadow-[0_0_12px_white]">
                      <img
                        src="/logo.png"
                        alt="FileForge Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <h1 className="text-6xl font-light tracking-wide text-center text-white drop-shadow-[0_0_12px_white]">
                      <span className="bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
                        FileForge
                      </span>
                    </h1>
                  </div>
                </div>
              </div>

              {selectedMode && (
                <div className="mb-4 flex items-center space-x-2">
                  <div
                    className={`p-2 bg-gradient-to-r ${modes[selectedMode].gradient} rounded-lg`}
                  >
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-medium">
                    {modes[selectedMode].label} Mode
                  </span>
                  <button
                    onClick={() => setSelectedMode(null)}
                    disabled={compressionLoading || decompressionLoading}
                    className={`ml-2 cursor-pointer text-gray-400 hover:text-white transition-opacity ${
                      decompressionLoading || compressionLoading
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    ✕
                  </button>
                </div>
              )}

              <div
                className={`w-full max-w-3xl mb-12 transform transition-all duration-1000 delay-300 ${
                  isLoaded
                    ? "translate-y-0 opacity-100"
                    : "translate-y-10 opacity-0"
                }`}
              >
                <div className="relative group">
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${
                      selectedMode
                        ? `${modes[selectedMode].gradient
                            .replace("from-", "from-")
                            .replace("to-", "to-")}/20`
                        : "from-purple-500/20 to-cyan-500/20"
                    } rounded-2xl blur-xl group-focus-within:opacity-100 opacity-50 transition-opacity`}
                  ></div>

                  <div
                    className={`relative bg-gray-800/50 backdrop-blur-xl border ${
                      selectedMode ? "border-white/20" : "border-white/10"
                    } rounded-2xl p-2 group-focus-within:border-purple-500/50 transition-all duration-300`}
                  >
                    <div className="flex items-center">
                      {renderInputField()}
                      {renderActionButtons()}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`flex flex-wrap gap-4 justify-center max-w-4xl transform transition-all duration-1000 delay-500 ${
                  isLoaded
                    ? "translate-y-0 opacity-100"
                    : "translate-y-10 opacity-0"
                }`}
              >
                {Object.entries(modes).map(([key, mode], index) => (
                  <button
                    key={`${key}-${index}`}
                    onClick={() => handleModeSelect(key)}
                    disabled={compressionLoading || decompressionLoading}
                    className={`cursor-pointer group relative backdrop-blur-xl border text-white px-6 py-4 rounded-2xl flex items-center space-x-3 hover:scale-105 hover:shadow-2xl transition-all duration-500 ${
                      selectedMode === key
                        ? `bg-gradient-to-r ${mode.gradient} border-white/30`
                        : "bg-gray-800/50 border-white/10 hover:border-purple-500/50"
                    } ${
                      isLoaded
                        ? "translate-y-0 opacity-100"
                        : "translate-y-5 opacity-0"
                    }`}
                    style={{ transitionDelay: `${index * 100}ms` }}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${mode.gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 z-0 pointer-events-none`}
                    ></div>

                    <div
                      className={`relative z-10 p-2 bg-gradient-to-r ${mode.gradient} rounded-lg`}
                    >
                      <mode.icon className="w-5 h-5 text-white" />
                    </div>

                    <span className="relative z-10 font-medium group-hover:text-white transition-colors">
                      {mode.label}
                    </span>

                    <div className="relative z-10 w-5 h-5">
                      {selectedMode === key && (
                        <CheckCircle className="w-5 h-5 text-white" />
                      )}
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-600 rounded-2xl z-0 pointer-events-none"></div>
                  </button>
                ))}
              </div>

              <div className="absolute top-20 right-20 w-4 h-4 bg-purple-500 rounded-full animate-bounce opacity-60"></div>
              <div className="absolute bottom-32 left-32 w-3 h-3 bg-cyan-500 rounded-full animate-ping opacity-60"></div>
              <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-pink-500 rounded-full animate-pulse opacity-60"></div>
            </div>
          ) : (
            <>
              {initialResult && initialResult.compressed_filename ? (
                <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
                  <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div
                      className={`text-center mb-8 transition-all duration-1000 ${animationStep >= 0 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10"}`}
                    >
                      <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                        Compression Analytics Portal
                      </h1>
                      <p className="text-gray-300 text-lg">
                        {initialResult.algorithm_info?.name ||
                          "Advanced Compression Analysis"}
                      </p>
                    </div>

                    {/* Stats Cards */}
                    <div
                      className={`grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 transition-all duration-1000 delay-300 ${animationStep >= 0 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                    >
                      {/* Original Size Card */}
                      <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50 hover:border-cyan-500/50 transition-all duration-300">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-gray-400 text-sm uppercase tracking-wide">
                            Original Size
                          </h3>
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-3xl font-bold text-white">
                          {formatBytes(initialResult.original_size || 0)}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                          {initialResult.original_filename || "Input File"}
                        </p>
                      </div>

                      {/* Compressed Size Card */}
                      <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50 hover:border-green-500/50 transition-all duration-300">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-gray-400 text-sm uppercase tracking-wide">
                            Compressed Size
                          </h3>
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-3xl font-bold text-white">
                          {formatBytes(initialResult.compressed_size || 0)}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                          {initialResult.compressed_filename || "Output File"}
                        </p>
                      </div>

                      {/* Compression Ratio Card */}
                      <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-gray-400 text-sm uppercase tracking-wide">
                            Compression Ratio
                          </h3>
                          <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-3xl font-bold text-white">
                          {initialResult.compression_ratio || "N/A"}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                          Efficiency Rating
                        </p>
                      </div>

                      {/* Space Saved Card */}
                      <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50 hover:border-cyan-500/50 transition-all duration-300">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-gray-400 text-sm uppercase tracking-wide">
                            Space Saved
                          </h3>
                          <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-3xl font-bold text-white">
                          {initialResult.space_saved_percent || "0%"}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                          Storage Optimized
                        </p>
                      </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {/* File Size Comparison */}
                      <div
                        className={`lg:col-span-2 xl:col-span-2 bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50 transition-all duration-1000 delay-600 ${animationStep >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                      >
                        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                          <div className="w-4 h-4 bg-gradient-to-r from-cyan-400 to-purple-400 rounded mr-3"></div>
                          File Size Comparison
                        </h3>
                        <div className="h-64">
                          <canvas ref={comparisonChartRef}></canvas>
                        </div>
                      </div>

                      {/* Space Saved Donut */}
                      <div
                        className={`bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50 transition-all duration-1000 delay-900 ${animationStep >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                      >
                        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                          <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-cyan-400 rounded mr-3"></div>
                          Space Optimization
                        </h3>
                        <div className="h-64 relative">
                          <canvas ref={donutChartRef}></canvas>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-white">
                                {initialResult.space_saved_percent || "0%"}
                              </div>
                              <div className="text-sm text-gray-400">Saved</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Efficiency Radar */}
                      <div
                        className={`lg:col-span-2 xl:col-span-3 bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50 transition-all duration-1000 delay-1200 ${animationStep >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                      >
                        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                          <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded mr-3"></div>
                          Performance Metrics
                        </h3>
                        <div className="h-80">
                          <canvas ref={efficiencyChartRef}></canvas>
                        </div>
                      </div>
                    </div>

                    {/* Algorithm Details */}
                    <div
                      className={`mt-8 bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50 transition-all duration-1000 delay-1500 ${animationStep >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                    >
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                        <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-400 rounded mr-3"></div>
                        Algorithm Details
                      </h3>
                      {/* Algorithm Info */}
                      {initialResult.algorithm_info && (
                        <div className="mb-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                          <h4 className="text-lg font-semibold text-cyan-400 mb-2">
                            {initialResult.algorithm_info.name}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Best For:</span>
                              <p className="text-gray-300">
                                {initialResult.algorithm_info.best_for}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-400">
                                Characteristics:
                              </span>
                              <p className="text-gray-300">
                                {initialResult.algorithm_info.characteristics}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="text-gray-400">Description:</span>
                            <p className="text-gray-300">
                              {initialResult.algorithm_info.description}
                            </p>
                          </div>
                        </div>
                      )}
                      {/* Compression Details */}
                      {initialResult?.compression_details && (
                        <div className="space-y-6">
                          <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                            <h4 className="text-lg font-semibold text-purple-400 mb-3">
                              Compression Statistics
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-400">
                                  Average Code Length:
                                </span>
                                <p className="text-white font-mono">
                                  {
                                    initialResult.compression_details
                                      .average_code_length
                                  }
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Code Length Range:
                                </span>
                                <p className="text-white font-mono">
                                  {
                                    initialResult.compression_details
                                      .code_length_range
                                  }
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Total Symbols:
                                </span>
                                <p className="text-white font-mono">
                                  {
                                    initialResult.compression_details
                                      .total_symbols
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                          {initialResult?.compressed_file && (
                            <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                              <h4 className="text-lg font-semibold text-green-400 mb-3">
                                Download Compressed File
                              </h4>
                              <button
                                onClick={() => {
                                  try {
                                    // Decode base64 to binary
                                    const binaryString = atob(
                                      initialResult.compressed_file
                                    );
                                    const bytes = new Uint8Array(
                                      binaryString.length
                                    );
                                    for (
                                      let i = 0;
                                      i < binaryString.length;
                                      i++
                                    ) {
                                      bytes[i] = binaryString.charCodeAt(i);
                                    }

                                    // Create blob and download
                                    const blob = new Blob([bytes], {
                                      type:
                                        initialResult.content_type ||
                                        "application/octet-stream",
                                    });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = "compressed_file.huff"; // You can modify this filename
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                  } catch (error) {
                                    console.error(
                                      "Error downloading file:",
                                      error
                                    );
                                    alert(
                                      "Error downloading file. Please try again."
                                    );
                                  }
                                }}
                                className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 font-medium"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                                Download Compressed File
                              </button>
                              <p className="text-gray-400 text-xs mt-2">
                                File will be downloaded as
                                'compressed_file.huff'
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      {initialResult?.compression_details_RLE && (
                        <div className="space-y-6">
                          <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                            <h4 className="text-lg font-semibold text-purple-400 mb-3">
                              Compression Statistics
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-400">
                                  Total Runs:
                                </span>
                                <p className="text-white font-mono">
                                  {
                                    initialResult.compression_details_RLE
                                      .total_runs
                                  }
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Literal Segments:
                                </span>
                                <p className="text-white font-mono">
                                  {
                                    initialResult.compression_details_RLE
                                      .literal_segments
                                  }
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Threshold Used:
                                </span>
                                <p className="text-white font-mono">
                                  {
                                    initialResult.compression_details_RLE
                                      .threshold_used
                                  }
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Compression Efficiency:
                                </span>
                                <p className="text-white font-mono">
                                  {
                                    initialResult.compression_details_RLE
                                      .compression_efficiency
                                  }
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Unique Byte Values:
                                </span>
                                <p className="text-white font-mono">
                                  {
                                    initialResult.compression_details_RLE
                                      .unique_byte_values
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                          {initialResult?.file_analysis && (
                            <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                              <h4 className="text-lg font-semibold text-purple-400 mb-3">
                                File Analysis
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400">
                                    Unique Bytes:
                                  </span>
                                  <p className="text-white font-mono">
                                    {initialResult.file_analysis.unique_bytes}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-400">
                                    Estimated Compressible Bytes:
                                  </span>
                                  <p className="text-white font-mono">
                                    {
                                      initialResult.file_analysis
                                        .estimated_compressible_bytes
                                    }
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-400">
                                    Estimated Compression Ratio:
                                  </span>
                                  <p className="text-white font-mono">
                                    {
                                      initialResult.file_analysis
                                        .estimated_compression_ratio
                                    }
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-400">
                                    Recommendation:
                                  </span>
                                  <p className="text-white font-mono text-xs">
                                    {initialResult.file_analysis.recommendation}
                                  </p>
                                </div>
                              </div>

                              {/* Most Frequent Byte Info */}
                              {initialResult.file_analysis
                                .most_frequent_byte && (
                                <div className="mt-4 p-3 bg-gray-800/50 rounded border border-gray-600/20">
                                  <h5 className="text-sm font-semibold text-blue-400 mb-2">
                                    Most Frequent Byte
                                  </h5>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                    <div>
                                      <span className="text-gray-400">
                                        Byte Value:
                                      </span>
                                      <p className="text-white font-mono">
                                        {initialResult.file_analysis
                                          .most_frequent_byte.byte || "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">
                                        Count:
                                      </span>
                                      <p className="text-white font-mono">
                                        {initialResult.file_analysis
                                          .most_frequent_byte.count || "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">
                                        Percentage:
                                      </span>
                                      <p className="text-white font-mono">
                                        {initialResult.file_analysis
                                          .most_frequent_byte.percentage
                                          ? `${initialResult.file_analysis.most_frequent_byte.percentage.toFixed(2)}%`
                                          : "N/A"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Run Distribution */}
                              {initialResult.file_analysis.run_distribution && (
                                <div className="mt-4 p-3 bg-gray-800/50 rounded border border-gray-600/20">
                                  <h5 className="text-sm font-semibold text-green-400 mb-2">
                                    Run Length Distribution
                                  </h5>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                    {Object.entries(
                                      initialResult.file_analysis
                                        .run_distribution
                                    ).map(([length, count]) => (
                                      <div
                                        key={length}
                                        className="flex justify-between"
                                      >
                                        <span className="text-gray-400">
                                          Length {length}:
                                        </span>
                                        <span className="text-white font-mono">
                                          {count}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {initialResult?.compressed_file && (
                            <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                              <h4 className="text-lg font-semibold text-green-400 mb-3">
                                Download Compressed File
                              </h4>
                              <button
                                onClick={() => {
                                  try {
                                    // Decode base64 to binary
                                    const binaryString = atob(
                                      initialResult.compressed_file
                                    );
                                    const bytes = new Uint8Array(
                                      binaryString.length
                                    );
                                    for (
                                      let i = 0;
                                      i < binaryString.length;
                                      i++
                                    ) {
                                      bytes[i] = binaryString.charCodeAt(i);
                                    }

                                    // Create blob and download
                                    const blob = new Blob([bytes], {
                                      type:
                                        initialResult.content_type ||
                                        "application/octet-stream",
                                    });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = "compressed_file.rle"; // You can modify this filename
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                  } catch (error) {
                                    console.error(
                                      "Error downloading file:",
                                      error
                                    );
                                    alert(
                                      "Error downloading file. Please try again."
                                    );
                                  }
                                }}
                                className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 font-medium"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                                Download Compressed File
                              </button>
                              <p className="text-gray-400 text-xs mt-2">
                                File will be downloaded as 'compressed_file.rle'
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      {initialResult?.compression_details_LZ77 && (
                        <div className="space-y-6">
                          {/* Compression Statistics */}
                          <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                            <h4 className="text-lg font-semibold text-purple-400 mb-3">
                              LZ77 Compression Statistics
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-400">
                                  Window Size:
                                </span>
                                <p className="text-white font-mono">
                                  {String(
                                    initialResult.compression_details_LZ77
                                      .window_size || "N/A"
                                  )}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Lookahead Size:
                                </span>
                                <p className="text-white font-mono">
                                  {String(
                                    initialResult.compression_details_LZ77
                                      .lookahead_size || "N/A"
                                  )}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Triplets Generated:
                                </span>
                                <p className="text-white font-mono">
                                  {String(
                                    initialResult.compression_details_LZ77
                                      .triplets_generated || "N/A"
                                  )}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Matches Found:
                                </span>
                                <p className="text-white font-mono">
                                  {String(
                                    initialResult.compression_details_LZ77
                                      .matches_found || "N/A"
                                  )}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">Literals:</span>
                                <p className="text-white font-mono">
                                  {String(
                                    initialResult.compression_details_LZ77
                                      .literals || "N/A"
                                  )}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Average Match Length:
                                </span>
                                <p className="text-white font-mono">
                                  {String(
                                    initialResult.compression_details_LZ77
                                      .average_match_length || "N/A"
                                  )}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Bytes Saved:
                                </span>
                                <p className="text-white font-mono">
                                  {String(
                                    initialResult.compression_details_LZ77
                                      .bytes_saved_from_matches || "N/A"
                                  )}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Compression Efficiency:
                                </span>
                                <p className="text-white font-mono">
                                  {String(
                                    initialResult.compression_details_LZ77
                                      .compression_efficiency || "N/A"
                                  )}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Unique Bytes:
                                </span>
                                <p className="text-white font-mono">
                                  {String(
                                    initialResult.compression_details_LZ77
                                      .unique_bytes || "N/A"
                                  )}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Most Frequent Byte:
                                </span>
                                <p className="text-white font-mono">
                                  {initialResult.compression_details_LZ77
                                    .most_frequent_byte
                                    ? `Value: ${initialResult.compression_details_LZ77.most_frequent_byte.value || "N/A"}, Count: ${initialResult.compression_details_LZ77.most_frequent_byte.count || "N/A"}, Percentage: ${initialResult.compression_details_LZ77.most_frequent_byte.percentage || "N/A"}`
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* File Analysis */}
                          {initialResult?.file_analysis_LZ77 && (
                            <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                              <h4 className="text-lg font-semibold text-blue-400 mb-3">
                                File Analysis
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400">
                                    Entropy:
                                  </span>
                                  <p className="text-white font-mono">
                                    {String(
                                      initialResult.file_analysis_LZ77
                                        .entropy || "N/A"
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-400">
                                    Potential Matches:
                                  </span>
                                  <p className="text-white font-mono">
                                    {String(
                                      initialResult.file_analysis_LZ77
                                        .potential_matches || "N/A"
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-400">
                                    Match Ratio:
                                  </span>
                                  <p className="text-white font-mono">
                                    {String(
                                      initialResult.file_analysis_LZ77
                                        .estimated_match_ratio || "N/A"
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-400">
                                    Longest Match:
                                  </span>
                                  <p className="text-white font-mono">
                                    {String(
                                      initialResult.file_analysis_LZ77
                                        .longest_match || "N/A"
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-400">
                                    Compression Ratio:
                                  </span>
                                  <p className="text-white font-mono">
                                    {String(
                                      initialResult.file_analysis_LZ77
                                        .estimated_compression_ratio || "N/A"
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-400">
                                    Recommendation:
                                  </span>
                                  <p className="text-white font-mono text-xs">
                                    {String(
                                      initialResult.file_analysis_LZ77
                                        .recommendation || "N/A"
                                    )}
                                  </p>
                                </div>
                              </div>

                              {/* Top 5 Bytes */}
                              {initialResult.file_analysis_LZ77.top_5_bytes &&
                                Array.isArray(
                                  initialResult.file_analysis_LZ77.top_5_bytes
                                ) &&
                                initialResult.file_analysis_LZ77.top_5_bytes
                                  .length > 0 && (
                                  <div className="mt-4">
                                    <span className="text-gray-400 text-sm">
                                      Top 5 Bytes:
                                    </span>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {initialResult.file_analysis_LZ77.top_5_bytes.map(
                                        (byte, index) => (
                                          <span
                                            key={index}
                                            className="px-2 py-1 bg-gray-600/50 rounded text-xs font-mono text-white"
                                          >
                                            {typeof byte === "object" &&
                                            byte !== null
                                              ? Array.isArray(byte)
                                                ? `${byte[0]} (${byte[1]})`
                                                : `${byte.value || byte.byte || "N/A"} (${byte.count || "N/A"})`
                                              : String(byte)}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                              {/* Common Patterns */}
                              {initialResult.file_analysis_LZ77
                                .common_patterns &&
                                Array.isArray(
                                  initialResult.file_analysis_LZ77
                                    .common_patterns
                                ) &&
                                initialResult.file_analysis_LZ77.common_patterns
                                  .length > 0 && (
                                  <div className="mt-4">
                                    <span className="text-gray-400 text-sm">
                                      Common Patterns:
                                    </span>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {initialResult.file_analysis_LZ77.common_patterns.map(
                                        (pattern, index) => (
                                          <span
                                            key={index}
                                            className="px-2 py-1 bg-gray-600/50 rounded text-xs font-mono text-white"
                                          >
                                            {typeof pattern === "object" &&
                                            pattern !== null
                                              ? Array.isArray(pattern)
                                                ? `${pattern[0]} (${pattern[1]})`
                                                : `${pattern.pattern || pattern.value || "N/A"} (${pattern.count || "N/A"})`
                                              : String(pattern)}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}

                          {/* Download Button */}
                          {initialResult?.compressed_file && (
                            <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                              <h4 className="text-lg font-semibold text-green-400 mb-3">
                                Download Compressed File
                              </h4>
                              <button
                                onClick={() => {
                                  try {
                                    // Decode base64 to binary
                                    const binaryString = atob(
                                      initialResult.compressed_file
                                    );
                                    const bytes = new Uint8Array(
                                      binaryString.length
                                    );
                                    for (
                                      let i = 0;
                                      i < binaryString.length;
                                      i++
                                    ) {
                                      bytes[i] = binaryString.charCodeAt(i);
                                    }

                                    // Create blob and download
                                    const blob = new Blob([bytes], {
                                      type:
                                        initialResult.content_type ||
                                        "application/octet-stream",
                                    });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = "compressed_file.lz77";
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                  } catch (error) {
                                    console.error(
                                      "Error downloading file:",
                                      error
                                    );
                                    alert(
                                      "Error downloading file. Please try again."
                                    );
                                  }
                                }}
                                className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 font-medium"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                                Download Compressed File
                              </button>
                              <p className="text-gray-400 text-xs mt-2">
                                File will be downloaded as
                                'compressed_file.lz77'
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
                  <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div
                      className={`text-center mb-8 transition-all duration-1000 ${animationStep >= 0 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10"}`}
                    >
                      <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                        Decompression Analytics Portal
                      </h1>
                      <p className="text-gray-300 text-lg">
                        {initialResult.algorithm_info?.name ||
                          "Advanced Decompression Analysis"}
                      </p>
                    </div>

                    {/* Stats Cards */}
                    <div
                      className={`grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 transition-all duration-1000 delay-300 ${animationStep >= 0 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                    >
                      {/* Compressed Size Card */}
                      <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50 hover:border-cyan-500/50 transition-all duration-300">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-gray-400 text-sm uppercase tracking-wide">
                            Compressed Size
                          </h3>
                          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-3xl font-bold text-white">
                          {formatBytes(
                            initialResult.file_info?.compressed_file_size ||
                              initialResult.compressed_size ||
                              0
                          )}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                          {initialResult.original_filename || "Input File"}
                        </p>
                      </div>

                      {/* Decompressed Size Card */}
                      <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50 hover:border-green-500/50 transition-all duration-300">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-gray-400 text-sm uppercase tracking-wide">
                            Decompressed Size
                          </h3>
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-3xl font-bold text-white">
                          {formatBytes(
                            initialResult.file_info?.decompressed_size ||
                              initialResult.decompressed_size ||
                              0
                          )}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                          {initialResult.decompressed_filename || "Output File"}
                        </p>
                      </div>

                      {/* Processing Speed Card */}
                      <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-gray-400 text-sm uppercase tracking-wide">
                            Processing Speed
                          </h3>
                          <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-3xl font-bold text-white">
                          {initialResult.performance_metrics
                            ?.processing_speed || "N/A"}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                          Decompression Rate
                        </p>
                      </div>

                      {/* Integrity Check Card */}
                      <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50 hover:border-cyan-500/50 transition-all duration-300">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-gray-400 text-sm uppercase tracking-wide">
                            Integrity Check
                          </h3>
                          <div
                            className={`w-3 h-3 rounded-full animate-pulse ${
                              initialResult.validation?.integrity_check ===
                                "Passed" ||
                              initialResult.decompression_successful
                                ? "bg-green-500"
                                : "bg-red-500"
                            }`}
                          ></div>
                        </div>
                        <p className="text-3xl font-bold text-white">
                          {initialResult.validation?.integrity_check ||
                            (initialResult.decompression_successful
                              ? "Passed"
                              : "Failed")}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                          Data Validation
                        </p>
                      </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {/* File Size Comparison */}
                      <div
                        className={`lg:col-span-2 xl:col-span-2 bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50 transition-all duration-1000 delay-600 ${animationStep >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                      >
                        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                          <div className="w-4 h-4 bg-gradient-to-r from-cyan-400 to-purple-400 rounded mr-3"></div>
                          Size Comparison Analysis
                        </h3>
                        <div className="h-64">
                          <canvas
                            ref={decompressedComparisonChartRef}
                            width="400"
                            height="250"
                          ></canvas>
                        </div>
                      </div>

                      {/* Processing Time Visualization */}
                      <div
                        className={`bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50 transition-all duration-1000 delay-900 ${animationStep >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                      >
                        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                          <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-cyan-400 rounded mr-3"></div>
                          Processing Time
                        </h3>
                        <div className="h-64 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-4xl font-bold text-white mb-2">
                              {initialResult.performance_metrics?.decompression_time_seconds?.toFixed(
                                3
                              ) || "0.000"}
                              s
                            </div>
                            <div className="text-sm text-gray-400 mb-4">
                              Decompression Time
                            </div>
                            <div className="w-32 h-32 mx-auto border-4 border-green-500 rounded-full flex items-center justify-center">
                              <div className="text-lg font-semibold text-green-400">
                                {initialResult.performance_metrics
                                  ?.processing_speed || "N/A"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bit Analysis - Only for Huffman */}
                      {initialResult.mode === "huffmanCoding" &&
                        initialResult.bit_analysis && (
                          <div
                            className={`lg:col-span-2 xl:col-span-3 bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50 transition-all duration-1000 delay-1200 ${animationStep >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                          >
                            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                              <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded mr-3"></div>
                              Bit Analysis Breakdown
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                                <div className="text-2xl font-bold text-blue-400 mb-2">
                                  {initialResult.bit_analysis.total_bits_in_file?.toLocaleString() ||
                                    "0"}
                                </div>
                                <div className="text-sm text-gray-400">
                                  Total Bits
                                </div>
                              </div>
                              <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                                <div className="text-2xl font-bold text-green-400 mb-2">
                                  {initialResult.bit_analysis.effective_bits_used?.toLocaleString() ||
                                    "0"}
                                </div>
                                <div className="text-sm text-gray-400">
                                  Effective Bits
                                </div>
                              </div>
                              <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                                <div className="text-2xl font-bold text-yellow-400 mb-2">
                                  {initialResult.bit_analysis.padding_bits ||
                                    "0"}
                                </div>
                                <div className="text-sm text-gray-400">
                                  Padding Bits
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                      {/* RLE Specific Stats */}
                      {initialResult.mode === "runLengthEncoding" &&
                        initialResult.decompression_details_RLE && (
                          <div
                            className={`lg:col-span-2 xl:col-span-3 bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50 transition-all duration-1000 delay-1200 ${animationStep >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                          >
                            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                              <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded mr-3"></div>
                              RLE Decompression Analysis
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                                <div className="text-2xl font-bold text-blue-400 mb-2">
                                  {initialResult.decompression_details_RLE.runs_processed?.toLocaleString() ||
                                    "0"}
                                </div>
                                <div className="text-sm text-gray-400">
                                  Runs Processed
                                </div>
                              </div>
                              <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                                <div className="text-2xl font-bold text-green-400 mb-2">
                                  {initialResult.decompression_details_RLE.literal_segments_processed?.toLocaleString() ||
                                    "0"}
                                </div>
                                <div className="text-sm text-gray-400">
                                  Literal Segments
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                      {/* LZ77 Specific Stats */}
                      {initialResult.mode === "lZ77" &&
                        initialResult.decompression_details_LZ77 && (
                          <div
                            className={`lg:col-span-2 xl:col-span-3 bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50 transition-all duration-1000 delay-1200 ${animationStep >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                          >
                            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                              <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded mr-3"></div>
                              LZ77 Decompression Analysis
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                                <div className="text-2xl font-bold text-blue-400 mb-2">
                                  {initialResult.decompression_details_LZ77.triplets_processed?.toLocaleString() ||
                                    "0"}
                                </div>
                                <div className="text-sm text-gray-400">
                                  Triplets Processed
                                </div>
                              </div>
                              <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                                <div className="text-2xl font-bold text-green-400 mb-2">
                                  {initialResult.decompression_details_LZ77.matches_processed?.toLocaleString() ||
                                    "0"}
                                </div>
                                <div className="text-sm text-gray-400">
                                  Matches Processed
                                </div>
                              </div>
                              <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                                <div className="text-2xl font-bold text-yellow-400 mb-2">
                                  {initialResult.decompression_details_LZ77.literals_processed?.toLocaleString() ||
                                    "0"}
                                </div>
                                <div className="text-sm text-gray-400">
                                  Literals Processed
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Algorithm Details */}
                    <div
                      className={`mt-8 bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50 transition-all duration-1000 delay-1500 ${animationStep >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                    >
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                        <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-400 rounded mr-3"></div>
                        Decompression Details
                      </h3>

                      {/* Algorithm Info */}
                      {initialResult.algorithm_info && (
                        <div className="mb-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                          <h4 className="text-lg font-semibold text-cyan-400 mb-2 flex items-center">
                            <FileText className="w-5 h-5 mr-2" />
                            {initialResult.algorithm_info.name}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Process:</span>
                              <p className="text-gray-300">
                                {initialResult.algorithm_info.process}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-400">Type:</span>
                              <p className="text-gray-300">
                                Lossless Decompression
                              </p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="text-gray-400">Description:</span>
                            <p className="text-gray-300">
                              {initialResult.algorithm_info.description}
                            </p>
                          </div>
                          {initialResult.algorithm_info.characteristics && (
                            <div className="mt-3">
                              <span className="text-gray-400">
                                Characteristics:
                              </span>
                              <p className="text-gray-300">
                                {initialResult.algorithm_info.characteristics}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Huffman Decompression Statistics */}
                      {initialResult.mode === "huffmanCoding" &&
                        initialResult.decompression_details && (
                          <div className="mb-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                            <h4 className="text-lg font-semibold text-purple-400 mb-3 flex items-center">
                              <Database className="w-5 h-5 mr-2" />
                              Huffman Decompression Statistics
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-400">
                                  Characters Decoded:
                                </span>
                                <p className="text-white font-mono">
                                  {initialResult.decompression_details.characters_decoded?.toLocaleString() ||
                                    "0"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Unique Characters:
                                </span>
                                <p className="text-white font-mono">
                                  {initialResult.decompression_details
                                    .unique_characters || "0"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Tree Depth:
                                </span>
                                <p className="text-white font-mono">
                                  {initialResult.decompression_details
                                    .tree_depth || "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                      {/* RLE Decompression Statistics */}
                      {initialResult.mode === "runLengthEncoding" &&
                        initialResult.decompression_details_RLE && (
                          <div className="mb-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                            <h4 className="text-lg font-semibold text-purple-400 mb-3 flex items-center">
                              <Zap className="w-5 h-5 mr-2" />
                              RLE Decompression Statistics
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-400">
                                  Runs Processed:
                                </span>
                                <p className="text-white font-mono">
                                  {initialResult.decompression_details_RLE.runs_processed?.toLocaleString() ||
                                    "0"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Literal Segments:
                                </span>
                                <p className="text-white font-mono">
                                  {initialResult.decompression_details_RLE.literal_segments_processed?.toLocaleString() ||
                                    "0"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Size Verification:
                                </span>
                                <p
                                  className={`font-mono ${initialResult.decompression_details_RLE.size_verification === "Passed" ? "text-green-400" : "text-red-400"}`}
                                >
                                  {initialResult.decompression_details_RLE
                                    .size_verification || "N/A"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Decompression Status:
                                </span>
                                <p
                                  className={`font-mono ${initialResult.decompression_details_RLE.decompression_successful ? "text-green-400" : "text-red-400"}`}
                                >
                                  {initialResult.decompression_details_RLE
                                    .decompression_successful
                                    ? "Success"
                                    : "Failed"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                      {/* LZ77 Decompression Statistics */}
                      {initialResult.mode === "lZ77" &&
                        initialResult.decompression_details_LZ77 && (
                          <div className="mb-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                            <h4 className="text-lg font-semibold text-purple-400 mb-3 flex items-center">
                              <Database className="w-5 h-5 mr-2" />
                              LZ77 Decompression Statistics
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-400">
                                  Triplets Processed:
                                </span>
                                <p className="text-white font-mono">
                                  {initialResult.decompression_details_LZ77.triplets_processed?.toLocaleString() ||
                                    "0"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Matches Processed:
                                </span>
                                <p className="text-white font-mono">
                                  {initialResult.decompression_details_LZ77.matches_processed?.toLocaleString() ||
                                    "0"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Literals Processed:
                                </span>
                                <p className="text-white font-mono">
                                  {initialResult.decompression_details_LZ77.literals_processed?.toLocaleString() ||
                                    "0"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Size Verification:
                                </span>
                                <p
                                  className={`font-mono ${initialResult.decompression_details_LZ77.size_verification === "Passed" ? "text-green-400" : "text-red-400"}`}
                                >
                                  {initialResult.decompression_details_LZ77
                                    .size_verification || "N/A"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">
                                  Integrity Check:
                                </span>
                                <p className="text-white font-mono text-xs">
                                  {initialResult.decompression_details_LZ77
                                    .integrity_check || "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                      {/* File Information */}
                      {(initialResult.file_info ||
                        initialResult.compressed_size) && (
                        <div className="mb-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                          <h4 className="text-lg font-semibold text-green-400 mb-3 flex items-center">
                            <FileText className="w-5 h-5 mr-2" />
                            File Analysis
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">
                                Original Size:
                              </span>
                              <p className="text-white font-mono">
                                {formatBytes(
                                  initialResult.file_info?.original_size ||
                                    initialResult.original_size ||
                                    0
                                )}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-400">
                                Decompressed Size:
                              </span>
                              <p className="text-white font-mono">
                                {formatBytes(
                                  initialResult.file_info?.decompressed_size ||
                                    initialResult.decompressed_size ||
                                    0
                                )}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-400">
                                Compressed Size:
                              </span>
                              <p className="text-white font-mono">
                                {formatBytes(
                                  initialResult.file_info
                                    ?.compressed_file_size ||
                                    initialResult.compressed_size ||
                                    0
                                )}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-400">Size Match:</span>
                              <p
                                className={`font-mono ${
                                  initialResult.file_info?.size_match ||
                                  initialResult.decompression_successful
                                    ? "text-green-400"
                                    : "text-red-400"
                                }`}
                              >
                                {initialResult.file_info?.size_match
                                  ? "Perfect Match"
                                  : initialResult.decompression_successful
                                    ? "Success"
                                    : "Mismatch Detected"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Performance Metrics */}
                      {(initialResult.performance_metrics ||
                        initialResult.decompression_details_LZ77) && (
                        <div className="mb-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                          <h4 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center">
                            <Clock className="w-5 h-5 mr-2" />
                            Performance Metrics
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">
                                Processing Speed:
                              </span>
                              <p className="text-white font-mono">
                                {initialResult.performance_metrics
                                  ?.processing_speed || "N/A"}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-400">
                                Decompression Time:
                              </span>
                              <p className="text-white font-mono">
                                {initialResult.performance_metrics?.decompression_time_seconds?.toFixed(
                                  3
                                ) || "N/A"}
                                s
                              </p>
                            </div>
                            {initialResult.mode === "lZ77" &&
                              initialResult.performance_metrics
                                ?.original_vs_decompressed && (
                                <div>
                                  <span className="text-gray-400">
                                    Size Match:
                                  </span>
                                  <p
                                    className={`font-mono ${initialResult.performance_metrics.original_vs_decompressed.match ? "text-green-400" : "text-red-400"}`}
                                  >
                                    {initialResult.performance_metrics
                                      .original_vs_decompressed.match
                                      ? "Perfect"
                                      : "Mismatch"}
                                  </p>
                                </div>
                              )}
                          </div>
                        </div>
                      )}

                      {/* Validation Status */}
                      {initialResult.validation && (
                        <div className="mb-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                          <h4 className="text-lg font-semibold text-blue-400 mb-3 flex items-center">
                            {initialResult.validation.success ? (
                              <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
                            ) : (
                              <XCircle className="w-5 h-5 mr-2 text-red-400" />
                            )}
                            Validation Results
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Status:</span>
                              <p
                                className={`font-mono ${initialResult.validation.success ? "text-green-400" : "text-red-400"}`}
                              >
                                {initialResult.validation.success
                                  ? "Success"
                                  : "Failed"}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-400">
                                Integrity Check:
                              </span>
                              <p
                                className={`font-mono ${initialResult.validation.integrity_check === "Passed" ? "text-green-400" : "text-red-400"}`}
                              >
                                {initialResult.validation.integrity_check}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-400">
                                Error Message:
                              </span>
                              <p className="text-white font-mono text-xs">
                                {initialResult.validation.error_message ||
                                  "None"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      {initialResult.metadata && (
                        <div className="mt-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                          <h4 className="text-lg font-semibold text-orange-400 mb-3 flex items-center">
                            <Clock className="w-5 h-5 mr-2" />
                            Processing Metadata
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">
                                Compression Time:
                              </span>
                              <p className="text-white font-mono text-xs">
                                {initialResult.metadata.compression_timestamp
                                  ? new Date(
                                      initialResult.metadata.compression_timestamp
                                    ).toLocaleString()
                                  : "N/A"}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-400">
                                Decompression Time:
                              </span>
                              <p className="text-white font-mono text-xs">
                                {initialResult.metadata.decompression_timestamp
                                  ? new Date(
                                      initialResult.metadata.decompression_timestamp
                                    ).toLocaleString()
                                  : "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {initialResult?.decompressed_file && (
                        <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                          <h4 className="text-lg font-semibold text-green-400 mb-3">
                            Download Decompressed File
                          </h4>
                          <button
                            onClick={() => {
                              try {
                                // Decode base64 to binary
                                const binaryString = atob(
                                  initialResult.decompressed_file
                                );
                                const bytes = new Uint8Array(
                                  binaryString.length
                                );
                                for (let i = 0; i < binaryString.length; i++) {
                                  bytes[i] = binaryString.charCodeAt(i);
                                }

                                // Create blob and download
                                const blob = new Blob([bytes], {
                                  type:
                                    initialResult.content_type ||
                                    "application/octet-stream",
                                });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = "decompressed_file";
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              } catch (error) {
                                console.error("Error downloading file:", error);
                                alert(
                                  "Error downloading file. Please try again."
                                );
                              }
                            }}
                            className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 font-medium"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            Download Decompressed File
                          </button>
                          <p className="text-gray-400 text-xs mt-2">
                            File will be downloaded as 'decompressed_file'
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

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

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(55, 65, 81, 0.3);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, #8b5cf6, #06b6d4);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, #7c3aed, #0891b2);
        }
      `}</style>
    </div>
  );
}
