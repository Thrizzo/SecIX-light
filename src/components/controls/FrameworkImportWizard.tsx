import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, Wand2, Check, AlertCircle, ArrowRight, ArrowLeft, Info } from 'lucide-react';
import { useCreateFramework, useCreateFrameworkControls, SECURITY_FUNCTIONS } from '@/hooks/useControlFrameworks';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface FrameworkImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  [key: string]: string;
}

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  aiReasoning?: string;
}

interface ParseError {
  row?: number;
  message: string;
}

const TARGET_FIELDS = [
  { key: 'control_code', label: 'Control Code', required: false },
  { key: 'title', label: 'Title', required: true },
  { key: 'description', label: 'Description', required: false },
  { key: 'domain', label: 'Domain/Family', required: false },
  { key: 'subcategory', label: 'Subcategory', required: false },
  { key: 'control_type', label: 'Control Type', required: false },
  { key: 'guidance', label: 'Guidance', required: false },
  { key: 'implementation_guidance', label: 'Implementation Guidance', required: false },
  { key: 'reference_links', label: 'References', required: false },
  { key: 'security_function', label: 'Security Function (NIST CSF)', required: false },
];

const STEP_LABELS = ['Upload', 'Framework Details', 'Map Fields', 'Preview & Import'];

export function FrameworkImportWizard({ open, onOpenChange }: FrameworkImportWizardProps) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [fileType, setFileType] = useState<'csv' | 'excel' | 'json' | null>(null);
  const [frameworkDetails, setFrameworkDetails] = useState({
    name: '',
    version: '',
    publisher: '',
    description: '',
    default_id_prefix: '',
  });

  const createFramework = useCreateFramework();
  const createControls = useCreateFrameworkControls();

  // Parse CSV using PapaParse for accurate handling of quoted fields, newlines, etc.
  const parseCSV = (text: string): { columns: string[]; rows: ParsedRow[]; errors: ParseError[] } => {
    const errors: ParseError[] = [];
    
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim(),
      delimitersToGuess: [',', '\t', ';', '|'],
    });

    if (result.errors.length > 0) {
      result.errors.forEach(err => {
        errors.push({ row: err.row, message: err.message });
      });
    }

    const columns = result.meta.fields || [];
    const rows = result.data.filter(row => {
      // Filter out completely empty rows
      return Object.values(row).some(val => val && String(val).trim() !== '');
    });

    return { columns, rows, errors };
  };

  // Parse Excel files using xlsx library
  const parseExcel = (buffer: ArrayBuffer): { columns: string[]; rows: ParsedRow[]; errors: ParseError[] } => {
    const errors: ParseError[] = [];
    
    try {
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
        defval: '',
        raw: false, // Convert all values to strings
      });

      if (jsonData.length === 0) {
        errors.push({ message: 'No data found in Excel file' });
        return { columns: [], rows: [], errors };
      }

      // Get columns from first row keys
      const columns = Object.keys(jsonData[0]).map(col => col.trim());
      
      // Convert all values to strings and trim
      const rows: ParsedRow[] = jsonData.map(row => {
        const cleanRow: ParsedRow = {};
        columns.forEach(col => {
          const value = row[col];
          cleanRow[col] = value != null ? String(value).trim() : '';
        });
        return cleanRow;
      }).filter(row => Object.values(row).some(val => val !== ''));

      return { columns, rows, errors };
    } catch (err) {
      errors.push({ message: `Failed to parse Excel file: ${err instanceof Error ? err.message : 'Unknown error'}` });
      return { columns: [], rows: [], errors };
    }
  };

  // Parse JSON files
  const parseJSON = (text: string): { columns: string[]; rows: ParsedRow[]; errors: ParseError[] } => {
    const errors: ParseError[] = [];
    
    try {
      const data = JSON.parse(text);
      let rows: Record<string, any>[] = [];
      
      // Handle different JSON structures
      if (Array.isArray(data)) {
        rows = data;
      } else if (data.controls && Array.isArray(data.controls)) {
        rows = data.controls;
      } else if (data.data && Array.isArray(data.data)) {
        rows = data.data;
      } else {
        errors.push({ message: 'JSON must be an array or contain a "controls" or "data" array' });
        return { columns: [], rows: [], errors };
      }

      if (rows.length === 0) {
        errors.push({ message: 'No data found in JSON file' });
        return { columns: [], rows: [], errors };
      }

      // Get all unique columns across all rows
      const columnsSet = new Set<string>();
      rows.forEach(row => {
        Object.keys(row).forEach(key => columnsSet.add(key));
      });
      const columns = Array.from(columnsSet);

      // Normalize rows
      const normalizedRows: ParsedRow[] = rows.map(row => {
        const cleanRow: ParsedRow = {};
        columns.forEach(col => {
          const value = row[col];
          if (value == null) {
            cleanRow[col] = '';
          } else if (typeof value === 'object') {
            cleanRow[col] = JSON.stringify(value);
          } else {
            cleanRow[col] = String(value).trim();
          }
        });
        return cleanRow;
      });

      return { columns, rows: normalizedRows, errors };
    } catch (err) {
      errors.push({ message: `Invalid JSON format: ${err instanceof Error ? err.message : 'Unknown error'}` });
      return { columns: [], rows: [], errors };
    }
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setParseErrors([]);
    
    const fileName = uploadedFile.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isJSON = fileName.endsWith('.json');
    
    if (isExcel) {
      setFileType('excel');
      const reader = new FileReader();
      reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        const { columns, rows, errors } = parseExcel(buffer);
        setSourceColumns(columns);
        setParsedData(rows);
        setParseErrors(errors);
        
        // Auto-detect framework name from filename
        const baseName = uploadedFile.name.replace(/\.(xlsx|xls)$/i, '');
        setFrameworkDetails(prev => ({ ...prev, name: baseName }));
      };
      reader.readAsArrayBuffer(uploadedFile);
    } else if (isJSON) {
      setFileType('json');
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const { columns, rows, errors } = parseJSON(text);
        setSourceColumns(columns);
        setParsedData(rows);
        setParseErrors(errors);
        
        const baseName = uploadedFile.name.replace(/\.json$/i, '');
        setFrameworkDetails(prev => ({ ...prev, name: baseName }));
      };
      reader.readAsText(uploadedFile);
    } else {
      setFileType('csv');
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const { columns, rows, errors } = parseCSV(text);
        setSourceColumns(columns);
        setParsedData(rows);
        setParseErrors(errors);
        
        const baseName = uploadedFile.name.replace(/\.(csv|tsv|txt)$/i, '');
        setFrameworkDetails(prev => ({ ...prev, name: baseName }));
      };
      reader.readAsText(uploadedFile);
    }
  }, []);

  const analyzeColumns = useCallback(async () => {
    setIsAnalyzing(true);
    
    // AI-style heuristic mapping based on column names
    const mappings: ColumnMapping[] = [];
    const usedTargets = new Set<string>();

    for (const sourceCol of sourceColumns) {
      const lowerCol = sourceCol.toLowerCase();
      let bestMatch: { field: string; confidence: number; reasoning: string } | null = null;

      // Smart matching logic
      if (lowerCol.includes('code') || lowerCol.includes('id') || lowerCol.includes('number') || lowerCol.includes('identifier')) {
        if (!usedTargets.has('control_code')) {
          bestMatch = { field: 'control_code', confidence: 0.9, reasoning: 'Column name suggests control identifier' };
        }
      } else if (lowerCol.includes('title') || lowerCol.includes('name') || lowerCol === 'control') {
        if (!usedTargets.has('title')) {
          bestMatch = { field: 'title', confidence: 0.95, reasoning: 'Column name indicates control title' };
        }
      } else if (lowerCol.includes('description') || lowerCol.includes('desc') || lowerCol.includes('detail')) {
        if (!usedTargets.has('description')) {
          bestMatch = { field: 'description', confidence: 0.9, reasoning: 'Column contains descriptive text' };
        }
      } else if (lowerCol.includes('domain') || lowerCol.includes('family') || lowerCol.includes('category')) {
        if (!usedTargets.has('domain')) {
          bestMatch = { field: 'domain', confidence: 0.85, reasoning: 'Column represents control grouping' };
        }
      } else if (lowerCol.includes('subcategory') || lowerCol.includes('sub-category') || lowerCol.includes('subcat')) {
        if (!usedTargets.has('subcategory')) {
          bestMatch = { field: 'subcategory', confidence: 0.85, reasoning: 'Column represents sub-grouping' };
        }
      } else if (lowerCol.includes('type')) {
        if (!usedTargets.has('control_type')) {
          bestMatch = { field: 'control_type', confidence: 0.8, reasoning: 'Column indicates control type classification' };
        }
      } else if (lowerCol.includes('guidance') || lowerCol.includes('guide')) {
        if (!usedTargets.has('guidance')) {
          bestMatch = { field: 'guidance', confidence: 0.85, reasoning: 'Column contains guidance information' };
        }
      } else if (lowerCol.includes('implementation') || lowerCol.includes('how to')) {
        if (!usedTargets.has('implementation_guidance')) {
          bestMatch = { field: 'implementation_guidance', confidence: 0.85, reasoning: 'Column contains implementation details' };
        }
      } else if (lowerCol.includes('reference') || lowerCol.includes('link') || lowerCol.includes('url')) {
        if (!usedTargets.has('reference_links')) {
          bestMatch = { field: 'reference_links', confidence: 0.8, reasoning: 'Column contains reference links' };
        }
      } else if (lowerCol.includes('function') || lowerCol.includes('csf') || lowerCol.includes('nist')) {
        if (!usedTargets.has('security_function')) {
          bestMatch = { field: 'security_function', confidence: 0.9, reasoning: 'Column indicates NIST CSF function' };
        }
      }

      if (bestMatch) {
        usedTargets.add(bestMatch.field);
        mappings.push({
          sourceColumn: sourceCol,
          targetField: bestMatch.field,
          confidence: bestMatch.confidence,
          aiReasoning: bestMatch.reasoning,
        });
      } else {
        mappings.push({
          sourceColumn: sourceCol,
          targetField: '',
          confidence: 0,
        });
      }
    }

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setColumnMappings(mappings);
    setIsAnalyzing(false);
  }, [sourceColumns]);

  const updateMapping = (sourceColumn: string, targetField: string) => {
    setColumnMappings(prev => 
      prev.map(m => 
        m.sourceColumn === sourceColumn 
          ? { ...m, targetField, confidence: 1, aiReasoning: 'Manually selected' }
          : m
      )
    );
  };

  const handleImport = async () => {
    try {
      // Create framework first
      const framework = await createFramework.mutateAsync({
        name: frameworkDetails.name,
        version: frameworkDetails.version || undefined,
        publisher: frameworkDetails.publisher || undefined,
        description: frameworkDetails.description || undefined,
        default_id_prefix: frameworkDetails.default_id_prefix || undefined,
      });

      // Transform parsed data using mappings
      const controls = parsedData.map(row => {
        const control: Record<string, string> = { framework_id: framework.id };
        
        for (const mapping of columnMappings) {
          if (mapping.targetField && row[mapping.sourceColumn]) {
            control[mapping.targetField] = row[mapping.sourceColumn];
          }
        }

        // Ensure title exists
        if (!control.title) {
          control.title = control.control_code || 'Untitled Control';
        }

        return control;
      });

      await createControls.mutateAsync(controls as any);
      
      // Reset and close
      resetWizard();
      onOpenChange(false);
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const resetWizard = () => {
    setStep(0);
    setFile(null);
    setParsedData([]);
    setSourceColumns([]);
    setColumnMappings([]);
    setFrameworkDetails({ name: '', version: '', publisher: '', description: '', default_id_prefix: '' });
  };

  const canProceed = () => {
    switch (step) {
      case 0: return parsedData.length > 0;
      case 1: return frameworkDetails.name.trim().length > 0;
      case 2: return columnMappings.some(m => m.targetField === 'title');
      case 3: return true;
      default: return false;
    }
  };

  const getMappedCount = () => columnMappings.filter(m => m.targetField).length;
  const getTitleMapped = () => columnMappings.some(m => m.targetField === 'title');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Control Framework
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-2 py-4">
          {STEP_LABELS.map((label, idx) => (
            <div key={idx} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                idx < step ? 'bg-primary text-primary-foreground' :
                idx === step ? 'bg-primary text-primary-foreground' :
                'bg-muted text-muted-foreground'
              }`}>
                {idx < step ? <Check className="h-4 w-4" /> : idx + 1}
              </div>
              <span className={`text-sm ${idx === step ? 'font-medium' : 'text-muted-foreground'}`}>
                {label}
              </span>
              {idx < STEP_LABELS.length - 1 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>

        <ScrollArea className="flex-1 pr-4">
          {/* Step 0: Upload */}
          {step === 0 && (
            <div className="space-y-6">
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <label className="flex flex-col items-center justify-center gap-4 cursor-pointer py-8">
                    <div className="p-4 rounded-full bg-muted">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Drop your file here or click to browse</p>
                      <p className="text-sm text-muted-foreground">Supports CSV, Excel, JSON formats</p>
                    </div>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </CardContent>
              </Card>

              {file && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      {file.name}
                      <Badge variant="outline" className="ml-2">
                        {fileType === 'excel' ? 'Excel' : fileType === 'json' ? 'JSON' : 'CSV'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {parsedData.length} rows detected with {sourceColumns.length} columns
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {sourceColumns.slice(0, 8).map(col => (
                        <Badge key={col} variant="secondary">{col}</Badge>
                      ))}
                      {sourceColumns.length > 8 && (
                        <Badge variant="outline">+{sourceColumns.length - 8} more</Badge>
                      )}
                    </div>
                    
                    {parseErrors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {parseErrors.length} parsing issue(s) detected:
                          <ul className="mt-2 list-disc pl-4 text-xs">
                            {parseErrors.slice(0, 3).map((err, idx) => (
                              <li key={idx}>
                                {err.row !== undefined ? `Row ${err.row}: ` : ''}{err.message}
                              </li>
                            ))}
                            {parseErrors.length > 3 && (
                              <li>...and {parseErrors.length - 3} more</li>
                            )}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {parsedData.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Data Preview (first 3 rows)</p>
                        <ScrollArea className="h-32 border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {sourceColumns.slice(0, 5).map(col => (
                                  <TableHead key={col} className="text-xs">{col}</TableHead>
                                ))}
                                {sourceColumns.length > 5 && <TableHead className="text-xs">...</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {parsedData.slice(0, 3).map((row, idx) => (
                                <TableRow key={idx}>
                                  {sourceColumns.slice(0, 5).map(col => (
                                    <TableCell key={col} className="text-xs max-w-32 truncate">
                                      {row[col] || '-'}
                                    </TableCell>
                                  ))}
                                  {sourceColumns.length > 5 && <TableCell className="text-xs">...</TableCell>}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 1: Framework Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Framework Name *</Label>
                  <Input
                    id="name"
                    value={frameworkDetails.name}
                    onChange={e => setFrameworkDetails(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., NIST SP 800-53 Rev 5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                      value={frameworkDetails.version}
                      onChange={e => setFrameworkDetails(prev => ({ ...prev, version: e.target.value }))}
                      placeholder="e.g., Rev 5"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="publisher">Publisher</Label>
                    <Input
                      id="publisher"
                      value={frameworkDetails.publisher}
                      onChange={e => setFrameworkDetails(prev => ({ ...prev, publisher: e.target.value }))}
                      placeholder="e.g., NIST"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="prefix">Control ID Prefix</Label>
                  <Input
                    id="prefix"
                    value={frameworkDetails.default_id_prefix}
                    onChange={e => setFrameworkDetails(prev => ({ ...prev, default_id_prefix: e.target.value }))}
                    placeholder="e.g., NIST-"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={frameworkDetails.description}
                    onChange={e => setFrameworkDetails(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the framework..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Map Fields */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {getMappedCount()} of {sourceColumns.length} columns mapped
                  </p>
                  {!getTitleMapped() && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Title field is required
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={analyzeColumns}
                  disabled={isAnalyzing}
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  {isAnalyzing ? 'Analyzing...' : 'Auto-Map Fields'}
                </Button>
              </div>

              {isAnalyzing && <Progress value={60} className="h-2" />}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source Column</TableHead>
                    <TableHead>Maps To</TableHead>
                    <TableHead>Sample Value</TableHead>
                    <TableHead className="w-24">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {columnMappings.map((mapping) => (
                    <TableRow key={mapping.sourceColumn}>
                      <TableCell className="font-medium">{mapping.sourceColumn}</TableCell>
                      <TableCell>
                        <Select
                          value={mapping.targetField || "__skip__"}
                          onValueChange={(value) => updateMapping(mapping.sourceColumn, value === "__skip__" ? "" : value)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select field..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__skip__">-- Skip --</SelectItem>
                            {TARGET_FIELDS.map(field => (
                              <SelectItem key={field.key} value={field.key}>
                                {field.label} {field.required && '*'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                        {parsedData[0]?.[mapping.sourceColumn] || '-'}
                      </TableCell>
                      <TableCell>
                        {mapping.confidence > 0 && (
                          <Badge variant={mapping.confidence > 0.8 ? 'default' : 'secondary'}>
                            {Math.round(mapping.confidence * 100)}%
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Step 3: Preview & Import */}
          {step === 3 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Import Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Framework:</span>
                    <span className="font-medium">{frameworkDetails.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Controls to import:</span>
                    <span className="font-medium">{parsedData.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mapped fields:</span>
                    <span className="font-medium">{getMappedCount()}</span>
                  </div>
                </CardContent>
              </Card>

              <div>
                <h4 className="font-medium mb-2">Preview (first 5 rows)</h4>
                <ScrollArea className="h-64 border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columnMappings.filter(m => m.targetField).map(m => (
                          <TableHead key={m.sourceColumn}>
                            {TARGET_FIELDS.find(f => f.key === m.targetField)?.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 5).map((row, idx) => (
                        <TableRow key={idx}>
                          {columnMappings.filter(m => m.targetField).map(m => (
                            <TableCell key={m.sourceColumn} className="max-w-48 truncate">
                              {row[m.sourceColumn] || '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => step === 0 ? onOpenChange(false) : setStep(s => s - 1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => {
                if (step === 1) analyzeColumns();
                setStep(s => s + 1);
              }}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleImport}
              disabled={createFramework.isPending || createControls.isPending}
            >
              {createFramework.isPending || createControls.isPending ? 'Importing...' : 'Import Framework'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
