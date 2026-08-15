import { isImageSrc } from '../utils/media';

export default function Avatar({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  if (isImageSrc(src)) {
    return <img src={src} alt={alt} className={`object-cover ${className}`} />;
  }
  return (
    <span role="img" aria-label={alt} className={`flex items-center justify-center ${className}`}>
      {src}
    </span>
  );
}
