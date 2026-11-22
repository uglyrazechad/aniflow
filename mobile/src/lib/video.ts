import type { ContentType } from 'expo-video';

/** AnimeGO отдаёт поток как hls/mp4; expo-video ждёт ContentType. */
export function contentTypeFor(type?: string | null): ContentType {
  if (type === 'hls' || type === 'dash' || type === 'smoothStreaming') return type;
  if (type === 'mp4' || type === 'progressive') return 'progressive';
  return 'auto';
}