export function percentageToBasisPoints(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 100 || !Number.isSafeInteger(value * 100)) {
    throw new Error("Persentase harus berada di antara 0 dan 100.");
  }
  return value * 100;
}
