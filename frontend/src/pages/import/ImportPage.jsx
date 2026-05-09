import { useState, useRef, Fragment } from 'react'
import { useAuth } from '../../context/AuthContext'
import importService from '../../services/import.service'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  Loader2,
  ChevronRight,
  ChevronDown,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
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

  const validateAndSetFile = (f) => {
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
      showToast(`Found ${response.data.data.statistics?.total || 0} publications`, 'success')
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
      link.setAttribute('download', 'nie_publication_import_template.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      showToast('Failed to download template', 'error')
    }
  }

  const toggleRow = (idx) => {
    setExpandedRows((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">NIE Publication Import</h2>
          <p className="text-muted-foreground">Import publications from NIE Excel tracker</p>
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
          dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
        <div className="flex flex-col items-center text-center">
          {file ? (
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-10 w-10 text-primary" />
              <div className="text-left">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
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
              <p className="mb-2 text-lg font-medium">Drop your NIE Excel file here</p>
              <p className="mb-4 text-sm text-muted-foreground">or click to browse (.xlsx, .xls, max 10MB)</p>
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
            Preview Data
          </button>
          {previewData && (
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Import {previewData.statistics?.total || 0} Publications
            </button>
          )}
        </div>
      )}

      {/* Statistics Cards */}
      {previewData?.statistics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm">Total Publications</span>
            </div>
            <p className="text-2xl font-bold mt-1">{previewData.statistics.total || 0}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Published</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">
              {previewData.statistics.byStatus?.PUBLISHED || 0}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Under Review</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-amber-600">
              {previewData.statistics.byStatus?.UNDER_REVIEW || 0}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <PieChartIcon className="h-4 w-4" />
              <span className="text-sm">Departments</span>
            </div>
            <p className="text-2xl font-bold mt-1">{Object.keys(previewData.statistics.byDept || {}).length}</p>
          </div>
        </div>
      )}

      {/* Distribution Stats */}
      {previewData?.statistics && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* By Status */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold mb-3">By Status</h3>
            <div className="space-y-2">
              {Object.entries(previewData.statistics.byStatus || {}).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{status.replace(/_/g, ' ')}</span>
                  <span className="font-medium bg-primary/10 px-2 py-0.5 rounded text-xs">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By Type */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold mb-3">By Type</h3>
            <div className="space-y-2">
              {Object.entries(previewData.statistics.byType || {}).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{type.replace(/_/g, ' ')}</span>
                  <span className="font-medium bg-primary/10 px-2 py-0.5 rounded text-xs">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By Department */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold mb-3">By Department</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(previewData.statistics.byDept || {}).map(([dept, count]) => (
                <div key={dept} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{dept}</span>
                  <span className="font-medium bg-primary/10 px-2 py-0.5 rounded text-xs">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preview Table */}
      {previewData?.records && previewData.records.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="border-b p-4">
            <h3 className="font-semibold">Data Preview</h3>
            <p className="text-sm text-muted-foreground">
              Showing {previewData.records.length} of {previewData.statistics?.total} records
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="py-3 px-4 text-left w-8"></th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Title</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Department</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Status</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">IF</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Quartile</th>
                </tr>
              </thead>
              <tbody>
                {previewData.records.slice(0, 30).map((record, idx) => (
                  <Fragment key={idx}>
                    <tr className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-4">
                        <button onClick={() => toggleRow(idx)} className="rounded p-1 hover:bg-muted">
                          {expandedRows[idx] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="py-2 px-4 max-w-[300px] truncate">{record.title || '-'}</td>
                      <td className="py-2 px-4">{record.department || '-'}</td>
                      <td className="py-2 px-4">
                        {record.status ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            record.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                            record.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {record.status.replace(/_/g, ' ')}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-2 px-4">{record.impactFactor || '-'}</td>
                      <td className="py-2 px-4">
                        {record.quartile ? (
                          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                            record.quartile === 'Q1' ? 'bg-green-100 text-green-700' :
                            record.quartile === 'Q2' ? 'bg-blue-100 text-blue-700' :
                            record.quartile === 'Q3' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {record.quartile}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                    {expandedRows[idx] && (
                      <tr>
                        <td colSpan={6} className="bg-muted/30 p-4">
                          <div className="grid gap-3 md:grid-cols-3">
                            {record.journalName && (
                              <div className="rounded bg-background p-2">
                                <p className="text-xs text-muted-foreground">Journal/Conference</p>
                                <p className="text-sm font-medium">{record.journalName}</p>
                              </div>
                            )}
                            {record.authorList && (
                              <div className="rounded bg-background p-2">
                                <p className="text-xs text-muted-foreground">Authors</p>
                                <p className="text-sm font-medium truncate">{record.authorList}</p>
                              </div>
                            )}
                            {record.researchArea && (
                              <div className="rounded bg-background p-2">
                                <p className="text-xs text-muted-foreground">Research Area</p>
                                <p className="text-sm font-medium">{record.researchArea}</p>
                              </div>
                            )}
                            {record.doi && (
                              <div className="rounded bg-background p-2">
                                <p className="text-xs text-muted-foreground">DOI</p>
                                <p className="text-sm font-medium truncate">{record.doi}</p>
                              </div>
                            )}
                            {record.citationCount !== undefined && (
                              <div className="rounded bg-background p-2">
                                <p className="text-xs text-muted-foreground">Citations</p>
                                <p className="text-sm font-medium">{record.citationCount}</p>
                              </div>
                            )}
                            {record.fundingAgency && record.fundingAgency !== 'None' && (
                              <div className="rounded bg-background p-2">
                                <p className="text-xs text-muted-foreground">Funding</p>
                                <p className="text-sm font-medium">{record.fundingAgency}</p>
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
                {importResult.imported} of {importResult.total} publications imported
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">Imported</p>
              <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">Total Processed</p>
              <p className="text-2xl font-bold">{importResult.total}</p>
            </div>
          </div>

          {importResult.errors?.length > 0 && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="mb-2 font-semibold text-red-700">Failed Records:</p>
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {importResult.errors.slice(0, 10).map((err, i) => (
                  <li key={i} className="text-sm text-red-600">
                    Row {err.row}: {err.title?.substring(0, 50)}... - {err.error}
                  </li>
                ))}
              </ul>
              {importResult.errors.length > 10 && (
                <p className="mt-2 text-sm text-red-600">... and {importResult.errors.length - 10} more errors</p>
              )}
            </div>
          )}

          <button
            onClick={() => { setFile(null); setPreviewData(null); setImportResult(null) }}
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