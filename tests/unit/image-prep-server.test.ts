import { describe, test, expect, beforeAll } from "vitest";
import sharp from "sharp";
import { prepImage } from "@/lib/image-prep-server";

let bigPng: Buffer;
let smallPng: Buffer;

beforeAll(async () => {
  // Create a synthetic 3000x2000 red PNG
  bigPng = await sharp({
    create: { width: 3000, height: 2000, channels: 3, background: { r: 255, g: 0, b: 0 } },
  })
    .png()
    .toBuffer();

  // A small 800x600 image that should not be enlarged
  smallPng = await sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 0, g: 255, b: 0 } },
  })
    .png()
    .toBuffer();
});

describe("prepImage", () => {
  test("resizes to max 2000px on the longest edge", async () => {
    const result = await prepImage(bigPng);
    expect(result.width).toBe(2000);
    expect(result.height).toBeLessThanOrEqual(2000);
    expect(result.mime).toBe("image/jpeg");
  });

  test("does not enlarge smaller images", async () => {
    const result = await prepImage(smallPng);
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  test("outputs JPEG", async () => {
    const result = await prepImage(smallPng);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe("jpeg");
  });

  test("honors custom maxDimension", async () => {
    const result = await prepImage(bigPng, { maxDimension: 1000 });
    expect(result.width).toBe(1000);
  });
});
