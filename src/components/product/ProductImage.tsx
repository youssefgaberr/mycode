import Image from "next/image";

/**
 * Product photo with the store's colour grade applied (see `.graded` in
 * globals.css). Optimised by Next.js for CJ hosts; local demo SVGs are served as-is.
 */
export function ProductImage({
  src,
  alt,
  sizes,
  priority,
  className = "",
  grade = true,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  grade?: boolean;
}) {
  if (!src) {
    return <span className="absolute inset-0 bg-surface-2" aria-hidden />;
  }
  return (
    <span className={`absolute inset-0 overflow-hidden ${grade ? "graded" : ""}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={src.startsWith("/")}
        className={`object-cover ${className}`}
      />
    </span>
  );
}
