/** The row filters of a PNG undone: the bytes a zlib stream gives back, turned into plain pixel rows.
 *  Decides: the five filters of the format (None, Sub, Up, Average, Paeth), 8 bits per channel, and nothing else.
 *  NOT here: reading the chunks of a PNG file (`extractor/png-decode.ts`), nor inflating a stream.
 *  Called by: `extractor/png-decode.ts`, `extractor/pdf-embedded-images.ts`, `extractor/pdf-objects/streams.ts`. */

/** PNG filter 4: the neighbour closest to `left + up − upLeft`. */
const paeth = (left: number, up: number, upLeft: number): number => {
  const estimate = left + up - upLeft;
  const toLeft = Math.abs(estimate - left);
  const toUp = Math.abs(estimate - up);
  const toUpLeft = Math.abs(estimate - upLeft);
  if (toLeft <= toUp && toLeft <= toUpLeft) return left;
  return toUp <= toUpLeft ? up : upLeft;
};

/** Undoes the PNG row filters (None, Sub, Up, Average, Paeth), 8 bits per channel. `data` is `height` rows of a
 *  filter byte then `width × channels` bytes; any other length, or a filter type above 4, gives `undefined`. */
export function unfilterPngRows(
  data: Uint8Array,
  width: number,
  height: number,
  channels: number,
): Uint8Array | undefined {
  const stride = width * channels;
  if (data.length !== height * (stride + 1)) return undefined;
  const out = new Uint8Array(height * stride);
  for (let row = 0; row < height; row++) {
    const filter = data[row * (stride + 1)]!;
    const source = row * (stride + 1) + 1;
    const target = row * stride;
    for (let at = 0; at < stride; at++) {
      const left = at >= channels ? out[target + at - channels]! : 0;
      const up = row > 0 ? out[target - stride + at]! : 0;
      const upLeft = at >= channels && row > 0 ? out[target - stride + at - channels]! : 0;
      let predicted: number;
      if (filter === 0) predicted = 0;
      else if (filter === 1) predicted = left;
      else if (filter === 2) predicted = up;
      else if (filter === 3) predicted = (left + up) >> 1;
      else if (filter === 4) predicted = paeth(left, up, upLeft);
      else return undefined;
      out[target + at] = (data[source + at]! + predicted) & 0xff;
    }
  }
  return out;
}
