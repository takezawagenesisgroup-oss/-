export function isImageSrc(value: string): boolean {
  return value.startsWith('data:') || value.startsWith('/') || value.startsWith('http');
}
