export const unrealRandomStreamSeedMultiplier = 196_314_165;
export const unrealRandomStreamSeedIncrement = 907_633_515;

export class UnrealRandomStream {
  readonly #fractionBytes = new DataView(new ArrayBuffer(4));
  #seed: number;

  public constructor(seed: number) {
    if (!Number.isInteger(seed) || seed < -2_147_483_648 || seed > 2_147_483_647) {
      throw new Error("FRandomStream seed must be a signed 32-bit integer.");
    }
    this.#seed = seed >>> 0;
  }

  public getFraction(): number {
    this.#seed = (
      Math.imul(this.#seed, unrealRandomStreamSeedMultiplier) +
      unrealRandomStreamSeedIncrement
    ) >>> 0;
    const fractionBits = 0x3f80_0000 | (this.#seed >>> 9);
    this.#fractionBytes.setUint32(0, fractionBits, true);
    return this.#fractionBytes.getFloat32(0, true) - 1;
  }

  public randRange(minimum: number, maximum: number): number {
    if (
      !Number.isInteger(minimum) ||
      !Number.isInteger(maximum) ||
      minimum < -2_147_483_648 ||
      maximum > 2_147_483_647 ||
      minimum > maximum
    ) {
      throw new Error("FRandomStream range must be an ordered signed 32-bit range.");
    }
    const range = maximum - minimum + 1;
    if (range > 2_147_483_647) {
      throw new Error("FRandomStream inclusive range is too wide.");
    }
    const scaled = Math.fround(this.getFraction() * Math.fround(range));
    return minimum + Math.trunc(scaled);
  }
}
