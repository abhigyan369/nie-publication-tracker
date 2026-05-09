import { useState, useRef, Fragment } from 'react'
import { useAuth } from '../../context/AuthContext'
import importService from '../../services/import.service'
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  Loader2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'

function ImportPage() {
  const { showToast } = useAuth()
  const fileInputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [expandedRows, setExpandedRows] = useState({})

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) validateAndSetFile(droppedFile)
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) validateAndSetFile(selectedFile)
  }

  const validateAndSetFile = async (f) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    const allowedExtensions = ['.xlsx', '.xls']
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase()

    if (!allowedExtensions.includes(ext)) {
      showToast('Only Excel files (.xlsx, .xls) are allowed', 'error')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      showToast('File size must be less than 10MB', 'error')
      return
    }
    setFile(f)
    setPreviewData(null)
    setImportResult(null)
  }

  const handlePreview = async () => {
    if (!file) return
    setIsLoading(true)
    try {
      const response = await importService.previewImport(file)
      setPreviewData(response.data.data)
      showToast('Preview generated successfully', 'success')
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to preview file', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    if (!file) return
    setIsImporting(true)
    try {
      const response = await importService.executeImport(file)
      setImportResult(response.data.data)
      showToast(`Imported ${response.data.data.imported} records successfully`, 'success')
    } catch (error) {
      showToast(error.response?.data?.message || 'Import failed', 'error')
    } finally {
      setIsImporting(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const response = await importService.downloadTemplate()
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'publication_import_template.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      showToast('Failed to download template', 'error')
    }
  }

  const toggleRow = (rowIndex) => {
    setExpandedRows((prev) => ({ ...prev, [rowIndex]: !prev[rowIndex] }))
  }

  const renderValidation = (record) => {
    const { _validation, _dbDuplicate, _internalDuplicate, _canImport } = record

    return (
      <div className="space-y-2">
        {/* Status badge */}
        <div className="flex items-center gap-2">
          {_canImport ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              <CheckCircle className="h-3 w-3" /> Ready to Import
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
              <XCircle className="h-3 w-3" /> Validation Failed
            </span>
          )}
        </div>

        {/* Errors */}
        {_validation?.errors?.length > 0 && (
          <div className="rounded-lg bg-red-50 p-2">
            <p className="mb-1 text-xs font-semibold text-red-700">Errors:</p>
            <ul className="space-y-0.5">
              {_validation.errors.map((err, i) => (
                <li key={i} className="text-xs text-red-600">
                  Row {err.row}: {err.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {_validation?.warnings?.length > 0 && (
          <div className="rounded-lg bg-amber-50 p-2">
            <p className="mb-1 text-xs font-semibold text-amber-700">Warnings:</p>
            <ul className="space-y-0.5">
              {_validation.warnings.map((warn, i) => (
                <li key={i} className="text-xs text-amber-600">
                  Row {warn.row}: {warn.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Duplicate info */}
        {_dbDuplicate && (
          <div className="rounded-lg bg-red-50 p-2">
            <p className="text-xs font-semibold text-red-700">
              Duplicate DOI in database: {_dbDuplicate.doi}
            </p>
            <p className="text-xs text-red-600">
              Existing: {_dbDuplicate.existingTitle}
            </p>
          </div>
        )}

        {_internalDuplicate && (
          <div className="rounded-lg bg-amber-50 p-2">
            <p className="text-xs font-semibold text-amber-700">
              Duplicate within file (row {_internalDuplicate.duplicateOfRow + 2})
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Bulk Import</h2>
          <p className="text-muted-foreground">Import publications from Excel spreadsheet</p>
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          Download Template
        </button>
      </div>

      {/* Upload Area */}
      <div
        className={`relative rounded-xl border-2 border-dashed p-8 transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex flex-col items-center text-center">
          {file ? (
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-10 w-10 text-primary" />
              <div className="text-left">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={() => { setFile(null); setPreviewData(null); setImportResult(null) }}
                className="ml-4 rounded-lg border border-border px-3 py-1 text-sm hover:bg-muted"
              >
                Remove
              </button>
            </div>
          ) : (
            <>
              <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-lg font-medium">Drop your Excel file here</p>
              <p className="mb-4 text-sm text-muted-foreground">
                or click to browse (.xlsx, .xls, max 10MB)
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Select File
              </button>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {file && !importResult && (
        <div className="flex gap-3">
          <button
            onClick={handlePreview}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-primary px-6 py-2 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Preview Import
          </button>
          {previewData && (
            <button
              onClick={handleImport}
              disabled={isImporting || previewData.validCount === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Import {previewData.validCount} Records
            </button>
          )}
        </div>
      )}

      {/* Preview Stats */}
      {previewData && !importResult && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Rows</p>
            <p className="text-2xl font-bold">{previewData.totalRows}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Valid</p>
            <p className="text-2xl font-bold text-green-600">{previewData.validCount}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Invalid</p>
            <p className="text-2xl font-bold text-red-600">{previewData.invalidCount}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Duplicates</p>
            <p className="text-2xl font-bold text-amber-600">
              {previewData.dbDuplicateCount + previewData.internalDuplicateCount}
            </p>
          </div>
        </div>
      )}

      {/* Statistics */}
      {previewData?.statistics && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-semibold">By Publication Type</h3>
            <div className="space-y-2">
              {Object.entries(previewData.statistics.byType).map(([type, count]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{type.replace(/_/g, ' ')}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-semibold">By Status</h3>
            <div className="space-y-2">
              {Object.entries(previewData.statistics.byStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{status}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preview Table */}
      {previewData && (
        <div className="rounded-xl border bg-card">
          <div className="border-b p-4">
            <h3 className="font-semibold">Record Preview</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="py-3 px-4 text-left"></th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Row</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Title</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Type</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">DOI</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {(previewData.validRecords.length > 0 ? previewData.validRecords : previewData.invalidRecords).slice(0, 20).map((record, idx) => (
                  <Fragment key={idx}>
                    <tr className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-4">
                        <button
                          onClick={() => toggleRow(idx)}
                          className="rounded p-1 hover:bg-muted"
                        >
                          {expandedRows[idx] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-2 px-4">#{record._rowIndex}</td>
                      <td className="py-2 px-4 max-w-[300px] truncate">{record.title || '-'}</td>
                      <td className="py-2 px-4">{record.publicationType || '-'}</td>
                      <td className="py-2 px-4">{record.doi || '-'}</td>
                      <td className="py-2 px-4">
                        {record._canImport ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            <CheckCircle className="h-3 w-3" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            <XCircle className="h-3 w-3" /> Invalid
                          </span>
                        )}
                      </td>
                    </tr>
                    {expandedRows[idx] && (
                      <tr>
                        <td colSpan={6} className="bg-muted/30 p-4">
                          {renderValidation(record)}
                          <div className="mt-3 grid gap-2 md:grid-cols-3">
                            {record.journalName && (
                              <div className="rounded bg-background p-2">
                                <p className="text-xs text-muted-foreground">Journal</p>
                                <p className="text-sm font-medium">{record.journalName}</p>
                              </div>
                            )}
                            {record.publicationDate && (
                              <div className="rounded bg-background p-2">
                                <p className="text-xs text-muted-foreground">Date</p>
                                <p className="text-sm font-medium">
                                  {new Date(record.publicationDate).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                            {record.impactFactor && (
                              <div className="rounded bg-background p-2">
                                <p className="text-xs text-muted-foreground">Impact Factor</p>
                                <p className="text-sm font-medium">{record.impactFactor}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {previewData.validRecords.length + previewData.invalidRecords.length > 20 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Showing 20 of {(previewData.validRecords.length + previewData.invalidRecords.length).toLocaleString()} records
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Import Complete</h3>
              <p className="text-muted-foreground">
                {importResult.imported} of {importResult.total} records imported
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Imported</p>
              <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Valid in File</p>
              <p className="text-2xl font-bold">{importResult.validRecordsCount}</p>
            </div>
          </div>

          {importResult.errors?.length > 0 && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="mb-2 font-semibold text-red-700">Failed Records:</p>
              <ul className="space-y-1">
                {importResult.errors.slice(0, 5).map((err, i) => (
                  <li key={i} className="text-sm text-red-600">
                    Row {err.row}: {err.error}
                  </li>
                ))}
              </ul>
              {importResult.errors.length > 5 && (
                <p className="mt-2 text-sm text-red-600">
                  ... and {importResult.errors.length - 5} more errors
                </p>
              )}
            </div>
          )}

          <button
            onClick={() => {
              setFile(null)
              setPreviewData(null)
              setImportResult(null)
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-primary px-6 py-2 text-sm font-medium text-primary hover:bg-primary/10"
          >
            <Upload className="h-4 w-4" />
            Import Another File
          </button>
        </div>
      )}
    </div>
  )
}

export default ImportPage