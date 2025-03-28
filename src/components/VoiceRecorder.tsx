"use client";

import { useState } from "react";
import { motion } from "framer-motion";

// This is a placeholder component since the original functionality isn't currently used
export default function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);

  const handleToggleRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <div className="w-full max-w-md">
      <button
        onClick={handleToggleRecording}
        className={`w-full py-2 px-4 rounded-full ${
          isRecording
            ? "bg-red-500 hover:bg-red-600"
            : "bg-blue-500 hover:bg-blue-600"
        } text-white font-bold`}
      >
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>
      {isRecording && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-8 h-8 bg-blue-500 rounded-full mx-auto mb-4"
          />
          <p className="text-sm text-gray-600">Recording in progress...</p>
        </div>
      )}
    </div>
  );
}
