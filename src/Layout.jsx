import React from 'react';
import { Crown } from 'lucide-react';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-serif">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{backgroundImage: "url('https://www.transparenttextures.com/patterns/wood-pattern.png')"}}
      ></div>
      <header className="relative border-b border-yellow-700/30 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-center items-center">
          <Crown className="w-8 h-8 text-yellow-400 mr-4" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-wider text-yellow-50" style={{fontFamily: "'Cinzel', serif"}}>
            Drunkens & Drankens
          </h1>
        </div>
      </header>
      <main className="relative container mx-auto px-4 py-8 md:py-12">
        {children}
      </main>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap');
      `}</style>
    </div>
  );
}