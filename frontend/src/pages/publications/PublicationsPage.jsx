import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import publicationService from '../../services/publication.service'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import {
  Plus,
  Search,
  Loader2,
  BookOpen,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  X,
  Calendar,
  User,
  FileText,
} from 'lucide-react'
import { formatDate } from '../../lib/utils'
import PublicationModal from './PublicationModal'
import DeleteModal from '../../components/common/DeleteModal'

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

function PublicationsPage() {
  const navigate = useNavigate()
  const { showToast } = useAuth()
  const [publications, setPublications] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [editPublication, setEditPublication] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePublication, setDeletePublication] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch publications
  const fetchPublications = async (page = 1, filters = {}) => {
    setLoading(true)
    try {
      const params = {
        page,
        limit: 10,
        ...filters,
      }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.type = typeFilter

      const response = await publicationService.getAll(params)
      setPublications(response.data.data.publications)
      setPagination(response.data.data.pagination)
    } catch (error) {
      showToast('Failed to load publications', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useState(() => {
    fetchPublications()
  }, [])

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault()
    fetchPublications(1, {})
  }

  // Handle filter change
  const handleFilterChange = () => {
    fetchPublications(1, {})
  }

  // Clear filters
  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setTypeFilter('')
    fetchPublications(1, {})
  }

  // Open create modal
  const openCreateModal = () => {
    setEditPublication(null)
    setShowModal(true)
  }

  // Open edit modal
  const openEditModal = (pub) => {
    setEditPublication(pub)
    setShowModal(true)
  }

  // Handle modal close
  const handleModalClose = () => {
    setShowModal(false)
    setEditPublication(null)
  }

  // Handle save success
  const handleSaveSuccess = () => {
    handleModalClose()
    fetchPublications(pagination.page, {})
  }

  // Handle delete
  const handleDelete = async () => {
    setDeleting(true)
    try {
      await publicationService.delete(deletePublication.id)
      showToast('Publication deleted successfully', 'success')
      setShowDeleteModal(false)
      setDeletePublication(null)
      fetchPublications(pagination.page, {})
    } catch (error) {
      showToast('Failed to delete publication', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const hasActiveFilters = search || statusFilter || typeFilter

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Publications</h2>
          <p className="text-muted-foreground">
            Manage your research publications
          </p>
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
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by title, journal, DOI..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </form>

            {/* Filter Toggle */}
            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 h-5 w-5 rounded-full bg-primary-foreground text-primary text-xs flex items-center justify-center">
                  {(search ? 1 : 0) + (statusFilter ? 1 : 0) + (typeFilter ? 1 : 0)}
                </span>
              )}
            </Button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    handleFilterChange()
                  }}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value)
                    handleFilterChange()
                  }}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm"
                >
                  <option value="">All Types</option>
                  <option value="JOURNAL_ARTICLE">Journal Article</option>
                  <option value="CONFERENCE_PAPER">Conference Paper</option>
                  <option value="BOOK">Book</option>
                  <option value="BOOK_CHAPTER">Book Chapter</option>
                  <option value="REVIEW_ARTICLE">Review Article</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
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
              All Publications ({pagination.total})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                          <User className="h-3 w-3" />
                          {pub.author?.firstName} {pub.author?.lastName}
                          {pub.coAuthors?.length > 0 && (
                            <span className="text-muted-foreground/50">
                              +{pub.coAuthors.length} co-author{pub.coAuthors.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {typeLabels[pub.publicationType]}
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
                            onClick={() => {
                              setDeletePublication(pub)
                              setShowDeleteModal(true)
                            }}
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
                    Showing {(pagination.page - 1) * 10 + 1} to{' '}
                    {Math.min(pagination.page * 10, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => fetchPublications(pagination.page - 1)}
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
                      onClick={() => fetchPublications(pagination.page + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No publications found</p>
              <Button onClick={openCreateModal}>
                <Plus className="h-4 w-4 mr-2" />
                Add your first publication
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      {showModal && (
        <PublicationModal
          publication={editPublication}
          onClose={handleModalClose}
          onSuccess={handleSaveSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteModal
          title="Delete Publication"
          message={`Are you sure you want to delete "${deletePublication?.title}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => {
            setShowDeleteModal(false)
            setDeletePublication(null)
          }}
          loading={deleting}
        />
      )}
    </div>
  )
}

export default PublicationsPage
