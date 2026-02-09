'use client';

import { CATEGORIES } from '@/lib/constants';
import { useEffect, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface CategoryFilterProps {
    selectedCategory: string;
    onSelectCategory: (category: string) => void;
}

export default function CategoryFilter({ selectedCategory, onSelectCategory }: CategoryFilterProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);

    const checkScrollPosition = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setShowLeftArrow(scrollLeft > 10);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    useEffect(() => {
        checkScrollPosition();
        window.addEventListener('resize', checkScrollPosition);
        return () => window.removeEventListener('resize', checkScrollPosition);
    }, []);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 200;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth',
            });
            setTimeout(checkScrollPosition, 300);
        }
    };

    return (
        <div className="relative py-4">
            {/* Left Arrow - Mobile only */}
            {showLeftArrow && (
                <button
                    onClick={() => scroll('left')}
                    className="md:hidden absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-[var(--card)] border border-[var(--border)] rounded-full shadow-lg"
                >
                    <FiChevronLeft className="w-5 h-5" />
                </button>
            )}

            {/* Categories */}
            <div
                ref={scrollRef}
                onScroll={checkScrollPosition}
                className="overflow-x-auto scrollbar-hide"
            >
                <div className="flex gap-2 min-w-max px-8 md:px-0">
                    {CATEGORIES.map((category) => (
                        <button
                            key={category}
                            onClick={() => onSelectCategory(category)}
                            className={`category-chip ${selectedCategory === category ? 'active' : ''}`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Arrow - Mobile only */}
            {showRightArrow && (
                <button
                    onClick={() => scroll('right')}
                    className="md:hidden absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-[var(--card)] border border-[var(--border)] rounded-full shadow-lg"
                >
                    <FiChevronRight className="w-5 h-5" />
                </button>
            )}
        </div>
    );
}
