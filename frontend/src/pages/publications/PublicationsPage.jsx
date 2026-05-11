import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import publicationService from '../../services/publication.service'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import SearchAutocomplete from '../../components/common/SearchAutocomplete'
import {
  Plus,
  Loader2,
  BookOpen,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  X,
  User,
  AlertCircle,
} from 'lucide-react'
import { formatDate } from '../../lib/utils'
import PublicationModal from './PublicationModal'
import DeleteModal from '../../components/common/DeleteModal'

// ── Constants ────────────────────────────────────────────────────────────────

const statusColors = {
  DRAFT: 'secondary',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'warning',
  REVISION_REQUESTED: 'warning',
  ACCEPTED: 'success',
  PUBLISHED: 'success',
  REJECTED: 'destructive',
}

const typeLabels = {
  JOURNAL_ARTICLE: 'Journal Article',
  CONFERENCE_PAPER: 'Conference Paper',
  BOOK: 'Book',
  BOOK_CHAPTER: 'Book Chapter',
  REVIEW_ARTICLE: 'Review Article',
  CASE_STUDY: 'Case Study',
  SHORT_COMMUNICATION: 'Short Communication',
  LETTER: 'Letter',
  EDITORIAL: 'Editorial',
}

const YEARS = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i)

// ── Component ────────────────────────────────────────────────────────────────

function PublicationsPage() {
  const navigate = useNavigate()
  const { showToast } = useAuth()

  // ── List state ───────────────────────────────────────────────────────────
  const [publications, setPublications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, hasNextPage: false })

  // ── Filter state ─────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // ── Modal state ──────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false)
  const [editPublication, setEditPublication] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePublication, setDeletePublication] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Track in-flight fetch to prevent duplicate calls
  const fetchControllerRef = useRef(null)

  // ── Core fetch ───────────────────────────────────────────────────────────
  /**
   * Fetches publications.
   * Accepts explicit overrides so callers can pass fresh values without
   * depending on React state that may not have updated yet.
   */
  const fetchPublications = useCallback(
    async ({
      page = 1,
      searchVal = search,
      statusVal = statusFilter,
      typeVal = typeFilter,
      yearVal = yearFilter,
    } = {}) => {
      // Cancel any in-flight request
      if (fetchControllerRef.current) fetchControllerRef.current.abort()
      fetchControllerRef.current = new AbortController()

      setLoading(true)
      setError(null)

      try {
        const params = { page, limit: 10 }
        if (searchVal) params.search = searchVal
        if (statusVal) params.status = statusVal
        if (typeVal) params.type = typeVal
        if (yearVal) {
          params.startDate = `${yearVal}-01-01`
          params.endDate = `${yearVal}-12-31`
        }

        const response = await publicationService.getAll(params)

        // API: { success, data: { publications: [], pagination: {} } }
        const payload = response.data?.data
        setPublications(payload?.publications ?? [])
        setPagination(
          payload?.pagination ?? { page: 1, totalPages: 1, total: 0, hasNextPage: false },
        )
      } catch (err) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
        console.error('Failed to load publications:', err)
        setError('Failed to load publications. Please try again.')
        showToast?.('Failed to load publications', 'error')
      } finally {
        setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // intentionally empty — we pass explicit args each time
  )

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPublications()
    return () => fetchControllerRef.current?.abort()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Autocomplete suggestions ─────────────────────────────────────────────
  const fetchSuggestions = useCallback(async (q) => {
    const res = await publicationService.getSuggestions(q, 8)
    return res.data?.data ?? []
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────

  /** Called when user presses Enter or clicks a suggestion */
  const handleSearch = (val) => {
    const v = val ?? search
    setSearch(v)
    fetchPublications({ page: 1, searchVal: v })
  }

  const handleClearSearch = () => {
    setSearch('')
    fetchPublications({ page: 1, searchVal: '' })
  }

  const handleStatusChange = (val) => {
    setStatusFilter(val)
    fetchPublications({ page: 1, statusVal: val })
  }

  const handleTypeChange = (val) => {
    setTypeFilter(val)
    fetchPublications({ page: 1, typeVal: val })
  }

  const handleYearChange = (val) => {
    setYearFilter(val)
    fetchPublications({ page: 1, yearVal: val })
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setTypeFilter('')
    setYearFilter('')
    fetchPublications({ page: 1, searchVal: '', statusVal: '', typeVal: '', yearVal: '' })
  }

  const handlePageChange = (newPage) => {
    fetchPublications({ page: newPage })
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const openCreateModal = () => { setEditPublication(null); setShowModal(true) }
  const openEditModal = (pub) => { setEditPublication(pub); setShowModal(true) }
  const handleModalClose = () => { setShowModal(false); setEditPublication(null) }
  const handleSaveSuccess = () => {
    handleModalClose()
    fetchPublications({ page: pagination.page })
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await publicationService.delete(deletePublication.id)
      showToast?.('Publication deleted successfully', 'success')
      setShowDeleteModal(false)
      setDeletePublication(null)
      fetchPublications({ page: pagination.page })
    } catch {
      showToast?.('Failed to delete publication', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const hasActiveFilters = search || statusFilter || typeFilter || yearFilter
  const activeFilterCount = [search, statusFilter, typeFilter, yearFilter].filter(Boolean).length

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Publications</h2>
          <p className="text-muted-foreground">Manage your research publications</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Publication
        </Button>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Autocomplete search */}
            <SearchAutocomplete
              value={search}
              onChange={setSearch}
              onSearch={handleSearch}
              onClear={handleClearSearch}
              fetchSuggestions={fetchSuggestions}
              placeholder="Search by title, author, keyword…"
              debounceMs={300}
            />

            {/* Filter toggle */}
            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters((v) => !v)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 h-5 w-5 rounded-full bg-primary-foreground text-primary text-xs flex items-center justify-center font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Expanded filter panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
              {/* Status */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="REVISION_REQUESTED">Revision Requested</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">All Types</option>
                  <option value="JOURNAL_ARTICLE">Journal Article</option>
                  <option value="CONFERENCE_PAPER">Conference Paper</option>
                  <option value="BOOK">Book</option>
                  <option value="BOOK_CHAPTER">Book Chapter</option>
                  <option value="REVIEW_ARTICLE">Review Article</option>
                  <option value="CASE_STUDY">Case Study</option>
                  <option value="SHORT_COMMUNICATION">Short Communication</option>
                  <option value="LETTER">Letter</option>
                  <option value="EDITORIAL">Editorial</option>
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Year</label>
                <select
                  value={yearFilter}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">All Years</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Clear */}
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full" disabled={!hasActiveFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3">
              {search && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-3 py-1 font-medium">
                  Search: "{search}"
                  <button onClick={handleClearSearch} className="hover:text-primary/60 ml-1"><X className="h-3 w-3" /></button>
                </span>
              )}
              {statusFilter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-3 py-1 font-medium">
                  Status: {statusFilter.replace(/_/g, ' ')}
                  <button onClick={() => handleStatusChange('')} className="hover:text-primary/60 ml-1"><X className="h-3 w-3" /></button>
                </span>
              )}
              {typeFilter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-3 py-1 font-medium">
                  Type: {typeLabels[typeFilter] ?? typeFilter}
                  <button onClick={() => handleTypeChange('')} className="hover:text-primary/60 ml-1"><X className="h-3 w-3" /></button>
                </span>
              )}
              {yearFilter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-3 py-1 font-medium">
                  Year: {yearFilter}
                  <button onClick={() => handleYearChange('')} className="hover:text-primary/60 ml-1"><X className="h-3 w-3" /></button>
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publications Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              All Publications
              {!loading && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({pagination.total})
                </span>
              )}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-3">
                <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
                <p className="text-sm text-destructive font-medium">{error}</p>
                <Button variant="outline" size="sm" onClick={() => fetchPublications()}>
                  Retry
                </Button>
              </div>
            </div>
          ) : publications.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {publications.map((pub) => (
                    <TableRow key={pub.id} className="group">
                      <TableCell>
                        <Link
                          to={`/publications/${pub.id}`}
                          className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 block"
                        >
                          {pub.title}
                        </Link>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <User className="h-3 w-3 shrink-0" />
                          {pub.author?.firstName} {pub.author?.lastName}
                          {pub.coAuthors?.length > 0 && (
                            <span className="text-muted-foreground/50">
                              +{pub.coAuthors.length} co-author{pub.coAuthors.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">
                          {typeLabels[pub.publicationType] ?? pub.publicationType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[pub.status]}>
                          {pub.status?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(pub.publicationDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/publications/${pub.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditModal(pub)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => { setDeletePublication(pub); setShowDeleteModal(true) }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * 10 + 1}–
                    {Math.min(pagination.page * 10, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => handlePageChange(pagination.page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.hasNextPage}
                      onClick={() => handlePageChange(pagination.page + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-2 font-medium">
                {hasActiveFilters ? 'No publications match your search' : 'No publications yet'}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear filters
                </Button>
              ) : (
                <Button onClick={openCreateModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add your first publication
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Modal */}
      {showModal && (
        <PublicationModal
          publication={editPublication}
          onClose={handleModalClose}
          onSuccess={handleSaveSuccess}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteModal && (
        <DeleteModal
          title="Delete Publication"
          message={`Are you sure you want to delete "${deletePublication?.title}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => { setShowDeleteModal(false); setDeletePublication(null) }}
          loading={deleting}
        />
      )}
    </div>
  )
}

export default PublicationsPage
