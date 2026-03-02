import type { BackgroundFillStyle } from "../types/config.js";

/**
 * Build an ffmpeg filter_complex chain for the given background fill style.
 * All styles composite the original video onto a styled 1080x1920 canvas.
 */
export function buildFilterChain(style: BackgroundFillStyle): string {
  switch (style) {
    case "blurred-zoom":
      return [
        "split=2[fg][bg]",
        "[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=40[blurbg]",
        "[fg]scale=1080:-2:force_original_aspect_ratio=decrease[scaled]",
        "[blurbg][scaled]overlay=(W-w)/2:(H-h)/2[out]",
      ].join(";");

    case "mirror-reflection":
      return [
        "split=2[fg][bg]",
        "[bg]vflip,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=30[mirrorbg]",
        "[fg]scale=1080:-2:force_original_aspect_ratio=decrease[scaled]",
        "[mirrorbg][scaled]overlay=(W-w)/2:(H-h)/2[out]",
      ].join(";");

    case "split-fill":
      return [
        "split=3[fg][top][bot]",
        "[top]crop=iw:ih/2:0:0,scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,gblur=sigma=35[topblur]",
        "[bot]crop=iw:ih/2:0:ih/2,scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,gblur=sigma=35[botblur]",
        "[topblur][botblur]vstack[bgfull]",
        "[fg]scale=1080:-2:force_original_aspect_ratio=decrease[scaled]",
        "[bgfull][scaled]overlay=(W-w)/2:(H-h)/2[out]",
      ].join(";");

    default:
      // center-crop returns empty — caller should use videoFilters instead
      return "";
  }
}
