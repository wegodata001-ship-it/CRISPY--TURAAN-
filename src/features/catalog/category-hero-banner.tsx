"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useLocalizedCategory } from "@/hooks/useLocalizedContent";
import { getCategoryHeroImage } from "@/lib/menu/placeholders";
import type { Category } from "@/types";

interface CategoryHeroBannerProps {
  category: Category | null;
}

export function CategoryHeroBanner({ category }: CategoryHeroBannerProps) {
  const localized = useLocalizedCategory(category);
  const imageSrc = category ? getCategoryHeroImage(category.image, category.id) : null;

  if (!category || !imageSrc) return null;

  return (
    <motion.div
      key={category.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-4 md:mx-0"
    >
      <div className="relative h-36 overflow-hidden rounded-xl sm:h-44 md:h-48">
        <Image
          src={imageSrc}
          alt={localized.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 720px"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-brown/35 via-transparent to-transparent" />
      </div>
    </motion.div>
  );
}
