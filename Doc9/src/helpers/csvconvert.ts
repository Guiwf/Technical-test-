interface CSVRow {
  number: string;
  id: string;
  date: string;
  invoice: string;
}

export function formatToCSV(data: CSVRow[]): string {
  const headers = ['#', 'ID', 'Duedate', 'Invoices'];

  const rows = data.map(row => [
    row.number,
    row.id,
    row.date,
    row.invoice
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}
