'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useImportCsv } from '@/hooks/use-products'
import { cn } from '@/lib/utils'

interface ImportResult {
  total: number
  imported: number
  skipped: number
  errors: number
  error_details?: string[]
}

export function CsvImport() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mutate: importCsv, isPending } = useImportCsv()

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) {
      alert('Please upload a CSV file')
      return
    }
    setFile(f)
    setResult(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleImport = () => {
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    importCsv(formData, {
      onSuccess: (res) => {
        setResult(res.data)
        setFile(null)
      },
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-amber-400 bg-amber-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700">
          Drop your CSV file here, or click to browse
        </p>
        <p className="text-xs text-gray-400 mt-1">Only .csv files are supported</p>
      </div>

      {/* Selected file */}
      {file && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-900 truncate">{file.name}</p>
            <p className="text-xs text-blue-600">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setFile(null) }}>
            <X className="h-4 w-4 text-blue-400 hover:text-blue-600" />
          </button>
        </div>
      )}

      {/* Import button */}
      <Button
        onClick={handleImport}
        disabled={!file || isPending}
        className="w-full bg-amber-600 hover:bg-amber-700"
      >
        {isPending ? 'Importing...' : 'Import Products'}
      </Button>

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Import Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Rows', value: result.total, color: 'bg-gray-50 text-gray-700' },
              { label: 'Imported', value: result.imported, color: 'bg-green-50 text-green-700' },
              { label: 'Skipped', value: result.skipped, color: 'bg-amber-50 text-amber-700' },
              { label: 'Errors', value: result.errors, color: 'bg-red-50 text-red-700' },
            ].map((item) => (
              <Card key={item.label} className={item.color}>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs font-medium mt-0.5">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {result.error_details && result.error_details.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-sm font-medium text-red-700">Errors</p>
              </div>
              <ul className="space-y-1">
                {result.error_details.map((err, i) => (
                  <li key={i} className="text-xs text-red-600">{err}</li>
                ))}
              </ul>
            </div>
          )}

          {result.imported > 0 && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <p className="text-sm">{result.imported} products successfully imported</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
