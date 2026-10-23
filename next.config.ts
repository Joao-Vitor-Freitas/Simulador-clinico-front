import type { NextConfig } from "next";

const config: NextConfig = {
  env: {
    API_BASE_URL: process.env.API_BASE_URL || "http://127.0.0.1:8000/api",
  },
};

export default config;
