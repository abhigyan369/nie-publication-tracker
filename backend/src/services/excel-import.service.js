import XLSX from 'xlsx'
import prisma from '../config/database.config.js'
import { ApiError } from '../utils/response.util.js'
import logger from '../utils/logger.util.js'
import embeddingService from './embeddingService.js'

// Column mapping from NIE Excel format to database fields
const COLUMN_MAPPING = {
  title: ['Title of the Paper'],
  authorList: ['Author(s) List'],
  department: ['Department'],
  campus: ['Campus'],
  correspondingAuthor: ['Corresponding Author'],
  facultyDesignation: ['Faculty Designation'],
  status: ['Status'],
  startDate: ['Start Date'],
  submissionDate: ['Submission Date'],
  acceptanceDate: ['Acceptance Date (Probable)'],
  elapsedDays: ['Elapsed Days'],
  publicationType: ['Publication Type'],
  journalName: ['Journal / Conference Name'],
  impactFactor: ['Impact Factor (IF)'],
  quartile: ['Scopus Quartile'],
  wosIndexed: ['Web of Science (SCI/SCIE/ESCI)'],
  doi: ['DOI / URL'],
  citationCount: ['Citation Count'],
  citationUpdatedOn: ['Citation Updated On'],
  targetJournal: ['Target Journal / Conference'],
  rejectionCount: ['Rejection / Revision Count'],
  researchArea: ['Research Area / Keywords'],
  fundingTitle: ['Funding / Grant Title'],
  fundingAgency: ['Funding Agency'],
  grantAmount: ['Grant Amount (Rs. Lakhs)'],
  campusHead: ['Campus Head'],
}

// Publication type mapping
const TYPE_MAPPING = {
  'Journal Article': 'JOURNAL_ARTICLE',
  'journal article': 'JOURNAL_ARTICLE',
  'Conference Paper': 'CONFERENCE_PAPER',
  'conference paper': 'CONFERENCE_PAPER',
  'Book Chapter': 'BOOK_CHAPTER',
  'book chapter': 'BOOK_CHAPTER',
  'Book': 'BOOK',
  'Review Article': 'REVIEW_ARTICLE',
  'Conference Proceedings': 'CONFERENCE_PAPER',
}

// Status mapping
const STATUS_MAPPING = {
  'Draft': 'DRAFT',
  'Submitted': 'SUBMITTED',
  'Under Review': 'UNDER_REVIEW',
  'Revision Requested': 'REVISION_REQUESTED',
  'Revision Request': 'REVISION_REQUESTED',
  'R2': 'REVISION_REQUESTED',
  'Accepted': 'ACCEPTED',
  'Published': 'PUBLISHED',
  'Rejected': 'REJECTED',
}

class NIEExcelImportService {
  async syncPublicationEmbeddingSafely(publicationId) {
    try {
      await embeddingService.syncPublicationEmbedding(publicationId)
      logger.info(`Publication embedding created after import: ${publicationId}`)
    } catch (error) {
      logger.error(`Failed to create imported publication embedding ${publicationId}:`, error)
    }
  }

  /**
   * Parse Excel file with NIE format
   */
  parseExcelFile(fileBuffer) {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true })

      // Find the main data sheet
      let sheetName = 'Publication Status Tracker NIE'
      if (!workbook.SheetNames.includes(sheetName)) {
        sheetName = workbook.SheetNames[0]
      }

      const worksheet = workbook.Sheets[sheetName]

      // Read as array of arrays to preserve cell positions
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false, header: 1 })

      if (!data.length) {
        throw ApiError.badRequest('The Excel file is empty')
      }

      // Find the row index where actual headers are (Title of the Paper)
      let headerRowIndex = -1
      for (let i = 0; i < Math.min(data.length, 5); i++) {
        const row = data[i]
        if (row && row.includes('Title of the Paper')) {
          headerRowIndex = i
          break
        }
      }

      if (headerRowIndex === -1) {
        throw ApiError.badRequest('Could not find header row in Excel file')
      }

      // Get headers from the header row
      const headerRow = data[headerRowIndex]

      // Get data rows (skip header rows)
      const dataRows = data.slice(headerRowIndex + 1)

      // Create normalized data with clean headers
      const normalizedData = dataRows.map(row => {
        const normalized = {}
        headerRow.forEach((header, idx) => {
          if (header && typeof header === 'string' && header.trim()) {
            normalized[header.trim()] = row[idx] || ''
          }
        })
        return normalized
      }).filter(row => Object.keys(row).length > 0 && row['Title of the Paper'])

      return {
        success: true,
        data: normalizedData,
        headers: headerRow.filter(h => h && typeof h === 'string' && h.trim()),
        totalRows: normalizedData.length,
        sheetName,
      }
    } catch (error) {
      logger.error('Excel parsing error:', error)
      if (error instanceof ApiError) throw error
      throw ApiError.badRequest('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.')
    }
  }

  /**
   * Map Excel columns to database fields
   */
  mapColumnsToFields(headers) {
    const mapping = {}

    for (const [field, possibleNames] of Object.entries(COLUMN_MAPPING)) {
      for (const name of possibleNames) {
        if (headers.includes(name)) {
          mapping[field] = name
          break
        }
      }
    }

    return mapping
  }

  /**
   * Transform a row based on column mapping
   */
  transformRow(row, columnMapping) {
    const transformed = {}

    // Title
    if (columnMapping.title && row[columnMapping.title]) {
      transformed.title = String(row[columnMapping.title]).trim()
    }

    // Author(s) List
    if (columnMapping.authorList && row[columnMapping.authorList]) {
      const authors = String(row[columnMapping.authorList])
      transformed.authorList = authors
      // Extract first author name
      const firstAuthor = authors.split(',')[0].trim()
      const parts = firstAuthor.split(' ')
      if (parts.length >= 2) {
        transformed.lastName = parts[0]
        transformed.firstName = parts.slice(1).join(' ')
      } else {
        transformed.lastName = firstAuthor
      }
    }

    // Department
    if (columnMapping.department && row[columnMapping.department]) {
      transformed.department = String(row[columnMapping.department]).trim()
    }

    // Campus
    if (columnMapping.campus && row[columnMapping.campus]) {
      transformed.campus = String(row[columnMapping.campus]).trim()
    }

    // Corresponding Author
    if (columnMapping.correspondingAuthor && row[columnMapping.correspondingAuthor]) {
      transformed.correspondingAuthor = String(row[columnMapping.correspondingAuthor]).trim()
    }

    // Faculty Designation
    if (columnMapping.facultyDesignation && row[columnMapping.facultyDesignation]) {
      transformed.facultyDesignation = String(row[columnMapping.facultyDesignation]).trim()
    }

    // Publication Type
    if (columnMapping.publicationType && row[columnMapping.publicationType]) {
      const type = String(row[columnMapping.publicationType]).trim()
      transformed.publicationType = TYPE_MAPPING[type] || this.normalizeEnum(type, ['JOURNAL_ARTICLE', 'CONFERENCE_PAPER', 'BOOK', 'BOOK_CHAPTER'])
    }

    // Journal/Conference Name
    if (columnMapping.journalName && row[columnMapping.journalName]) {
      transformed.journalName = String(row[columnMapping.journalName]).trim()
    }

    // Status
    if (columnMapping.status && row[columnMapping.status]) {
      const status = String(row[columnMapping.status]).trim()
      transformed.status = STATUS_MAPPING[status] || this.normalizeEnum(status, ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUESTED', 'ACCEPTED', 'PUBLISHED', 'REJECTED'])
    }

    // Impact Factor
    if (columnMapping.impactFactor && row[columnMapping.impactFactor]) {
      const val = row[columnMapping.impactFactor]
      const num = parseFloat(val)
      if (!isNaN(num)) transformed.impactFactor = num
    }

    // Quartile
    if (columnMapping.quartile && row[columnMapping.quartile]) {
      const q = String(row[columnMapping.quartile]).toUpperCase().trim()
      if (['Q1', 'Q2', 'Q3', 'Q4'].includes(q)) {
        transformed.quartile = q
      }
    }

    // Web of Science
    if (columnMapping.wosIndexed && row[columnMapping.wosIndexed]) {
      const val = String(row[columnMapping.wosIndexed]).toLowerCase()
      transformed.webOfScienceIndexed = ['yes', 'y', 'true', '1', 'sci', 'scopus'].includes(val)
    }

    // DOI
    if (columnMapping.doi && row[columnMapping.doi]) {
      const doi = String(row[columnMapping.doi]).trim()
      if (doi && doi !== 'null' && doi !== 'None' && doi !== '') {
        transformed.doi = doi
      }
    }

    // Citation Count
    if (columnMapping.citationCount && row[columnMapping.citationCount]) {
      const val = row[columnMapping.citationCount]
      const num = parseInt(val)
      if (!isNaN(num)) transformed.citationCount = num
    }

    // Research Area
    if (columnMapping.researchArea && row[columnMapping.researchArea]) {
      const area = String(row[columnMapping.researchArea]).trim()
      if (area && area !== 'R2' && area !== 'None' && area !== '') {
        transformed.researchArea = area
        transformed.keywords = area.split(',').map(k => k.trim()).filter(Boolean)
      }
    }

    // Funding Agency
    if (columnMapping.fundingAgency && row[columnMapping.fundingAgency]) {
      const agency = String(row[columnMapping.fundingAgency]).trim()
      if (agency && agency !== 'None' && agency !== '') {
        transformed.fundingAgency = agency
      }
    }

    // Grant Amount
    if (columnMapping.grantAmount && row[columnMapping.grantAmount]) {
      const val = row[columnMapping.grantAmount]
      const num = parseFloat(String(val).replace(/[^0-9.]/g, ''))
      if (!isNaN(num)) transformed.fundingAmount = num
    }

    // Dates
    if (columnMapping.startDate && row[columnMapping.startDate]) {
      const date = this.parseExcelDate(row[columnMapping.startDate])
      if (date) transformed.publicationDate = date
    }

    if (columnMapping.submissionDate && row[columnMapping.submissionDate]) {
      const date = this.parseExcelDate(row[columnMapping.submissionDate])
      if (date) transformed.submissionDate = date
    }

    if (columnMapping.acceptanceDate && row[columnMapping.acceptanceDate]) {
      const date = this.parseExcelDate(row[columnMapping.acceptanceDate])
      if (date) transformed.acceptedDate = date
    }

    // Target Journal
    if (columnMapping.targetJournal && row[columnMapping.targetJournal]) {
      const target = String(row[columnMapping.targetJournal]).trim()
      if (target && target !== 'None' && target !== '') {
        transformed.targetJournal = target
      }
    }

    // Rejection Count
    if (columnMapping.rejectionCount && row[columnMapping.rejectionCount]) {
      const val = row[columnMapping.rejectionCount]
      const num = parseInt(val)
      if (!isNaN(num)) transformed.revisionCount = num
    }

    return transformed
  }

  /**
   * Parse Excel date (stored as serial number or string)
   */
  parseExcelDate(value) {
    if (!value) return null

    // If already a Date object
    if (value instanceof Date) return value

    // If numeric (Excel serial date)
    if (typeof value === 'number') {
      // Excel epoch is Jan 1, 1900
      const date = XLSX.SSF.parse_date_code(value)
      if (date) {
        return new Date(date.y, date.m - 1, date.d)
      }
    }

    // Try string parsing (DD/MM/YYYY or YYYY-MM-DD)
    const str = String(value)
    if (str.includes('/')) {
      const parts = str.split('/')
      if (parts.length === 3) {
        const day = parseInt(parts[0])
        const month = parseInt(parts[1]) - 1
        const year = parseInt(parts[2])
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month, day)
        }
      }
    }

    // Try standard parsing
    const parsed = new Date(str)
    if (!isNaN(parsed)) return parsed

    return null
  }

  /**
   * Normalize enum value
   */
  normalizeEnum(value, validValues) {
    const str = String(value).toUpperCase().trim().replace(/ /g, '_')
    return validValues.find(v => v === str) || null
  }

  /**
   * Validate a single record
   */
  validateRecord(record, rowIndex) {
    const errors = []
    const warnings = []

    // Title required
    if (!record.title) {
      errors.push({ field: 'title', message: 'Title is required', row: rowIndex })
    } else if (record.title.length > 500) {
      errors.push({ field: 'title', message: 'Title must be less than 500 characters', row: rowIndex })
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      hasWarnings: warnings.length > 0,
    }
  }

  /**
   * Preview parse results without saving
   */
  async previewImport(fileBuffer) {
    const parseResult = this.parseExcelFile(fileBuffer)
    const columnMapping = this.mapColumnsToFields(parseResult.headers)

    logger.info(`Found column mapping: ${JSON.stringify(columnMapping)}`)
    logger.info(`Headers found: ${parseResult.headers.join(', ')}`)

    // Transform all rows
    const transformedRecords = []
    const validationResults = []

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i]

      const transformed = this.transformRow(row, columnMapping)
      const validation = this.validateRecord(transformed, i + 2)

      transformedRecords.push(transformed)
      validationResults.push(validation)
    }

    // Get statistics
    const withTitle = transformedRecords.filter(r => r.title)
    const byStatus = this.getStatusDistribution(transformedRecords)
    const byType = this.getTypeDistribution(transformedRecords)
    const byDept = this.getDepartmentDistribution(transformedRecords)

    return {
      totalRows: parseResult.totalRows,
      validRecordsCount: withTitle.length,
      columnMapping,
      mappedFields: Object.keys(columnMapping).filter(f => columnMapping[f]),
      unmappedFields: Object.keys(columnMapping).filter(f => !columnMapping[f]),
      records: transformedRecords.slice(0, 50),
      validRecords: transformedRecords.filter(r => r.title),
      invalidRecords: [],
      statistics: {
        byStatus,
        byType,
        byDept,
        total: withTitle.length,
      },
    }
  }

  /**
   * Execute batch import
   */
  async executeImport(records, userId, batchSize = 50) {
    const results = {
      total: records.length,
      imported: 0,
      failed: 0,
      errors: [],
      batchResults: [],
    }

    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)

      try {
        const batchResult = await this.processBatch(batch, userId)
        results.imported += batchResult.imported
        results.failed += batchResult.failed
        results.errors.push(...batchResult.errors)
        results.batchResults.push({
          batchNumber: Math.floor(i / batchSize) + 1,
          startIndex: i,
          endIndex: Math.min(i + batchSize, records.length),
          imported: batchResult.imported,
          failed: batchResult.failed,
        })
      } catch (error) {
        logger.error('Batch import error:', error)
        results.failed += batch.length
        results.errors.push({
          batch: Math.floor(i / batchSize) + 1,
          error: error.message,
        })
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'BULK_IMPORT',
        entityType: 'Publication',
        entityId: 'batch',
        details: {
          total: results.total,
          imported: results.imported,
          failed: results.failed,
        },
      },
    })

    return results
  }

  /**
   * Process a batch of records
   */
  async processBatch(records, userId) {
    const result = {
      imported: 0,
      failed: 0,
      errors: [],
    }
    const importedPublicationIds = []

    await prisma.$transaction(async (tx) => {
      for (const record of records) {
        try {
          // Check DOI duplicate if exists
          if (record.doi) {
            const existing = await tx.publication.findUnique({
              where: { doi: record.doi },
            })
            if (existing) {
              result.failed++
              result.errors.push({
                row: record._rowIndex || 0,
                title: record.title,
                error: 'Duplicate DOI in database',
              })
              continue
            }
          }

          // Create publication
          const publication = await tx.publication.create({
            data: {
              title: record.title,
              publicationType: record.publicationType || 'JOURNAL_ARTICLE',
              journalName: record.journalName,
              conferenceName: record.publicationType === 'CONFERENCE_PAPER' ? record.journalName : null,
              status: record.status || 'DRAFT',
              doi: record.doi,
              impactFactor: record.impactFactor,
              quartile: record.quartile,
              scopusIndexed: record.quartile ? true : false,
              webOfScienceIndexed: record.webOfScienceIndexed || false,
              citationCount: record.citationCount || 0,
              publicationDate: record.publicationDate,
              acceptedDate: record.acceptedDate,
              keywords: record.keywords,
              department: record.department,
              researchArea: record.researchArea,
              fundingAgency: record.fundingAgency,
              fundingAmount: record.fundingAmount,
              abstract: record.authorList,
              authorId: userId,
            },
          })

          importedPublicationIds.push(publication.id)
          result.imported++
        } catch (error) {
          result.failed++
          result.errors.push({
            row: record._rowIndex || 0,
            title: record.title,
            error: error.message,
          })
        }
      }
    })

    for (const publicationId of importedPublicationIds) {
      await this.syncPublicationEmbeddingSafely(publicationId)
    }

    return result
  }

  /**
   * Generate type distribution
   */
  getTypeDistribution(records) {
    const distribution = {}
    records.forEach((r) => {
      const type = r.publicationType || 'Unknown'
      distribution[type] = (distribution[type] || 0) + 1
    })
    return distribution
  }

  /**
   * Generate status distribution
   */
  getStatusDistribution(records) {
    const distribution = {}
    records.forEach((r) => {
      const status = r.status || 'DRAFT'
      distribution[status] = (distribution[status] || 0) + 1
    })
    return distribution
  }

  /**
   * Generate department distribution
   */
  getDepartmentDistribution(records) {
    const distribution = {}
    records.forEach((r) => {
      const dept = r.department || 'Unknown'
      distribution[dept] = (distribution[dept] || 0) + 1
    })
    return distribution
  }

  /**
   * Generate sample template
   */
  generateTemplate() {
    const template = [
      {
        'Title of the Paper': 'Sample Publication Title',
        'Author(s) List': 'John Doe, Jane Smith',
        'Department': 'Computer Science',
        'Campus': 'South',
        'Corresponding Author': 'John Doe',
        'Faculty Designation': 'Assistant Professor',
        'Status': 'Published',
        'Start Date': '2024-01-15',
        'Submission Date': '2024-02-01',
        'Acceptance Date (Probable)': '2024-03-15',
        'Publication Type': 'Journal Article',
        'Journal / Conference Name': 'Sample Journal',
        'Impact Factor (IF)': '3.5',
        'Scopus Quartile': 'Q1',
        'Web of Science (SCI/SCIE/ESCI)': 'Yes',
        'DOI / URL': 'https://doi.org/10.1234/sample',
        'Citation Count': '10',
        'Research Area / Keywords': 'AI, Machine Learning',
        'Funding Agency': 'None',
        'Grant Amount (Rs. Lakhs)': '',
      },
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Publications')

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  }
}

export default new NIEExcelImportService()
