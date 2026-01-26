import { useEffect, useState } from "react";

const GeometricChameleon = () => {
  const [position, setPosition] = useState({ x: 30, y: 50 });
  const [colorShift, setColorShift] = useState(0);

  useEffect(() => {
    // Slow movement across the screen
    const moveInterval = setInterval(() => {
      setPosition((prev) => ({
        x: prev.x >= 120 ? 10 : prev.x + 0.03,
        y: 50 + Math.sin(prev.x * 0.08) * 8,
      }));
    }, 50);

    // Color shift animation
    const colorInterval = setInterval(() => {
      setColorShift((prev) => (prev + 1) % 360);
    }, 80);

    return () => {
      clearInterval(moveInterval);
      clearInterval(colorInterval);
    };
  }, []);

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: "translate(-50%, -50%)",
        filter: `hue-rotate(${colorShift}deg) drop-shadow(0 0 30px #a855f7) drop-shadow(0 0 60px #f97316)`,
      }}
    >
      <svg
        width="400"
        height="280"
        viewBox="0 0 300 200"
        className="opacity-60"
      >
        {/* Body - main geometric shapes */}
        <g className="animate-pulse" style={{ animationDuration: "4s" }}>
          {/* Main body polygon */}
          <polygon
            points="80,100 120,60 180,55 220,70 240,100 220,140 180,150 120,145"
            fill="#a855f7"
            className="animate-pulse"
            style={{ animationDuration: "3s" }}
          />
          
          {/* Head */}
          <polygon
            points="220,70 260,50 280,70 280,110 260,130 220,140 240,100"
            fill="#c084fc"
          />
          
          {/* Eye */}
          <circle cx="265" cy="85" r="12" fill="#1a1a2e" />
          <circle cx="267" cy="83" r="6" fill="#f97316" className="animate-pulse" />
          
          {/* Tail - curved geometric */}
          <path
            d="M80,100 Q40,90 30,120 Q25,150 50,160 Q60,155 55,140 Q50,125 60,115 Q70,105 80,100"
            fill="#9333ea"
          />
          
          {/* Front leg */}
          <polygon
            points="160,140 155,170 165,175 175,165 180,145"
            fill="#7c3aed"
          />
          
          {/* Back leg */}
          <polygon
            points="110,135 105,165 115,170 125,160 130,140"
            fill="#7c3aed"
          />
          
          {/* Crest/Ridge on back */}
          <polygon
            points="140,55 150,35 165,55"
            fill="#f97316"
            className="animate-bounce"
            style={{ animationDuration: "6s" }}
          />
          <polygon
            points="165,53 175,30 190,52"
            fill="#fb923c"
            className="animate-bounce"
            style={{ animationDuration: "5s", animationDelay: "0.5s" }}
          />
          <polygon
            points="190,55 200,38 210,58"
            fill="#f97316"
            className="animate-bounce"
            style={{ animationDuration: "7s", animationDelay: "1s" }}
          />
          
          {/* Geometric texture lines */}
          <line x1="130" y1="80" x2="200" y2="75" stroke="#d8b4fe" strokeWidth="2" opacity="0.7" />
          <line x1="125" y1="100" x2="210" y2="95" stroke="#fdba74" strokeWidth="2" opacity="0.7" />
          <line x1="130" y1="120" x2="200" y2="125" stroke="#d8b4fe" strokeWidth="2" opacity="0.7" />
        </g>
      </svg>
    </div>
  );
};

export default GeometricChameleon;
