import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToCSV = (data: any[], fileName: string) => {
  if (!data || data.length === 0) {
    alert("No data to export.");
    return;
  }

  // Extract headers
  const headers = Object.keys(data[0]);
  
  // Create rows
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      // Handle strings that might contain commas or quotes
      const stringValue = value === null || value === undefined ? '' : String(value);
      return `"${stringValue.replace(/"/g, '""')}"`;
    }).join(',')
  );

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows].join('\n');

  // Create Blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (headers: string[], data: any[][], title: string, fileName: string) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text(title, 14, 22);
  
  // Subtitle/Date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

  // Table
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 35,
    theme: 'striped',
    headStyles: { fillColor: [5, 150, 105] }, // Green color (emerald-600)
    styles: { fontSize: 8 }
  });

  doc.save(`${fileName}.pdf`);
};

export const generatePayslipPDF = (entry: any, employee: any | null, month: string) => {
  const doc = new jsPDF();

  // Header Background
  doc.setFillColor(236, 253, 245); // light green bg (emerald-50)
  doc.rect(0, 0, 210, 40, 'F');
  
  // Header Text
  doc.setFontSize(22);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text("PAYSLIP", 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("PayPulse Nigeria Ltd.", 105, 28, { align: "center" });
  doc.text(`Pay Period: ${month}`, 105, 34, { align: "center" });

  // Info Section
  doc.setTextColor(0);
  doc.setFontSize(10);
  
  doc.text("Employee Details", 14, 50);
  doc.setLineWidth(0.5);
  doc.setDrawColor(200);
  doc.line(14, 52, 60, 52);

  doc.setFontSize(9);
  doc.text(`Name: ${entry.employeeName}`, 14, 60);
  doc.text(`Staff ID: ${entry.staffId}`, 14, 66);
  
  if (employee) {
      doc.text(`Department: ${employee.department}`, 14, 72);
      doc.text(`Designation: ${employee.designation}`, 14, 78);
      
      // Right side details
      doc.text(`PFA: ${employee.pfa}`, 120, 60);
      doc.text(`RSA: ${employee.rsaNumber}`, 120, 66);
      doc.text(`Bank: GTBank`, 120, 72); // Mock
      doc.text(`Account: *******123`, 120, 78); // Mock
  }

  // Earnings Table
  autoTable(doc, {
    startY: 85,
    head: [['Earnings', 'Amount (NGN)']],
    body: [
        ['Basic Salary', entry.basic.toLocaleString(undefined, {minimumFractionDigits: 2})],
        ['Housing Allowance', entry.housing.toLocaleString(undefined, {minimumFractionDigits: 2})],
        ['Transport Allowance', entry.transport.toLocaleString(undefined, {minimumFractionDigits: 2})],
        ['Overtime', entry.overtime.toLocaleString(undefined, {minimumFractionDigits: 2})],
        ['Bonuses', entry.bonuses.toLocaleString(undefined, {minimumFractionDigits: 2})],
        [{content: 'Total Earnings', styles: {fontStyle: 'bold'}}, {content: entry.grossIncome.toLocaleString(undefined, {minimumFractionDigits: 2}), styles: {fontStyle: 'bold'}}]
    ],
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 1: { halign: 'right' } }
  });

  // Deductions Table
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Deductions', 'Amount (NGN)']],
    body: [
        ['Tax (PAYE)', entry.taxPAYE.toLocaleString(undefined, {minimumFractionDigits: 2})],
        ['Pension (Employee)', entry.pensionEmployee.toLocaleString(undefined, {minimumFractionDigits: 2})],
        ['Loan Repayment', entry.loanDeduction.toLocaleString(undefined, {minimumFractionDigits: 2})],
        [{content: 'Total Deductions', styles: {fontStyle: 'bold'}}, {content: entry.totalDeductions.toLocaleString(undefined, {minimumFractionDigits: 2}), styles: {fontStyle: 'bold', textColor: [220, 38, 38]}}]
    ],
    theme: 'grid',
    headStyles: { fillColor: [185, 28, 28], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 1: { halign: 'right' } }
  });

  // Net Pay Box
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFillColor(236, 253, 245); // light green bg
  doc.rect(14, finalY - 5, 182, 15, 'F');
  
  doc.setFontSize(12);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.setFont("helvetica", "bold");
  doc.text("NET PAY:", 20, finalY + 4);
  doc.text(`NGN ${entry.netPay.toLocaleString(undefined, {minimumFractionDigits: 2})}`, 190, finalY + 4, { align: "right" });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.setFont("helvetica", "normal");
  doc.text("System generated payslip. Valid without signature.", 105, 280, { align: "center" });

  const safeName = entry.employeeName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`Payslip_${safeName}_${month}.pdf`);
};