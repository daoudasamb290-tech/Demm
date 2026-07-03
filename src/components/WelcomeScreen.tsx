/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

interface WelcomeScreenProps {
  onSelectRole: (role: 'passenger' | 'driver') => void;
}

export default function WelcomeScreen({ onSelectRole }: WelcomeScreenProps) {
  return (
    <div 
      className="relative min-h-screen bg-brand-blue text-white overflow-hidden flex flex-col justify-between px-6 pb-8 bg-cover bg-center"
      style={{ backgroundImage: "url('/src/assets/images/vtc_bg_1782664469599.jpg')" }}
    >
      {/* Dark tint overlay for readability */}
      <div className="absolute inset-0 bg-[#10204A]/70 z-0 pointer-events-none" />

      {/* Background Decorative Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-[#3d5ba9]/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] bg-[#F4801F]/10 rounded-full blur-[100px]" style={{ animationDelay: '2s' }} />
        
        {/* Senegal Map Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-15 mix-blend-screen p-10">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhOTrIaSpbxYn0ScHZ9jWLNbBMHnZbw6mz9pfJfE4AyUWQquWJjukFmTn2gixs4av5fkobhg0oRVkHxT8BTQ8-VTlUG5GtWLxEE2_XbG7Zc0t_4YXwRcOSSSOxnT19UrfTlJo40bMvctnAUz85zCXQKkL6pytexch-jbHUjGBZjftaifVfRtSW3UJQOvpfvHC96Y1946MJhv5AFYQzbZZdXr8i7KsohQq-zBcrmR8vKMMy-Wdulvr2qMN8Rrze2plocR13luTaPv1A"
            alt="Senegal Map Pattern"
            className="w-full max-w-[380px] object-contain"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 pt-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center flex flex-col items-center space-y-6"
        >
          {/* Logo */}
          <div className="relative w-32 h-32 mb-4">
            <div className="w-32 h-32 flex items-center justify-center rounded-full bg-white/5 backdrop-blur p-1">
              <img
                src="/src/assets/images/log.png"
                alt="DEM niou_dem Logo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            {/* Small decorative pulse glow */}
            <div className="absolute -inset-2 bg-brand-orange/20 rounded-full blur-lg animate-pulse" />
          </div>

          <div className="space-y-3">
            <h1 className="font-space text-3xl font-extrabold tracking-tight">
              DEM <span className="text-brand-orange">niou_dem</span>
            </h1>
            <p className="font-sans text-lg text-white/80 max-w-[290px] mx-auto leading-snug px-2">
              Voyagez entre les villes du Sénégal, en toute simplicité.
            </p>
          </div>
        </motion.div>

        {/* Visual Feature Element */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-12 w-full glass-card p-4 rounded-2xl flex items-center gap-4 border border-white/10"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-brand-orange">
            <span className="material-symbols-outlined font-bold">verified</span>
          </div>
          <div>
            <div className="font-space font-medium text-white text-sm">Trajets Sécurisés</div>
            <div className="font-sans text-xs text-white/60">Flotte certifiée et suivi temps réel.</div>
          </div>
        </motion.div>
      </div>

      {/* Action Buttons Section */}
      <div className="space-y-4 w-full mt-auto relative z-10 pt-6">
        {/* Passenger Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectRole('passenger')}
          className="group w-full h-14 bg-brand-orange hover:bg-brand-orange/90 active:scale-95 transition-all duration-200 rounded-xl flex items-center justify-between px-6 shadow-lg shadow-brand-orange/20 font-space font-bold text-white text-base cursor-pointer"
        >
          <span>Je suis passager</span>
          <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
        </motion.button>

        {/* Driver Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectRole('driver')}
          className="w-full h-14 bg-transparent border-2 border-white/20 hover:border-white/40 active:scale-95 transition-all duration-200 rounded-xl flex items-center justify-center font-space font-bold text-white text-base cursor-pointer"
        >
          <span>Je suis chauffeur</span>
        </motion.button>

        {/* Legal text */}
        <div className="text-center pt-2">
          <p className="font-mono text-[10px] text-white/40">
            © 2026 DEM niou_dem. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  );
}
