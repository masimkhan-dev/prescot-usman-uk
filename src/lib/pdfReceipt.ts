import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { formatGBP } from "@/lib/utils";
import type { InvoiceData } from "@/components/dashboard/Invoice";

export async function generateReceiptPDF(
  invoice: InvoiceData,
  businessInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    footer?: string;
  }
): Promise<{ blob: Blob; file: File; fileName: string }> {
  const fileName = `Prescot-Receipt-${invoice.number.replace(/[^a-zA-Z0-9-]/g, "")}.pdf`;

  // Create off-screen HTML element styled like an 80mm retail receipt
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = "320px"; // 80mm width target at 96dpi
  container.style.backgroundColor = "#ffffff";
  container.style.color = "#000000";
  container.style.padding = "16px";
  container.style.fontFamily = "'Courier New', Courier, monospace, Arial, sans-serif";
  container.style.fontSize = "11px";
  container.style.lineHeight = "1.35";
  container.style.boxSizing = "border-box";

  const subtotal =
    invoice.subtotal ??
    invoice.lines.reduce((acc, l) => acc + (l.total || l.quantity * l.unit_price), 0) +
      (invoice.labour || 0);
  const discount = invoice.discount || 0;
  const grandTotal = invoice.total;
  const amountPaid = invoice.amountPaid ?? (invoice.paid ? grandTotal : 0);
  const balanceDue = invoice.balanceDue ?? Math.max(0, grandTotal - amountPaid);
  const isPaidInFull = balanceDue <= 0 && (invoice.paid || amountPaid >= grandTotal);

  const customerName = invoice.customer?.name || "Walk-in Customer";
  const customerPhone = invoice.customer?.phone || "";

  const itemsHtml = invoice.lines
    .map(
      (l) => `
      <div style="margin-bottom: 6px; font-size: 11px;">
        <div style="font-weight: 700; word-break: break-word; color: #000000;">${l.name}</div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #111111; margin-top: 2px;">
          <span>${l.quantity} × ${formatGBP(l.unit_price)}</span>
          <span style="font-weight: 700; color: #000000;">${formatGBP(l.total)}</span>
        </div>
      </div>
    `
    )
    .join("");

  const labourHtml =
    invoice.labour && invoice.labour > 0
      ? `
      <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px;">
        <span style="font-weight: 700;">Labour Charge</span>
        <span style="font-weight: 700;">${formatGBP(invoice.labour)}</span>
      </div>
    `
      : "";

  container.innerHTML = `
    <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
      <div style="font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.3px;">${businessInfo.name}</div>
      <div style="font-size: 9.5px; color: #111; margin-top: 3px;">${businessInfo.address}</div>
      <div style="font-size: 9.5px; color: #111; margin-top: 1px;">Tel: ${businessInfo.phone}</div>
      <div style="font-size: 9.5px; color: #111; margin-top: 1px;">${businessInfo.email}</div>
    </div>

    <div style="text-align: center; font-size: 12px; font-weight: 900; text-transform: uppercase; margin-bottom: 8px;">
      ${invoice.kind === "sale" ? "SALES RECEIPT" : "REPAIR INVOICE"}
    </div>

    <div style="font-size: 10px; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 10px;">
      <div style="display: flex; justify-content: space-between;">
        <span><strong>Invoice #:</strong> ${invoice.number}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 2px;">
        <span><strong>Date:</strong> ${invoice.date}</span>
      </div>
      <div style="margin-top: 2px;">
        <strong>Customer:</strong> ${customerName} ${customerPhone ? `(${customerPhone})` : ""}
      </div>
      ${invoice.device ? `<div style="margin-top: 2px;"><strong>Device:</strong> ${invoice.device}</div>` : ""}
      ${invoice.issue ? `<div style="margin-top: 2px;"><strong>Issue:</strong> ${invoice.issue}</div>` : ""}
    </div>

    <div style="border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
      ${itemsHtml}
      ${labourHtml}
    </div>

    <div style="font-size: 10.5px; margin-bottom: 10px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>Subtotal</span>
        <span>${formatGBP(subtotal)}</span>
      </div>
      ${
        discount > 0
          ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>Discount</span>
          <span>-${formatGBP(discount)}</span>
        </div>
      `
          : ""
      }
      <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; margin: 4px 0;">
        <span>TOTAL</span>
        <span>${formatGBP(grandTotal)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 10px;">
        <span>Payment Method</span>
        <span style="text-transform: uppercase; font-weight: 700;">${(invoice.paymentMethod || "CASH").replace("_", " ")}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 10px;">
        <span>Amount Paid</span>
        <span>${formatGBP(amountPaid)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 10px;">
        <span>Balance Due</span>
        <span>${formatGBP(balanceDue)}</span>
      </div>
    </div>

    <div style="text-align: center; border: 1.5px solid #000; padding: 4px; font-weight: 900; font-size: 11px; margin-bottom: 12px; text-transform: uppercase;">
      ${isPaidInFull ? "PAID IN FULL" : "BALANCE OUTSTANDING"}
    </div>

    <div style="text-align: center; font-size: 9.5px; color: #111; border-top: 1px dashed #000; padding-top: 8px;">
      <div style="font-weight: 700;">Thank you for choosing</div>
      <div style="font-weight: 900; margin-top: 1px;">Prescot Mobiles & Computer Services</div>
      <div style="margin-top: 4px; font-size: 8.5px;">Mobile • Laptop • Tablet • Gaming</div>
      <div style="font-size: 8.5px;">Repairs & Accessories</div>
      <div style="margin-top: 6px; font-size: 8px; font-style: italic;">Keep this receipt as proof of purchase.</div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = 80; // 80mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, Math.max(imgHeight, 100)],
    });

    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

    const pdfBlob = pdf.output("blob");
    const file = new File([pdfBlob], fileName, { type: "application/pdf" });

    return { blob: pdfBlob, file, fileName };
  } finally {
    document.body.removeChild(container);
  }
}
