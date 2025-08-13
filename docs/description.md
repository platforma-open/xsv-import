# XSV Import Block

A comprehensive CSV/TSV file import block for the Platforma that provides advanced data parsing, type inference, and configuration capabilities.

## Core Features

### File Processing
- **File Support**: CSV (.csv) and TSV (.tsv) files
- **Type Detection**: `ui/src/hooks/useMetadataXsv.ts:111-160` - Automatic column type inference (Int, Long, Float, Double, String)
- **Chunked Reading**: `ui/src/hooks/useMetadataXsv.ts:68-108` - Efficient streaming for large files
- **Metadata Extraction**: Header analysis and preview data sampling

### Data Configuration
- **Axes Configuration**: Define dimensional axes from CSV columns
- **Column Mapping**: Map CSV columns to typed data columns
- **Preprocessing**: Regex-based filtering and value transformation
- **Validation**: NA value handling and data type validation

### Advanced Options
- **Separators**: Configurable field separators (comma, tab, custom)
- **Comment Lines**: Skip lines starting with specific prefixes
- **Empty Lines**: Optional empty line handling
- **Duplicates**: Column label duplicate resolution
- **Partitioning**: Data partitioning support
- **Storage Formats**: Binary or JSON storage options
