import React, { useEffect, useState } from 'react';

export default function Cursor() {
  const [position, setPosition] = useState({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (window.getComputedStyle(target).cursor === 'pointer' || target.tagName.toLowerCase() === 'a' || target.tagName.toLowerCase() === 'button' || target.closest('button')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseover', onMouseOver);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
    };
  }, []);

  return (
    <>
      <div 
        className="fixed top-0 left-0 w-2 h-2 bg-white rounded-full pointer-events-none z-[9999] mix-blend-screen transition-transform duration-75 ease-out shadow-[0_0_10px_white]"
        style={{ transform: `translate3d(${position.x - 4}px, ${position.y - 4}px, 0)` }}
      />
      <div 
        className="fixed top-0 left-0 w-10 h-10 border border-white/30 rounded-full pointer-events-none z-[9998] transition-all duration-300 ease-out flex items-center justify-center opacity-80"
        style={{ 
          transform: `translate3d(${position.x - 20}px, ${position.y - 20}px, 0) scale(${isHovering ? 1.5 : 1})`,
          backgroundColor: isHovering ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
          borderColor: isHovering ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)'
        }}
      />
    </>
  );
}
