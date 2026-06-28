/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Destination {
  name: string;
  description: string;
  imageUrl: string;
}

const DESTINATIONS: Destination[] = [
  {
    name: 'Dakar',
    description: 'Monument de la Renaissance Africaine',
    imageUrl: '/src/assets/images/dakar_renaissance_1782658132941.jpg',
  },
  {
    name: 'Touba',
    description: 'La Grande Mosquée sainte',
    imageUrl: '/src/assets/images/touba_mosque_day_1782658162098.jpg',
  },
  {
    name: 'Thiès',
    description: 'La ville du rail et de la savane',
    imageUrl: '/src/assets/images/thies.png',
  },
  {
    name: 'Tivaouane',
    description: 'Grande Mosquée de Tivaouane',
    imageUrl: '/src/assets/images/tivaouane.png',
  }
];

interface DestinationCarouselProps {
  onSelectDestination?: (name: string) => void;
}

export default function DestinationCarousel({ onSelectDestination }: DestinationCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 240; // width of card + gap
      const currentScroll = scrollContainerRef.current.scrollLeft;
      const targetScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative w-full group py-2">
      {/* Hide Scrollbar CSS injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      {/* Section Header */}
      <div className="flex justify-between items-center mb-3 px-1">
        <div>
          <h3 className="font-space font-bold text-base text-[#10204A]">Destinations populaires</h3>
          <p className="text-gray-400 font-sans text-[11px]">Explorez le Sénégal d'un simple clic</p>
        </div>
        
        {/* Navigation Buttons for Desktop */}
        <div className="hidden sm:flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            type="button"
            onClick={() => scroll('left')}
            className="w-7 h-7 rounded-full bg-white border border-gray-100 shadow-xs flex items-center justify-center text-[#10204A] hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
            aria-label="Précédent"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            className="w-7 h-7 rounded-full bg-white border border-gray-100 shadow-xs flex items-center justify-center text-[#10204A] hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
            aria-label="Suivant"
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Scrollable Container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-smooth touch-pan-x gap-4 pb-2 px-1"
      >
        {DESTINATIONS.map((dest) => (
          <button
            key={dest.name}
            type="button"
            onClick={() => onSelectDestination?.(dest.name)}
            className="snap-start snap-always shrink-0 w-48 sm:w-60 h-32 sm:h-40 rounded-2xl overflow-hidden relative group/card cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-orange/40 text-left shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            {/* Background Image with Hover Zoom effect */}
            <img
              src={dest.imageUrl}
              alt={dest.name}
              className="absolute inset-0 object-cover w-full h-full transform group-hover/card:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            
            {/* Dark Gradient Overlay for optimal readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            
            {/* Overlay Text Details */}
            <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-col">
              <span className="text-white font-semibold tracking-wide text-base sm:text-lg leading-tight font-space">
                {dest.name}
              </span>
              <span className="text-white/70 text-[10px] sm:text-xs font-sans mt-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 truncate">
                {dest.description}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
