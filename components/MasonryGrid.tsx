'use client';

import { ReactNode } from 'react';
import Masonry from 'react-masonry-css';

interface MasonryGridProps {
    children: ReactNode;
}

const breakpointColumns = {
    default: 5,
    1536: 5,
    1280: 4,
    1024: 3,
    768: 3,
    640: 2,
};

export default function MasonryGrid({ children }: MasonryGridProps) {
    return (
        <Masonry
            breakpointCols={breakpointColumns}
            className="masonry-grid"
            columnClassName="masonry-grid_column"
        >
            {children}
        </Masonry>
    );
}
