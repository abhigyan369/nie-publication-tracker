import XLSX from 'xlsx'
import prisma from '../config/database.config.js'
import { ApiError } from '../utils/response.util.js'
import logger from '../utils/logger.util.js'

// Column mapping from Excel headers to database fields
const COLUMN_MAPPING = {
  title: ['title', 'Title', 'TITLE', 'publication_title', 'Publication Title'],
  abstract: ['abstract', 'Abstract', 'ABSTRACT', 'description', 'Description'],
  publicationType: ['publication_type', 'Publication Type', 'type', 'Type', 'Publication Type'],
  journalName: ['journal_name', 'Journal Name', 'Journal', 'journal', 'Journal'],
  conferenceName: ['conference_name', 'Conference Name', 'Conference', 'conference', 'Conference'],
  publisher: ['publisher', 'Publisher', 'Publisher'],
  doi: ['doi', 'DOI', 'doi_link', 'DOI Link'],
  volume: ['volume', 'Volume', 'vol'],
  issue: ['issue', 'Issue', 'iss'],
  pages: ['pages', 'Pages', 'page'],
  isbn: ['isbn', 'ISBN'],
  issn: ['issn', 'ISSN'],
  publicationDate: ['publication_date', 'Publication Date', 'Published Date', 'date', 'Date', 'pub_date'],
  acceptedDate: ['accepted_date', 'Accepted Date'],
  publishedDate: ['published_date', 'Published Date', 'pub_date'],
  keywords: ['keywords', 'Keywords', 'tags', 'Tags'],
  status: ['status', 'Status', 'publication_status', 'Publication Status'],
  citationCount: ['citation_count', 'Citation Count', 'Citations', 'citations'],
  impactFactor: ['impact_factor', 'Impact Factor', 'IF', 'impact_factor'],
  quartile: ['quartile', 'Quartile', 'Q1/Q2/Q3/Q4'],
  scopusIndexed: ['scopus_indexed', 'Scopus Indexed', 'scopus'],
  webOfScienceIndexed: ['web_of_science', 'WoS Indexed', 'wos'],
  department: ['department', 'Department', 'dept'],
  researchArea: ['research_area', 'Research Area', 'area', 'Area'],
  fundingAgency: ['funding_agency', 'Funding Agency', 'funding', 'Funding'],
  fundingAmount: ['funding_amount', 'Funding Amount', 'grant', 'Grant'],
  fundingProjectNo: ['funding_project_no', 'Project No', 'project_no', 'project', 'Project Number'],
  firstName: ['first_name', 'First Name', 'firstname', 'FirstName', 'author_first'],
  lastName: ['last_name', 'Last Name', 'lastname', 'LastName', 'author_last'],
  email: ['email', 'Email', 'author_email'],
}

const PUBLICATION_TYPES = [
  'JOURNAL_ARTICLE',
  'CONFERENCE_PAPER',
  'BOOK',
  'BOOK_CHAPTER',
  'REVIEW_ARTICLE',
  'CASE_STUDY',
  'SHORT_COMMUNICATION',
  'LETTER',
  'EDITORIAL',
]

const STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUESTED', 'ACCEPTED', 'PUBLISHED', 'REJECTED']
const QUARTILES = ['Q1', 'Q2', 'Q3', 'Q4']

class ExcelImportService {
  /**
   * Parse Excel file and extract data
   */
  parseExcelFile(fileBuffer) {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

      if (!data.length) {
        throw ApiError.badRequest('The Excel file is empty')
      }

      // Get column headers
      const headers = Object.keys(data[0])

      return {
        success: true,
        data,
        headers,
        totalRows: data.length,
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

    for (const [field, aliases] of Object.entries(COLUMN_MAPPING)) {
      for (const alias of aliases) {
        if (headers.includes(alias)) {
          mapping[field] = alias
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

    for (const [field, columnName] of Object.entries(columnMapping)) {
      let value = row[columnName]

      // Skip undefined/null values
      if (value === undefined || value === null || value === '') {
        continue
      }

      // Parse dates
      if (['publicationDate', 'acceptedDate', 'publishedDate'].includes(field)) {
        if (value instanceof Date) {
          transformed[field] = value
        } else if (typeof value === 'string') {
          const parsed = new Date(value)
          if (!isNaN(parsed)) transformed[field] = parsed
        }
      }

      // Parse numbers
      else if (['citationCount', 'fundingAmount'].includes(field)) {
        const num = parseFloat(value)
        if (!isNaN(num)) transformed[field] = num
      }

      // Parse impact factor
      else if (field === 'impactFactor') {
        const num = parseFloat(value)
        if (!isNaN(num)) transformed[field] = num
      }

      // Parse boolean fields
      else if (['scopusIndexed', 'webOfScienceIndexed'].includes(field)) {
        const str = String(value).toLowerCase()
        transformed[field] = ['yes', 'true', '1', 'y', 'scopus'].includes(str)
      }

      // Parse keywords (comma-separated)
      else if (field === 'keywords') {
        const keywords = String(value).split(',').map(k => k.trim()).filter(Boolean)
        if (keywords.length) transformed[field] = keywords
      }

      // Normalize enums
      else if (field === 'publicationType') {
        const normalized = this.normalizeEnum(value, PUBLICATION_TYPES)
        if (normalized) transformed[field] = normalized
      }

      else if (field === 'status') {
        const normalized = this.normalizeEnum(value, STATUSES)
        if (normalized) transformed[field] = normalized
      }

      else if (field === 'quartile') {
        const upper = String(value).toUpperCase().trim()
        if (QUARTILES.includes(upper)) transformed[field] = upper
      }

      // Default: convert to string
      else {
        transformed[field] = String(value).trim()
      }
    }

    return transformed
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

    // Required fields
    if (!record.title) {
      errors.push({ field: 'title', message: 'Title is required', row: rowIndex })
    } else if (record.title.length > 500) {
      errors.push({ field: 'title', message: 'Title must be less than 500 characters', row: rowIndex })
    }

    // Publication type
    if (!record.publicationType) {
      errors.push({ field: 'publicationType', message: 'Publication type is required', row: rowIndex })
    }

    // DOI format
    if (record.doi && !this.isValidDOI(record.doi)) {
      errors.push({ field: 'doi', message: 'Invalid DOI format', row: rowIndex })
    }

    // Impact factor
    if (record.impactFactor && (record.impactFactor < 0 || record.impactFactor > 100)) {
      warnings.push({ field: 'impactFactor', message: 'Impact factor seems unusually high/low', row: rowIndex })
    }

    // Keywords
    if (record.keywords && !Array.isArray(record.keywords)) {
      warnings.push({ field: 'keywords', message: 'Keywords should be comma-separated', row: rowIndex })
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      hasWarnings: warnings.length > 0,
    }
  }

  /**
   * Validate DOI format
   */
  isValidDOI(doi) {
    const doiPatterns = [
      /^https?:\/\/doi\.org\//,
      /^https?:\/\/dx\.doi\.org\//,
      /^10\.\d{4,}\//,
      /^doi:/,
    ]
    return doiPatterns.some(pattern => pattern.test(String(doi)))
  }

  /**
   * Check for duplicate DOIs in database
   */
  async checkDuplicateDOIs(records) {
    const dois = records.filter(r => r.doi).map(r => r.doi)

    if (!dois.length) return { duplicates: [], duplicatesByRow: {} }

    const existingPublications = await prisma.publication.findMany({
      where: { doi: { in: dois } },
      select: { doi: true, id: true, title: true },
    })

    const existingDoiSet = new Set(existingPublications.map(p => p.doi.toLowerCase()))

    const duplicates = []
    const duplicatesByRow = {}

    records.forEach((record, index) => {
      if (record.doi && existingDoiSet.has(record.doi.toLowerCase())) {
        const existing = existingPublications.find(p => p.doi.toLowerCase() === record.doi.toLowerCase())
        duplicates.push({
          row: index,
          doi: record.doi,
          existingTitle: existing?.title,
        })
        duplicatesByRow[index] = {
          doi: record.doi,
          existingTitle: existing?.title,
        }
      }
    })

    return { duplicates, duplicatesByRow }
  }

  /**
   * Check for duplicate DOIs within the same file
   */
  checkInternalDuplicates(records) {
    const doiMap = new Map()
    const internalDuplicates = []

    records.forEach((record, index) => {
      if (record.doi) {
        const doiLower = record.doi.toLowerCase()
        if (doiMap.has(doiLower)) {
          internalDuplicates.push({
            row: index,
            duplicateOfRow: doiMap.get(doiLower),
            doi: record.doi,
          })
        } else {
          doiMap.set(doiLower, index)
        }
      }
    })

    return internalDuplicates
  }

  /**
   * Preview parse results without saving
   */
  async previewImport(fileBuffer) {
    const parseResult = this.parseExcelFile(fileBuffer)
    const columnMapping = this.mapColumnsToFields(parseResult.headers)

    // Transform all rows
    const transformedRecords = []
    const validationResults = []

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i]
      const transformed = this.transformRow(row, columnMapping)
      const validation = this.validateRecord(transformed, i + 2) // +2 for 1-based index and header row

      transformedRecords.push(transformed)
      validationResults.push(validation)
    }

    // Check duplicates
    const withDOIs = transformedRecords.filter(r => r.doi)
    const dbDuplicates = await this.checkDuplicateDOIs(transformedRecords)
    const internalDuplicates = this.checkInternalDuplicates(transformedRecords)

    // Separate valid and invalid records
    const validRecords = []
    const invalidRecords = []

    transformedRecords.forEach((record, index) => {
      const validation = validationResults[index]
      const dbDuplicate = dbDuplicates.duplicatesByRow[index]
      const internalDuplicate = internalDuplicates.find(d => d.row === index)

      const status = {
        ...record,
        _rowIndex: index + 2, // Excel row number
        _validation: validation,
        _dbDuplicate: dbDuplicate,
        _internalDuplicate: internalDuplicate,
        _canImport: validation.valid && !dbDuplicate && !internalDuplicate,
      }

      if (status._canImport) {
        validRecords.push(status)
      } else {
        invalidRecords.push(status)
      }
    })

    return {
      totalRows: parseResult.totalRows,
      columnMapping,
      mappedFields: Object.keys(columnMapping),
      unmappedFields: Object.keys(COLUMN_MAPPING).filter(f => !columnMapping[f]),
      validCount: validRecords.length,
      invalidCount: invalidRecords.length,
      dbDuplicateCount: dbDuplicates.duplicates.length,
      internalDuplicateCount: internalDuplicates.length,
      records: transformedRecords,
      validRecords: validRecords,
      invalidRecords: invalidRecords,
      statistics: {
        withDOI: withDOIs.length,
        withoutDOI: transformedRecords.length - withDOIs.length,
        byType: this.getTypeDistribution(transformedRecords),
        byStatus: this.getStatusDistribution(transformedRecords),
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

    // Get unique author emails/names to create or find users
    const authorMap = new Map()
    records.forEach((record) => {
      if (record.email || (record.firstName && record.lastName)) {
        const key = record.email || `${record.firstName} ${record.lastName}`
        if (!authorMap.has(key)) {
          authorMap.set(key, {
            email: record.email,
            firstName: record.firstName || 'Unknown',
            lastName: record.lastName || 'Author',
          })
        }
      }
    })

    // Find or create authors
    for (const [key, authorData] of authorMap.entries()) {
      let user = await prisma.user.findFirst({
        where: authorData.email ? { email: authorData.email } : {
          firstName: authorData.firstName,
          lastName: authorData.lastName,
        },
      })

      if (!user) {
        // Check if user wants auto-creation (for demo, we'll skip this)
        // For production, you might want to create users or flag for manual review
        continue
      }

      authorMap.set(key, { ...authorData, userId: user.id })
    }

    // Insert publications using Prisma transaction
    await prisma.$transaction(async (tx) => {
      for (const record of records) {
        try {
          // Determine author
          let authorId = userId // Default to importer
          if (record.email) {
            const author = authorMap.get(record.email)
            if (author?.userId) authorId = author.userId
          }

          // Check DOI again in transaction
          if (record.doi) {
            const existing = await tx.publication.findUnique({
              where: { doi: record.doi },
            })
            if (existing) {
              result.failed++
              result.errors.push({
                row: record._rowIndex,
                title: record.title,
                error: 'Duplicate DOI in database',
              })
              continue
            }
          }

          // Create publication
          await tx.publication.create({
            data: {
              title: record.title,
              abstract: record.abstract,
              publicationType: record.publicationType,
              journalName: record.journalName,
              conferenceName: record.conferenceName,
              publisher: record.publisher,
              doi: record.doi,
              volume: record.volume,
              issue: record.issue,
              pages: record.pages,
              isbn: record.isbn,
              issn: record.issn,
              publicationDate: record.publicationDate,
              acceptedDate: record.acceptedDate,
              publishedDate: record.publishedDate,
              keywords: record.keywords,
              status: record.status || 'DRAFT',
              citationCount: record.citationCount || 0,
              impactFactor: record.impactFactor,
              quartile: record.quartile,
              scopusIndexed: record.scopusIndexed || false,
              webOfScienceIndexed: record.webOfScienceIndexed || false,
              department: record.department,
              researchArea: record.researchArea,
              fundingAgency: record.fundingAgency,
              fundingAmount: record.fundingAmount,
              fundingProjectNo: record.fundingProjectNo,
              authorId,
            },
          })

          result.imported++
        } catch (error) {
          result.failed++
          result.errors.push({
            row: record._rowIndex,
            title: record.title,
            error: error.message,
          })
        }
      }
    })

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
   * Generate sample template for download
   */
  generateTemplate() {
    const template = [
      {
        title: 'Sample Publication Title',
        publicationType: 'JOURNAL_ARTICLE',
        abstract: 'This is a sample abstract for the publication.',
        journalName: 'Sample Journal Name',
        publisher: 'Sample Publisher',
        doi: 'https://doi.org/10.1234/sample',
        volume: '1',
        issue: '1',
        pages: '1-10',
        publicationDate: '2024-01-15',
        keywords: 'sample, keyword, publication',
        status: 'PUBLISHED',
        citationCount: '10',
        impactFactor: '3.5',
        quartile: 'Q1',
        department: 'Computer Science',
        researchArea: 'Artificial Intelligence',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.edu',
      },
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Publications')

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  }
}

export default new ExcelImportService()
