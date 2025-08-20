
import type { Registration } from './types';

const keyToHeaderMap: { [K in keyof Omit<Registration, 'id'>]: string } = {
  name: "Name",
  iitpNo: "IITP No",
  organization: "Organization",
  submissionTime: "Submission Time",
}

export function exportToCsvV2(registrations: Registration[], fileName: string = 'registrations.csv') {
  if (registrations.length === 0) {
    console.warn("No data to export.");
    return;
  }

  const headers = Object.values(keyToHeaderMap);
  const keys = Object.keys(keyToHeaderMap) as (keyof Omit<Registration, 'id'>)[];

  const csvRows = registrations.map(registration => {
    return keys.map(key => {
      let value: any = registration[key];
      if (key === 'submissionTime' && value) {
        value = new Date(value).toLocaleString();
      }
      const stringValue = String(value || '');
      // Handle values that contain commas, quotes, or newlines
      if (/[",\n\r]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });

  const csvContent = [headers.join(','), ...csvRows].join('\r\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
