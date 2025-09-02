import type { LocalImportFileHandle } from '@milaboratories/pl-model-common';
import { getRawPlatformaInstance } from '@platforma-sdk/model';
import { computedAsync } from '@vueuse/core';
import { parse } from 'csv-parse/browser/esm';
import type { MaybeRefOrGetter } from 'vue';
import { toValue } from 'vue';
import type { ValueType } from '../types/spec';

export type XsvMetadata = {
  types: Record<string, ValueType>;
  header: string[];
  delimiter: string;
};

export function useMetadataXsv(_fileHandle: MaybeRefOrGetter<undefined | LocalImportFileHandle>, _delimiter: MaybeRefOrGetter<undefined | string>) {
  return computedAsync(async (): Promise<undefined | XsvMetadata> => {
    const fileHandle = toValue(_fileHandle) as LocalImportFileHandle;
    const delimiter = toValue(_delimiter);

    if (!fileHandle) {
      return undefined;
    }

    const result = await parseLocalXsvFile({ fileHandle, delimiter, linesLimit: 30 });
    const types = getColumnTypes(result.header, result.rows);

    return {
      types,
      header: result.header,
      delimiter: result.delimiter,
    };
  }, undefined);
}

export const RECORD_DELIMETER = String.fromCharCode(30);
export const UNIT_DELIMITER = String.fromCharCode(31);
export function detectDelimiter(sampleText: string, delimiters = [',', '\t', '|', ';', RECORD_DELIMETER, UNIT_DELIMITER]) {
  const lines = sampleText.split('\n');
  const delimitersLineHistory = new Map<string, number[]>();

  for (const line of lines) {
    for (const delimiter of delimiters) {
      const parts = line.split(delimiter);
      const history = delimitersLineHistory.get(delimiter) || [];
      history.push(parts.length);
      delimitersLineHistory.set(delimiter, history);
    }
  }

  // Find the delimiter with the most consistent column counts
  return Array.from(delimitersLineHistory.entries()).reduce((acc, [delimiter, history]) => {
    if (history.length === 0) return acc;

    const sorted = history.sort((a, b) => a - b);
    const first = sorted[0];
    let stable = true;
    let current = first;
    let rating = 1;
    let maxRating = 0;

    for (let i = 1; i < sorted.length; i++) {
      stable = stable && current === sorted[i];
      if (current === sorted[i]) {
        rating++;
      } else {
        current = sorted[i];
        rating = 1;
        maxRating = Math.max(maxRating, rating);
      }
    }
    maxRating = Math.max(maxRating, rating) * (stable ? current : 1);

    const moreStable = !acc.stable && stable;
    const sameStable = acc.stable === stable;
    const moreRating = sameStable && maxRating > acc.max;

    if (moreStable || (sameStable && moreRating)) {
      acc.max = maxRating;
      acc.stable = stable;
      acc.delimiter = delimiter;
    }
    return acc;
  }, { delimiter: '', max: 0, stable: false }).delimiter;
}

export async function parseLocalXsvFile<T extends object>({ fileHandle, delimiter, linesLimit, batchSizeReading }: {
  fileHandle: LocalImportFileHandle;
  linesLimit: number;
  delimiter?: string;
  batchSizeReading?: number;
}): Promise<{ header: (keyof T)[]; rows: T[]; delimiter: string }> {
  const text = await readXsv(fileHandle, linesLimit, batchSizeReading).catch((err) => {
    throw new Error('Error while reading file content', { cause: err });
  });

  delimiter = delimiter ?? detectDelimiter(text);

  const data = await parseXsv<T>(text, delimiter).catch((err) => {
    throw new Error('Error while parsing XSV', { cause: err });
  });

  return {
    header: data.header,
    rows: data.rows,
    delimiter,
  };
}

function readXsv(fileHandle: LocalImportFileHandle, linesLimit: number = 30, chunkSize: number = 8192) {
  const driver = getRawPlatformaInstance().lsDriver;
  const decoder = new TextDecoder();

  return reading(false, 0);

  function reading(done: boolean, iteration: number, textBuffer: string = ''): Promise<string> {
    if (done) {
      return Promise.resolve(textBuffer);
    }

    return driver.getLocalFileContent(fileHandle, { offset: iteration * chunkSize, length: chunkSize }).then(
      (fileBuffer) => {
        if (fileBuffer.length === 0) {
          return reading(true, iteration + 1);
        }

        textBuffer += decoder.decode(fileBuffer, { stream: true });

        if ((textBuffer.match(/\n/g)?.length ?? 0) > linesLimit) {
          textBuffer = textBuffer.substring(0, textBuffer.lastIndexOf('\n'));
          return reading(true, iteration + 1, textBuffer);
        }

        return reading(false, iteration + 1, textBuffer);
      },
    );
  };
}

function parseXsv<T>(text: string, delimiter: string): Promise<{ header: (keyof T)[]; rows: T[] }> {
  return new Promise((resolve, reject) => {
    const parser = parse({
      columns: true,
      delimiter,
      autoParse: true,
    });
    const rows: T[] = [];
    let header: null | string[] = null;

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        if (!header) header = Object.keys(record);
        rows.push(record);
      }
    });

    parser.on('error', (err) => {
      reject(new Error('Error while parsing CSV', { cause: err }));
    });

    parser.on('end', () => {
      resolve({ header: (header ?? []) as (keyof T)[], rows });
    });

    for (const line of text.split('\n')) {
      parser.write(line + '\n');
    }

    parser.end();
  });
}

export function getColumnTypes<T extends object>(header: string[], rows: T[]): Record<string, ValueType> {
  const columnTypes: Record<string, ValueType> = {};

  for (const columnName of header) {
    let detectedType: ValueType = 'String';

    // Analyze values in this column to determine the most appropriate type
    for (const row of rows) {
      const value = (row as Record<string, unknown>)[columnName];

      if (value === null || value === undefined || value === '') {
        continue; // Skip empty values
      }

      const stringValue = String(value).trim();
      if (stringValue === '') continue;

      // Check if it's an integer
      if (/^-?\d+$/.test(stringValue)) {
        const numValue = parseInt(stringValue, 10);
        if (detectedType === 'String') {
          detectedType = (numValue >= -2147483648 && numValue <= 2147483647) ? 'Int' : 'Long';
        } else if (detectedType === 'Int' && (numValue < -2147483648 || numValue > 2147483647)) {
          detectedType = 'Long';
        }
        continue;
      }

      // Check if it's a float/double
      if (/^-?\d*\.?\d+([eE][+-]?\d+)?$/.test(stringValue) && !isNaN(Number(stringValue))) {
        const numValue = Number(stringValue);
        if (detectedType === 'String' || detectedType === 'Int' || detectedType === 'Long') {
          // Use Float for smaller precision numbers, Double for higher precision
          detectedType = (Math.abs(numValue) < 3.4e38 && numValue.toString().length <= 7) ? 'Float' : 'Double';
        } else if (detectedType === 'Float' && (Math.abs(numValue) >= 3.4e38 || numValue.toString().length > 7)) {
          detectedType = 'Double';
        }
        continue;
      }

      // If we encounter any non-numeric value, default to String
      detectedType = 'String';
      break;
    }

    columnTypes[columnName] = detectedType;
  }

  return columnTypes;
}
