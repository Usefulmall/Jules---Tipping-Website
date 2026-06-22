import { PDFDocument, PDFPage, rgb } from "pdf-lib";
import { generateQRCodeBuffer } from "./qrcode";

interface TipCardData {
  workerName: string;
  role: string;
  centre: string;
  tipUrl: string;
  qrCodeDataUrl?: string;
}

/**
 * Generate a single printable tip card as PDF
 */
export async function generateTipCard(data: TipCardData): Promise<Buffer> {
  try {
    // Create PDF document
    const pdfDoc = await PDFDocument.create();

    // Add a single page (A6 size - half of A5, suitable for business cards)
    const page = pdfDoc.addPage([420, 297]); // A6 in points (148mm x 105mm)

    // Generate QR code
    const qrCodeBuffer = await generateQRCodeBuffer(data.tipUrl, { width: 150 });
    const qrImage = await pdfDoc.embedPng(qrCodeBuffer);

    // Draw background
    page.drawRectangle({
      x: 0,
      y: 0,
      width: 420,
      height: 297,
      color: rgb(0.98, 0.98, 0.98),
    });

    // Draw border
    page.drawRectangle({
      x: 10,
      y: 10,
      width: 400,
      height: 277,
      borderColor: rgb(0.2, 0.2, 0.2),
      borderWidth: 2,
    });

    // Title
    page.drawText("SCAN TO TIP", {
      x: 20,
      y: 260,
      size: 18,
      color: rgb(0.1, 0.1, 0.1),
      font: await pdfDoc.embedFont("Helvetica-Bold"),
    });

    // Worker name
    page.drawText(data.workerName, {
      x: 20,
      y: 235,
      size: 16,
      color: rgb(0.2, 0.2, 0.2),
      font: await pdfDoc.embedFont("Helvetica-Bold"),
    });

    // Role
    page.drawText(data.role, {
      x: 20,
      y: 215,
      size: 12,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Centre
    page.drawText(`@ ${data.centre}`, {
      x: 20,
      y: 200,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });

    // QR Code
    page.drawImage(qrImage, {
      x: 240,
      y: 80,
      width: 150,
      height: 150,
    });

    // Footer text
    page.drawText("Digital Tipping Platform", {
      x: 20,
      y: 30,
      size: 8,
      color: rgb(0.6, 0.6, 0.6),
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("[PDF] Error generating tip card:", error);
    throw error;
  }
}

/**
 * Generate A4 sheet with multiple tip cards (4 cards per page)
 */
export async function generateTipCardSheet(cards: TipCardData[]): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.create();

    // Calculate cards per page (2x2 layout)
    const cardsPerPage = 4;
    const totalPages = Math.ceil(cards.length / cardsPerPage);

    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      const page = pdfDoc.addPage([595, 842]); // A4 in points

      // Draw background
      page.drawRectangle({
        x: 0,
        y: 0,
        width: 595,
        height: 842,
        color: rgb(1, 1, 1),
      });

      const startIdx = pageNum * cardsPerPage;
      const endIdx = Math.min(startIdx + cardsPerPage, cards.length);
      const pageCards = cards.slice(startIdx, endIdx);

      // 2x2 grid layout
      const positions = [
        { x: 20, y: 440 }, // Top left
        { x: 307, y: 440 }, // Top right
        { x: 20, y: 147 }, // Bottom left
        { x: 307, y: 147 }, // Bottom right
      ];

      for (let i = 0; i < pageCards.length; i++) {
        const card = pageCards[i];
        const pos = positions[i];

        // Generate QR code
        const qrCodeBuffer = await generateQRCodeBuffer(card.tipUrl, { width: 100 });
        const qrImage = await pdfDoc.embedPng(qrCodeBuffer);

        // Card background
        page.drawRectangle({
          x: pos.x,
          y: pos.y,
          width: 260,
          height: 180,
          color: rgb(0.98, 0.98, 0.98),
        });

        // Card border
        page.drawRectangle({
          x: pos.x,
          y: pos.y,
          width: 260,
          height: 180,
          borderColor: rgb(0.2, 0.2, 0.2),
          borderWidth: 1,
        });

        // Title
        page.drawText("SCAN TO TIP", {
          x: pos.x + 10,
          y: pos.y + 155,
          size: 12,
          color: rgb(0.1, 0.1, 0.1),
          font: await pdfDoc.embedFont("Helvetica-Bold"),
        });

        // Worker name
        page.drawText(card.workerName, {
          x: pos.x + 10,
          y: pos.y + 135,
          size: 11,
          color: rgb(0.2, 0.2, 0.2),
          font: await pdfDoc.embedFont("Helvetica-Bold"),
        });

        // Role
        page.drawText(card.role, {
          x: pos.x + 10,
          y: pos.y + 120,
          size: 9,
          color: rgb(0.4, 0.4, 0.4),
        });

        // Centre
        page.drawText(`@ ${card.centre}`, {
          x: pos.x + 10,
          y: pos.y + 108,
          size: 8,
          color: rgb(0.5, 0.5, 0.5),
        });

        // QR Code
        page.drawImage(qrImage, {
          x: pos.x + 155,
          y: pos.y + 25,
          width: 100,
          height: 100,
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("[PDF] Error generating tip card sheet:", error);
    throw error;
  }
}
