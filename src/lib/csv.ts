/**
 * Parses a basic CSV string into an array of objects based on headers.
 * Note: This is a simple parser and doesn't handle complex quoted newlines perfectly,
 * but it's sufficient for basic data import like names, emails, and numbers.
 */
export function parseCSV(csvString: string): any[] {
  if (!csvString || !csvString.trim()) return [];

  const lines = csvString.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length < 2) return []; // Only headers or empty

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const result: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values: string[] = [];
    let curVal = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(curVal);
        curVal = '';
      } else {
        curVal += char;
      }
    }
    values.push(curVal); // push last value

    const obj: any = {};
    for (let j = 0; j < headers.length; j++) {
      let val = values[j] ? values[j].trim() : "";
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1).replace(/""/g, '"');
      }
      obj[headers[j]] = val;
    }
    result.push(obj);
  }

  return result;
}

/**
 * Generates a CSV string from an array of objects.
 */
export function generateCSV(data: any[], headers: string[]): string {
  if (!data || data.length === 0) return headers.join(",") + "\n";

  const rows = data.map(item => {
    return headers.map(header => {
      let val = item[header];
      if (val === null || val === undefined) val = "";
      
      const strVal = String(val);
      // Quote strings that contain commas, newlines, or quotes
      if (strVal.includes(",") || strVal.includes('"') || strVal.includes("\n")) {
        return `"${strVal.replace(/"/g, '""')}"`;
      }
      return strVal;
    }).join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}
