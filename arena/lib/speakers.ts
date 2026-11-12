export const SPEAKER_PHOTOS: Record<string, string> = {
  "Daniel": "/img/Daniel.jpeg",
  "Daniel Pereira": "/img/Daniel.jpeg",
  "Janaína": "/img/Janaina.jpeg",
  "Janaína Silva": "/img/Janaina.jpeg",
  "Janaina": "/img/Janaina.jpeg",
  "Denilson": "/img/Denilson.png",
  "Denilson Carneiro": "/img/Denilson.png",
  "Sérgio": "/img/Sergio.jpeg",
  "Sérgio Passos": "/img/Sergio.jpeg",
  "Sergio": "/img/Sergio.jpeg",
  "Dulcila": "/img/Dulcila.jpeg",
  "Paula": "/img/Paula.jpeg",
  "Paula Melo": "/img/Paula.jpeg",
};

export function getSpeakerPhoto(name?: string | null, customUrl?: string | null): string {
  if (customUrl && customUrl.trim()) return customUrl;
  if (!name) return "/img/auditorio.png";
  const trimmed = name.trim();
  for (const [key, url] of Object.entries(SPEAKER_PHOTOS)) {
    if (trimmed.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(trimmed.toLowerCase())) {
      return url;
    }
  }
  return "/img/auditorio.png";
}
