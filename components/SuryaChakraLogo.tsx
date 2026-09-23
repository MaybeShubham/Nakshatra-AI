import React from 'react'

interface LogoProps {
  className?: string
  size?: number
}

export default function SuryaChakraLogo({ className = 'w-8 h-8', size = 32 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background fill / accent glow */}
      <circle cx="50" cy="50" r="48" fill="#602028" />
      
      {/* Outer Ring */}
      <circle cx="50" cy="50" r="44" stroke="#F6D59A" strokeWidth="5" />

      {/* Central Hub Ring */}
      <circle cx="50" cy="50" r="16" stroke="#F6D59A" strokeWidth="5" fill="#602028" />

      {/* 6 Geometric Astronomical Spokes */}
      <g stroke="#F6D59A" strokeWidth="4.5" strokeLinecap="square" strokeLinejoin="miter">
        {/* Spoke 1 (Top) */}
        <path d="M 50 34 V 18 H 62 V 25" />
        {/* Spoke 2 (Top-Right) */}
        <path d="M 63.86 42 L 77.72 34 L 83.72 44.39 L 77.66 47.89" />
        {/* Spoke 3 (Bottom-Right) */}
        <path d="M 63.86 58 L 77.72 66 L 71.72 76.39 L 65.66 72.89" />
        {/* Spoke 4 (Bottom) */}
        <path d="M 50 66 V 82 H 38 V 75" />
        {/* Spoke 5 (Bottom-Left) */}
        <path d="M 36.14 58 L 22.28 66 L 16.28 55.61 L 22.34 52.11" />
        {/* Spoke 6 (Top-Left) */}
        <path d="M 36.14 42 L 22.28 34 L 28.28 23.61 L 34.34 27.11" />
      </g>
    </svg>
  )
}
