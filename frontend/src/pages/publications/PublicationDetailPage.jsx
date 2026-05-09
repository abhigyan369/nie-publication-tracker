import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import publicationService from '../../services/publication.service'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import {
  ArrowLeft,
  Loader2,
  Calendar,
  User,
  BookOpen,
  Edit,
  Trash2,
  FileText,
  Users,
  ExternalLink,
  Download,
  Upload,
  Plus,
  X,
} from 'lucide-react'
import { formatDate, getInitials } from '../../lib/utils'
import PublicationModal from './PublicationModal'

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

function PublicationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, showToast } = useAuth()
  const [publication, setPublication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchPublication()
  }, [id])

  const fetchPublication = async () => {
    try {
      const response = await publicationService.getById(id)
      setPublication(response.data.data)
    } catch (error) {
      showToast('Failed to load publication', 'error')
      navigate('/publications')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e, fileType) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      showToast('Only PDF files are allowed', 'error')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('File size must be less than 10MB', 'error')
      return
    }

    setUploading(true)
    try {
      await publicationService.uploadFile(id, file, fileType)
      showToast('File uploaded successfully', 'success')
      fetchPublication()
    } catch (error) {
      showToast('Failed to upload file', 'error')
    } finally {
      setUploading(false)
    }
  }

  const canEdit = user?.role === 'ADMIN' || user?.id === publication?.authorId

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!publication) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Publication not found</p>
        <Link to="/publications">
          <Button variant="outline" className="mt-4">
            Back to Publications
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button & Actions */}
      <div className="flex items-center justify-between">
        <Link to="/publications">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Publications
          </Button>
        </Link>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowEditModal(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        )}
      </div>

      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Left: Info */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{typeLabels[publication.publicationType]}</Badge>
                <Badge variant={statusColors[publication.status]}>
                  {publication.status?.replace(/_/g, ' ')}
                </Badge>
                {publication.quartile && (
                  <Badge variant="info">Quartile {publication.quartile}</Badge>
                )}
              </div>

              <h1 className="text-2xl font-bold text-foreground">{publication.title}</h1>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>
                    {publication.author?.firstName} {publication.author?.lastName}
                  </span>
                </div>
                {publication.publicationDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(publication.publicationDate)}</span>
                  </div>
                )}
                {publication.department && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>{publication.department}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Quick Stats */}
            <div className="flex lg:flex-col gap-4 lg:gap-2">
              <div className="text-center px-4 py-2 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-foreground">{publication.citationCount || 0}</p>
                <p className="text-xs text-muted-foreground">Citations</p>
              </div>
              {publication.impactFactor && (
                <div className="text-center px-4 py-2 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{publication.impactFactor}</p>
                  <p className="text-xs text-muted-foreground">Impact Factor</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Abstract */}
          {publication.abstract && (
            <Card>
              <CardHeader>
                <CardTitle>Abstract</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {publication.abstract}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Publication Details */}
          <Card>
            <CardHeader>
              <CardTitle>Publication Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {publication.journalName && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Journal</p>
                    <p className="font-medium">{publication.journalName}</p>
                  </div>
                </div>
              )}

              {publication.publisher && (
                <div>
                  <p className="text-sm text-muted-foreground">Publisher</p>
                  <p className="font-medium">{publication.publisher}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {publication.doi && (
                  <div>
                    <p className="text-sm text-muted-foreground">DOI</p>
                    <a
                      href={publication.doi}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      {publication.doi}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {publication.issn && (
                  <div>
                    <p className="text-sm text-muted-foreground">ISSN</p>
                    <p className="font-medium">{publication.issn}</p>
                  </div>
                )}

                {publication.volume && (
                  <div>
                    <p className="text-sm text-muted-foreground">Volume</p>
                    <p className="font-medium">{publication.volume}</p>
                  </div>
                )}

                {publication.issue && (
                  <div>
                    <p className="text-sm text-muted-foreground">Issue</p>
                    <p className="font-medium">{publication.issue}</p>
                  </div>
                )}

                {publication.pages && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pages</p>
                    <p className="font-medium">{publication.pages}</p>
                  </div>
                )}
              </div>

              {publication.keywords?.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Keywords</p>
                  <div className="flex flex-wrap gap-2">
                    {publication.keywords.map((keyword, i) => (
                      <Badge key={i} variant="secondary">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Co-Authors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Co-Authors ({publication.coAuthors?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {publication.coAuthors?.length > 0 ? (
                <div className="space-y-3">
                  {publication.coAuthors.map((coauthor, index) => (
                    <div key={coauthor.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {coauthor.user
                          ? getInitials(coauthor.user.firstName, coauthor.user.lastName)
                          : coauthor.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {coauthor.user
                            ? `${coauthor.user.firstName} ${coauthor.user.lastName}`
                            : coauthor.name}
                          {coauthor.isCorresponding && (
                            <Badge variant="info" className="ml-2 text-xs">
                              Corresponding
                            </Badge>
                          )}
                        </p>
                        {coauthor.institution && (
                          <p className="text-sm text-muted-foreground">{coauthor.institution}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No co-authors added</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Indexing */}
          <Card>
            <CardHeader>
              <CardTitle>Indexing & Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Scopus</span>
                <Badge variant={publication.scopusIndexed ? 'success' : 'secondary'}>
                  {publication.scopusIndexed ? 'Indexed' : 'Not Indexed'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Web of Science</span>
                <Badge variant={publication.webOfScienceIndexed ? 'success' : 'secondary'}>
                  {publication.webOfScienceIndexed ? 'Indexed' : 'Not Indexed'}
                </Badge>
              </div>
              {publication.quartile && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quartile</span>
                  <Badge variant="info">{publication.quartile}</Badge>
                </div>
              )}
              {publication.impactFactor && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Impact Factor</span>
                  <span className="font-medium">{publication.impactFactor}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Citations</span>
                <span className="font-medium">{publication.citationCount || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Funding */}
          {publication.fundingAgency && (
            <Card>
              <CardHeader>
                <CardTitle>Funding</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Agency</p>
                  <p className="font-medium">{publication.fundingAgency}</p>
                </div>
                {publication.fundingAmount && (
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-medium">${publication.fundingAmount.toLocaleString()}</p>
                  </div>
                )}
                {publication.fundingProjectNo && (
                  <div>
                    <p className="text-sm text-muted-foreground">Project No.</p>
                    <p className="font-medium">{publication.fundingProjectNo}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Files */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Files
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Paper */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Paper PDF</span>
                </div>
                {publication.paperUrl ? (
                  <a
                    href={publication.paperUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-accent rounded-lg"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                ) : canEdit ? (
                  <label className="p-2 hover:bg-accent rounded-lg cursor-pointer">
                    <Upload className="h-4 w-4" />
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'paper')}
                      disabled={uploading}
                    />
                  </label>
                ) : null}
              </div>

              {/* Certificate */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Certificate</span>
                </div>
                {publication.certificateUrl ? (
                  <a
                    href={publication.certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-accent rounded-lg"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                ) : canEdit ? (
                  <label className="p-2 hover:bg-accent rounded-lg cursor-pointer">
                    <Upload className="h-4 w-4" />
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'certificate')}
                      disabled={uploading}
                    />
                  </label>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(publication.createdAt)}</span>
              </div>
              {publication.acceptedDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Accepted</span>
                  <span>{formatDate(publication.acceptedDate)}</span>
                </div>
              )}
              {publication.publishedDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Published</span>
                  <span>{formatDate(publication.publishedDate)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last Updated</span>
                <span>{formatDate(publication.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <PublicationModal
          publication={publication}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            fetchPublication()
          }}
        />
      )}
    </div>
  )
}

export default PublicationDetailPage
