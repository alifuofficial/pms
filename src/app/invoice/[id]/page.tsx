import { prisma } from "@/lib/prisma";
import { getSystemSettings, getEffectiveCalendar } from "@/lib/actions/settings";
import { formatSystemDate } from "@/lib/calendar";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Printer, Building2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { headers } from "next/headers";
import QRCode from "react-qr-code";

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const [settings, calendarType] = await Promise.all([
    getSystemSettings(),
    getEffectiveCalendar()
  ]);

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      tenant: true,
      lease: {
        include: {
          unit: {
            include: {
              property: true
            }
          }
        }
      }
    }
  });

  if (!payment) return <div>Invoice not found.</div>;

  // Security check: Only Admins, Accountants, or the tenant themselves can view
  if (
    session.user.role !== "ADMIN" && 
    session.user.role !== "ACCOUNTANT" && 
    session.user.id !== payment.tenantId
  ) {
    redirect("/auth/login");
  }

  const invoiceId = `INV-${payment.id.slice(0, 8).toUpperCase()}`;

  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const verifyUrl = `${protocol}://${host}/invoice/${id}/verify`;

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center py-10 font-sans">
      
      <div className="fixed top-6 right-6 flex gap-3 print:hidden">
        <button 
          id="print-btn"
          className="bg-slate-900 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-colors"
        >
          <Printer size={16} /> Print Document
        </button>
      </div>

      {/* A4 Document Area */}
      <div className="bg-white w-[210mm] min-h-[297mm] shadow-xl rounded-xl overflow-hidden print:w-full print:h-full print:shadow-none print:rounded-none">
        
        {/* Header Block */}
        <div className="p-12 border-b-8 border-slate-900 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <Building2 size={32} className="text-slate-300" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {settings.organizationName || settings.systemName}
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-1">{settings.address || "Corporate Office"}</p>
              <div className="flex gap-4 mt-2 text-xs font-semibold text-slate-400">
                {settings.phone && <span>P: {settings.phone}</span>}
                {settings.supportEmail && <span>E: {settings.supportEmail}</span>}
                {settings.tinNumber && <span>TIN: {settings.tinNumber}</span>}
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col items-end space-y-1">
            <h2 className="text-4xl font-black text-slate-200 tracking-tighter uppercase">Invoice</h2>
            <p className="text-lg font-bold text-slate-900 mt-2">{invoiceId}</p>
            <Badge variant="outline" className={`mt-2 font-bold px-3 py-1 uppercase tracking-wider ${
              payment.status === "APPROVED" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : 
              payment.status === "REJECTED" ? "bg-red-50 text-red-600 border-red-200" : 
              "bg-amber-50 text-amber-600 border-amber-200"
            }`}>
              {payment.status === "APPROVED" ? "Paid In Full" : payment.status === "REJECTED" ? "Voided" : "Unpaid / Pending"}
            </Badge>
            <div className="mt-4 p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
              <QRCode value={verifyUrl} size={80} level="M" />
              <p className="text-[8px] font-bold text-center text-slate-400 mt-1 uppercase tracking-widest">Scan to Verify</p>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="p-12 grid grid-cols-2 gap-12">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 pb-2">Billed To</h3>
            <div>
              <p className="text-lg font-bold text-slate-900">{payment.tenant.name}</p>
              <p className="text-sm font-medium text-slate-500 mt-1">{payment.tenant.email}</p>
              {payment.tenant.phoneNumber && (
                <p className="text-sm font-medium text-slate-500">Phone: {payment.tenant.phoneNumber}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 pb-2">Invoice Details</h3>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <span className="font-medium text-slate-500">Issue Date:</span>
              <span className="font-bold text-slate-900 text-right">{formatSystemDate(new Date(payment.createdAt), calendarType)}</span>
              
              <span className="font-medium text-slate-500">Due Date:</span>
              <span className="font-bold text-slate-900 text-right">{formatSystemDate(new Date(payment.dueDate), calendarType)}</span>
              
              <span className="font-medium text-slate-500">Payment Type:</span>
              <span className="font-bold text-slate-900 text-right capitalize">{payment.type.toLowerCase()}</span>
            </div>
          </div>
        </div>

        {/* Invoice Items Table */}
        <div className="px-12">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-y border-slate-200">
                <th className="py-4 text-xs font-black text-slate-400 uppercase tracking-widest w-1/2">Description</th>
                <th className="py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Unit</th>
                <th className="py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-6">
                  <p className="font-bold text-slate-900">Lease Rental Charge</p>
                  <p className="text-sm font-medium text-slate-500 mt-1">Property: {payment.lease?.unit?.property?.name || "N/A"}</p>
                </td>
                <td className="py-6 text-center font-bold text-slate-700">
                  {payment.lease?.unit?.unitNumber || "N/A"}
                </td>
                <td className="py-6 text-right font-black text-slate-900">
                  {settings.currency} {payment.amount.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="p-12 flex justify-end">
          <div className="w-1/2 space-y-4">
            <div className="flex justify-between items-center text-sm font-medium text-slate-500">
              <span>Subtotal</span>
              <span>{settings.currency} {payment.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-medium text-slate-500">
              <span>Tax / VAT (0%)</span>
              <span>{settings.currency} 0.00</span>
            </div>
            <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-center">
              <span className="text-xl font-black text-slate-900">Total Due</span>
              <span className="text-2xl font-black text-slate-900">{settings.currency} {payment.amount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer / Notes */}
        <div className="p-12 mt-auto">
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Terms & Notes</h4>
            <p className="text-sm font-medium text-slate-500 leading-relaxed">
              Please ensure payment is made by the due date. Late payments may be subject to additional fees as per the lease agreement. If you have already made the payment and it is marked as pending, please allow 1-2 business days for accountant verification.
            </p>
          </div>
          <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-8">
            Generated by {settings.systemName}
          </p>
        </div>

      </div>

      {/* Embedded Script for Print Button */}
      <script dangerouslySetInnerHTML={{__html: `
        document.getElementById('print-btn').addEventListener('click', function() {
          window.print();
        });
      `}} />
    </div>
  );
}
