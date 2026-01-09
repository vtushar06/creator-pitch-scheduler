import { motion } from 'framer-motion';
import { useMemo } from 'react';

export const CosmicBackground = () => {
  // Generate random stars
  const stars = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 3,
      duration: Math.random() * 3 + 3,
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Base Void Background */}
      <div className="absolute inset-0 bg-void" />

      {/* Red Eclipse Glow - The Signature Mugafi Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px]">
        <motion.div
          className="absolute inset-0 rounded-full blur-3xl opacity-30"
          style={{
            background: 'radial-gradient(circle at center, #F51C40 0%, #FF5C7C 30%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.4, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Secondary Pink Nebula */}
      <div className="absolute top-1/3 right-0 w-[800px] h-[600px]">
        <motion.div
          className="absolute inset-0 rounded-full blur-3xl opacity-20"
          style={{
            background: 'radial-gradient(circle at center, #FF5C7C 0%, #F51C40 40%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
        />
      </div>

      {/* Floating Stars / Particles */}
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
          }}
          animate={{
            opacity: [0.2, 1, 0.2],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: star.delay,
          }}
        />
      ))}

      {/* Grid Overlay for Depth */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
        }}
      />

      {/* Vignette Effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(3, 0, 5, 0.8) 100%)',
        }}
      />
    </div>
  );
};
