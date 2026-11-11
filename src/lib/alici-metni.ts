/** Alıcı listesini ekranda kısa yazar: "Ali, Ayşe" / "Ali, Ayşe ve 2 kişi daha" / "Herkes". */
export function kimeMetni(idler: string[], adlar: Map<string, string>, toplamKisi: number): string | null {
  const isimler = idler.map((id) => adlar.get(id)).filter((a): a is string => Boolean(a));
  if (isimler.length === 0) return null;
  if (toplamKisi > 1 && isimler.length >= toplamKisi) return "Herkes";
  if (isimler.length <= 3) return isimler.join(", ");
  return `${isimler.slice(0, 2).join(", ")} ve ${isimler.length - 2} kişi daha`;
}
