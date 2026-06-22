import QRCode from "qrcode";

/**
 * Generate QR code as data URL or buffer
 */
export async function generateQRCode(
  text: string,
  options?: {
    width?: number;
    margin?: number;
    color?: { dark?: string; light?: string };
  }
): Promise<string> {
  try {
    const qrOptions = {
      width: options?.width || 200,
      margin: options?.margin || 2,
      color: {
        dark: options?.color?.dark || "#000000",
        light: options?.color?.light || "#FFFFFF",
      },
      errorCorrectionLevel: "H" as const,
    };

    const dataUrl = await QRCode.toDataURL(text, qrOptions);
    return dataUrl;
  } catch (error) {
    console.error("[QRCode] Error generating QR code:", error);
    throw error;
  }
}

/**
 * Generate QR code as PNG buffer
 */
export async function generateQRCodeBuffer(
  text: string,
  options?: {
    width?: number;
    margin?: number;
  }
): Promise<Buffer> {
  try {
    const qrOptions = {
      width: options?.width || 200,
      margin: options?.margin || 2,
      errorCorrectionLevel: "H" as const,
    };

    const buffer = await QRCode.toBuffer(text, qrOptions);
    return buffer;
  } catch (error) {
    console.error("[QRCode] Error generating QR code buffer:", error);
    throw error;
  }
}
