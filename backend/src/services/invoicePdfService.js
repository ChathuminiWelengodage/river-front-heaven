const PDFDocument = require("pdfkit");

/**
 * Formats a numeric value into Sri Lankan Rupee currency string.
 * e.g. 15000 -> "Rs. 15,000.00"
 */
function formatCurrency(amount) {
  const num = Number(amount || 0);
  return (
    "Rs. " +
    num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Formats date into readable UK/Commonwealth format (e.g. 15 Nov 2026).
 */
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Formats datetime into readable format (e.g. 15 Nov 2026, 14:30).
 */
function formatDateTime(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Generates an A4 PDF buffer for a guest bill / invoice folio.
 *
 * @param {Object} billData - The result object from chargePostingService.getGuestBill()
 * @param {Object} options - Optional parameters { hotelSettings, title }
 * @returns {Promise<Buffer>}
 */
function generateInvoicePdfBuffer(billData, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: "A4",
        bufferPages: true,
        info: {
          Title: `Invoice - ${billData.reservation?.reference || "Guest Folio"}`,
          Author: "River Front Heaven",
          Subject: "Guest Invoice & Folio",
        },
      });

      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      const pageWidth = doc.page.width; // 595.28
      const pageHeight = doc.page.height; // 841.89
      const margin = 40;
      const contentWidth = pageWidth - margin * 2; // 515.28

      // Palette
      const primaryColor = "#0f172a"; // Slate 900
      const accentColor = "#0284c7"; // Sky 600
      const darkText = "#1e293b"; // Slate 800
      const mutedText = "#64748b"; // Slate 500
      const lightBg = "#f8fafc"; // Slate 50
      const borderColor = "#e2e8f0"; // Slate 200

      // Hotel Contact Information
      const hotelPhone = options.hotelSettings?.hotel_phone || "+94 47 222 3456";
      const hotelEmail = options.hotelSettings?.hotel_email || "reservations@riverfrontheaven.com";
      const hotelAddress =
        options.hotelSettings?.hotel_address || "Kuda Oya Road, Udawalawe, Sri Lanka";

      // 1. Top Decorative Brand Bar
      doc.rect(margin, margin, contentWidth, 5).fill(accentColor);

      // 2. Header
      doc.y = margin + 15;
      doc
        .fillColor(primaryColor)
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("RIVER FRONT HEAVEN", margin, doc.y);
      doc
        .fillColor(mutedText)
        .fontSize(8.5)
        .font("Helvetica")
        .text("Boutique Riverside Eco-Cabana & Safari Resort", margin, doc.y + 2);
      doc.text(`${hotelAddress} | Tel: ${hotelPhone} | ${hotelEmail}`, margin, doc.y + 2);

      // Invoice metadata on the top right
      const isFinalized = Boolean(billData.reservation?.isFinalized);
      const invoiceNumber =
        billData.reservation?.invoice?.invoiceNumber ||
        `PRO-FORMA-${billData.reservation?.reference || "DRAFT"}`;
      const docTitle = isFinalized ? "TAX INVOICE" : "GUEST FOLIO / PRO-FORMA";

      const badgeX = pageWidth - margin - 190;
      doc
        .fillColor(primaryColor)
        .fontSize(15)
        .font("Helvetica-Bold")
        .text(docTitle, badgeX, margin + 15, { width: 190, align: "right" });
      doc
        .fillColor(darkText)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text(`Invoice No: ${invoiceNumber}`, badgeX, doc.y + 2, {
          width: 190,
          align: "right",
        });
      doc
        .fillColor(mutedText)
        .fontSize(8.5)
        .font("Helvetica")
        .text(
          `Date: ${formatDate(billData.reservation?.invoice?.issuedAt || new Date())}`,
          badgeX,
          doc.y + 2,
          { width: 190, align: "right" }
        );

      const status = billData.financials?.paymentStatus || "UNPAID";
      let statusBg = "#fef2f2";
      let statusColor = "#991b1b";
      if (status === "PAID") {
        statusBg = "#ecfdf5";
        statusColor = "#065f46";
      } else if (status === "PARTIALLY_PAID") {
        statusBg = "#fffbeb";
        statusColor = "#92400e";
      } else if (status === "OVERPAID") {
        statusBg = "#f5f3ff";
        statusColor = "#5b21b6";
      }

      // Status pill badge
      const pillY = doc.y + 4;
      doc.roundedRect(pageWidth - margin - 90, pillY, 90, 16, 4).fill(statusBg);
      doc
        .fillColor(statusColor)
        .fontSize(8)
        .font("Helvetica-Bold")
        .text(`STATUS: ${status.replace("_", " ")}`, pageWidth - margin - 90, pillY + 4, {
          width: 90,
          align: "center",
        });

      // Divider line
      doc.y = Math.max(doc.y, margin + 74);
      doc.rect(margin, doc.y, contentWidth, 1).fill(borderColor);
      doc.y += 10;

      // 3. Guest & Reservation Info (Two Columns)
      const colWidth = (contentWidth - 14) / 2;
      const infoBoxY = doc.y;

      // Left Column: Billed To
      doc.roundedRect(margin, infoBoxY, colWidth, 75, 4).fill(lightBg);
      doc.rect(margin, infoBoxY, colWidth, 75).stroke(borderColor);

      doc
        .fillColor(primaryColor)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("GUEST / BILLED TO", margin + 10, infoBoxY + 8);
      const guest = billData.reservation?.guest || {};
      doc
        .fillColor(darkText)
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .text(guest.fullName || "Guest Name", margin + 10, infoBoxY + 22);
      doc.font("Helvetica").fillColor(mutedText);
      doc.text(`ID/NIC/Passport: ${guest.idNumber || "N/A"}`, margin + 10, infoBoxY + 34);
      doc.text(`Phone: ${guest.phone || "N/A"}`, margin + 10, infoBoxY + 46);
      doc.text(
        `Address: ${guest.address || (guest.email ? guest.email : "Sri Lanka")}`,
        margin + 10,
        infoBoxY + 58,
        { width: colWidth - 20, ellipsis: true }
      );

      // Right Column: Stay Details
      const rightColX = margin + colWidth + 14;
      doc.roundedRect(rightColX, infoBoxY, colWidth, 75, 4).fill(lightBg);
      doc.rect(rightColX, infoBoxY, colWidth, 75).stroke(borderColor);

      doc
        .fillColor(primaryColor)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("STAY RESERVATION DETAILS", rightColX + 10, infoBoxY + 8);
      const res = billData.reservation || {};
      doc
        .fillColor(darkText)
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .text(
          `Ref: ${res.reference || "N/A"} • ${res.cabana?.name || "The River Cabana"}`,
          rightColX + 10,
          infoBoxY + 22
        );
      doc.font("Helvetica").fillColor(mutedText);
      doc.text(`Package: ${res.package?.name || "Standard Stay"}`, rightColX + 10, infoBoxY + 34);
      doc.text(
        `Stay: ${formatDate(res.checkInDate)} to ${formatDate(res.checkOutDate)} (${res.nights || 1} nights)`,
        rightColX + 10,
        infoBoxY + 46
      );
      doc.text(
        `Issued By: ${billData.reservation?.invoice?.issuedBy?.fullName || "Staff Reception Desk"}`,
        rightColX + 10,
        infoBoxY + 58
      );

      doc.y = infoBoxY + 85;

      // 4. Itemized Charges Table
      const tableHeaders = [
        { label: "Description / Service Details", x: margin, width: 225, align: "left" },
        { label: "Category", x: margin + 225, width: 85, align: "left" },
        { label: "Qty / Units", x: margin + 310, width: 60, align: "center" },
        { label: "Unit Rate", x: margin + 370, width: 65, align: "right" },
        { label: "Amount", x: margin + 435, width: 80, align: "right" },
      ];

      const drawTableHeader = (y) => {
        doc.rect(margin, y, contentWidth, 20).fill("#1e293b");
        doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
        tableHeaders.forEach((col) => {
          doc.text(col.label, col.x + (col.align === "right" ? -5 : 5), y + 6, {
            width: col.width,
            align: col.align,
          });
        });
      };

      drawTableHeader(doc.y);
      let rowY = doc.y + 20;

      // Compile Line Items
      const items = [];

      // Accommodation Item
      if (billData.charges?.accommodation) {
        const acc = billData.charges.accommodation;
        items.push({
          desc: acc.description,
          category: "Accommodation",
          qty: `${acc.nights} night(s)`,
          rate: formatCurrency(acc.nightlyRate),
          amount: acc.amount,
        });
      }

      // Activity Bookings
      (billData.charges?.activities || []).forEach((act) => {
        items.push({
          desc: `${act.name} (${formatDateTime(act.scheduledAt)})`,
          category: "Activity",
          qty: `${act.participants} pax`,
          rate: formatCurrency(act.unitPrice),
          amount: act.amount,
        });
      });

      // Food & Beverage Orders
      (billData.charges?.foodBeverage || []).forEach((fnb) => {
        items.push({
          desc: `Dining: ${fnb.itemsSummary || "F&B Order #" + fnb.sourceId}`,
          category: "Food & Bev",
          qty: "1 order",
          rate: formatCurrency(fnb.amount),
          amount: fnb.amount,
        });
      });

      // Bar Orders
      (billData.charges?.bar || []).forEach((bar) => {
        items.push({
          desc: bar.name,
          category: "Bar Order",
          qty: `${bar.quantity} item(s)`,
          rate: formatCurrency(bar.unitPrice),
          amount: bar.amount,
        });
      });

      // Bill Adjustments
      (billData.charges?.adjustments || []).forEach((adj) => {
        items.push({
          desc: `${adj.description}${adj.reason ? " - " + adj.reason : ""}`,
          category: adj.amount < 0 ? "Discount" : "Surcharge",
          qty: "1",
          rate: formatCurrency(adj.amount),
          amount: adj.amount,
        });
      });

      // Render items
      items.forEach((item, index) => {
        // Check for page overflow
        if (rowY + 22 > pageHeight - margin - 150) {
          doc.addPage();
          rowY = margin;
          drawTableHeader(rowY);
          rowY += 20;
        }

        const bg = index % 2 === 0 ? "#ffffff" : "#f8fafc";
        doc.rect(margin, rowY, contentWidth, 20).fill(bg);
        doc.rect(margin, rowY, contentWidth, 20).stroke("#f1f5f9");

        doc.font("Helvetica").fontSize(8).fillColor(darkText);
        doc.text(item.desc, margin + 5, rowY + 5, { width: 215, ellipsis: true });
        doc.text(item.category, margin + 230, rowY + 5, { width: 80, ellipsis: true });
        doc.text(item.qty, margin + 310, rowY + 5, { width: 60, align: "center" });
        doc.text(item.rate, margin + 370 - 5, rowY + 5, { width: 65, align: "right" });
        doc
          .font("Helvetica-Bold")
          .fillColor(item.amount < 0 ? "#047857" : darkText)
          .text(formatCurrency(item.amount), margin + 435 - 5, rowY + 5, {
            width: 80,
            align: "right",
          });

        rowY += 20;
      });

      doc.y = rowY + 10;

      // Check if bottom section fits on this page, else add page
      if (doc.y + 160 > pageHeight - margin - 40) {
        doc.addPage();
        doc.y = margin;
      }

      // 5. Bottom Section: Payments Recorded (Left) & Financial Summary Totals (Right)
      const bottomSectionY = doc.y;
      const leftColWidth = 260;
      const rightColWidth = 240;
      const rightX = pageWidth - margin - rightColWidth;

      // Left Column: Payments & Settlements Table
      doc
        .fillColor(primaryColor)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("PAYMENTS & SETTLEMENTS", margin, bottomSectionY);
      let payY = bottomSectionY + 15;

      const payments = billData.payments || [];
      if (payments.length === 0) {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(mutedText)
          .text("No payments recorded yet for this stay.", margin, payY);
        payY += 16;
      } else {
        doc.rect(margin, payY, leftColWidth, 16).fill("#e2e8f0");
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor(darkText);
        doc.text("Date", margin + 4, payY + 4, { width: 55 });
        doc.text("Method", margin + 60, payY + 4, { width: 75 });
        doc.text("Type", margin + 138, payY + 4, { width: 50 });
        doc.text("Amount", margin + 190, payY + 4, { width: 65, align: "right" });
        payY += 16;

        payments.forEach((p) => {
          doc.rect(margin, payY, leftColWidth, 16).stroke("#f1f5f9");
          doc.font("Helvetica").fontSize(7.5).fillColor(darkText);
          doc.text(formatDate(p.paidAt), margin + 4, payY + 4, { width: 55 });
          doc.text(p.method + (p.note ? ` (${p.note})` : ""), margin + 60, payY + 4, {
            width: 75,
            ellipsis: true,
          });
          doc.text(p.isAdvance ? "Advance" : "Settlement", margin + 138, payY + 4, { width: 50 });
          doc
            .font("Helvetica-Bold")
            .fillColor("#047857")
            .text(formatCurrency(p.amount), margin + 190, payY + 4, {
              width: 65,
              align: "right",
            });
          payY += 16;
        });
      }

      // Right Column: Financial Summary Card
      const f = billData.financials || {};
      const cardHeight =
        110 + (f.serviceChargeAmount > 0 ? 14 : 0) + (f.taxAmount > 0 ? 14 : 0);
      doc.roundedRect(rightX, bottomSectionY, rightColWidth, cardHeight, 4).fill(lightBg);
      doc.rect(rightX, bottomSectionY, rightColWidth, cardHeight).stroke(borderColor);

      let totY = bottomSectionY + 8;
      const addTotalLine = (label, val, bold = false, color = darkText, fontSize = 8) => {
        doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize).fillColor(color);
        doc.text(label, rightX + 10, totY, { width: 130 });
        doc.text(val, rightX + 140, totY, { width: 90, align: "right" });
        totY += fontSize + 5;
      };

      addTotalLine("Gross Charges:", formatCurrency(f.grossCharges));
      if (f.serviceChargeAmount > 0) {
        addTotalLine(
          `Service Charge (${f.serviceChargePercent}%):`,
          formatCurrency(f.serviceChargeAmount)
        );
      }
      if (f.taxAmount > 0) {
        addTotalLine(`Government Tax (${f.taxPercent}%):`, formatCurrency(f.taxAmount));
      }
      addTotalLine("Total Charges:", formatCurrency(f.grandTotal), true, primaryColor, 9);
      doc.rect(rightX + 10, totY, rightColWidth - 20, 1).fill(borderColor);
      totY += 4;
      addTotalLine("Total Payments:", `- ${formatCurrency(f.totalPaid)}`, false, "#047857");
      doc.rect(rightX + 10, totY, rightColWidth - 20, 1).fill(borderColor);
      totY += 4;
      addTotalLine(
        "Net Balance Due:",
        formatCurrency(f.balanceDue),
        true,
        f.balanceDue > 0 ? "#b91c1c" : "#047857",
        11
      );

      // 6. Footer & Terms on All Pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const footerY = pageHeight - margin - 35;
        doc.rect(margin, footerY - 8, contentWidth, 1).fill(borderColor);
        doc.font("Helvetica").fontSize(7.5).fillColor(mutedText);
        doc.text(
          "Thank you for choosing River Front Heaven! Standard check-out time is 11:00 AM.",
          margin,
          footerY,
          { align: "center", width: contentWidth }
        );
        doc.text(
          `Official Computer-Generated Document • Page ${i + 1} of ${range.count}`,
          margin,
          footerY + 12,
          { align: "center", width: contentWidth }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  formatCurrency,
  formatDate,
  formatDateTime,
  generateInvoicePdfBuffer,
};
