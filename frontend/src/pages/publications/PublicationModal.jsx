import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import publicationService from '../../services/publication.service'
import { Button } from '../../components/ui/Button'
import { X, Loader2, Plus, Trash2, Upload, User } from 'lucide-react'
import { cn } from '../../lib/utils'

const PUBLICATION_TYPES = [
  { value: 'JOURNAL_ARTICLE', label: 'Journal Article' },
  { value: 'CONFERENCE_PAPER', label: 'Conference Paper' },
  { value: 'BOOK', label: 'Book' },
  { value: 'BOOK_CHAPTER', label: 'Book Chapter' },
  { value: 'REVIEW_ARTICLE', label: 'Review Article' },
  { value: 'CASE_STUDY', label: 'Case Study' },
  { value: 'SHORT_COMMUNICATION', label: 'Short Communication' },
  { value: 'LETTER', label: 'Letter' },
  { value: 'EDITORIAL', label: 'Editorial' },
]

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'REVISION_REQUESTED', label: 'Revision Requested' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'REJECTED', label: 'Rejected' },
]

const QUARTILE_OPTIONS = [
  { value: '', label: 'Select Quartile' },
  { value: 'Q1', label: 'Q1' },
  { value: 'Q2', label: 'Q2' },
  { value: 'Q3', label: 'Q3' },
  { value: 'Q4', label: 'Q4' },
]

function PublicationModal({ publication, onClose, onSuccess }) {
  const { showToast } = useAuth()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState({})

  const [formData, setFormData] = useState({
    title: publication?.title || '',
    abstract: publication?.abstract || '',
    publicationType: publication?.publicationType || '',
    status: publication?.status || 'DRAFT',
    journalName: publication?.journalName || '',
    conferenceName: publication?.conferenceName || '',
    publisher: publication?.publisher || '',
    doi: publication?.doi || '',
    volume: publication?.volume || '',
    issue: publication?.issue || '',
    pages: publication?.pages || '',
    publicationDate: publication?.publicationDate?.split('T')[0] || '',
    department: publication?.department || '',
    researchArea: publication?.researchArea || '',
    impactFactor: publication?.impactFactor || '',
    quartile: publication?.quartile || '',
    citationCount: publication?.citationCount || 0,
    fundingAgency: publication?.fundingAgency || '',
    fundingAmount: publication?.fundingAmount || '',
    fundingProjectNo: publication?.fundingProjectNo || '',
    keywords: publication?.keywords?.join(', ') || '',
    coAuthors: publication?.coAuthors || [],
  })

  const [newCoAuthor, setNewCoAuthor] = useState({
    name: '',
    email: '',
    institution: '',
    isCorresponding: false,
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const validateStep = (currentStep) => {
    const newErrors = {}

    if (currentStep === 1) {
      if (!formData.title.trim()) newErrors.title = 'Title is required'
      if (!formData.publicationType) newErrors.publicationType = 'Publication type is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  const handleAddCoAuthor = () => {
    if (!newCoAuthor.name.trim()) {
      showToast('Co-author name is required', 'error')
      return
    }

    setFormData((prev) => ({
      ...prev,
      coAuthors: [...prev.coAuthors, { ...newCoAuthor, id: Date.now() }],
    }))
    setNewCoAuthor({ name: '', email: '', institution: '', isCorresponding: false })
  }

  const handleRemoveCoAuthor = (index) => {
    setFormData((prev) => ({
      ...prev,
      coAuthors: prev.coAuthors.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async () => {
    if (!validateStep(1)) return

    setLoading(true)
    try {
      const submitData = {
        ...formData,
        keywords: formData.keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        impactFactor: formData.impactFactor ? parseFloat(formData.impactFactor) : null,
        fundingAmount: formData.fundingAmount ? parseFloat(formData.fundingAmount) : null,
        coAuthors: formData.coAuthors.map(({ id, ...rest }) => rest),
      }

      if (publication?.id) {
        await publicationService.update(publication.id, submitData)
        showToast('Publication updated successfully', 'success')
      } else {
        await publicationService.create(submitData)
        showToast('Publication created successfully', 'success')
      }

      onSuccess()
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to save publication', 'error')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { id: 1, title: 'Basic Info' },
    { id: 2, title: 'Details' },
    { id: 3, title: 'Authors & Metrics' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {publication ? 'Edit Publication' : 'Add Publication'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Step {step} of {steps.length}: {steps[step - 1].title}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Step Indicators */}
        <div className="flex px-6 pt-4">
          {steps.map((s) => (
            <div key={s.id} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step >= s.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {s.id}
              </div>
              {s.id < steps.length && (
                <div
                  className={cn(
                    'w-16 h-0.5 mx-2',
                    step > s.id ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter publication title"
                  className={cn(
                    'flex w-full rounded-lg border bg-background px-4 py-2.5 text-sm',
                    errors.title ? 'border-destructive' : 'border-input'
                  )}
                />
                {errors.title && <p className="text-sm text-destructive mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Publication Type <span className="text-destructive">*</span>
                </label>
                <select
                  name="publicationType"
                  value={formData.publicationType}
                  onChange={handleChange}
                  className={cn(
                    'flex w-full rounded-lg border bg-background px-4 py-2.5 text-sm',
                    errors.publicationType ? 'border-destructive' : 'border-input'
                  )}
                >
                  <option value="">Select publication type</option>
                  {PUBLICATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.publicationType && (
                  <p className="text-sm text-destructive mt-1">{errors.publicationType}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="flex w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Abstract
                </label>
                <textarea
                  name="abstract"
                  value={formData.abstract}
                  onChange={handleChange}
                  placeholder="Enter abstract (optional)"
                  rows={4}
                  className="flex w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Journal/Conference Name
                  </label>
                  <input
                    type="text"
                    name="journalName"
                    value={formData.journalName}
                    onChange={handleChange}
                    placeholder="Journal or conference name"
                    className="flex w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Publisher
                  </label>
                  <input
                    type="text"
                    name="publisher"
                    value={formData.publisher}
                    onChange={handleChange}
                    placeholder="Publisher name"
                    className="flex w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  DOI
                </label>
                <input
                  type="text"
                  name="doi"
                  value={formData.doi}
                  onChange={handleChange}
                  placeholder="https://doi.org/..."
                  className="flex w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Volume</label>
                  <input
                    type="text"
                    name="volume"
                    value={formData.volume}
                    onChange={handleChange}
                    className="flex w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Issue</label>
                  <input
                    type="text"
                    name="issue"
                    value={formData.issue}
                    onChange={handleChange}
                    className="flex w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Pages</label>
                  <input
                    type="text"
                    name="pages"
                    value={formData.pages}
                    onChange={handleChange}
                    placeholder="1-10"
                    className="flex w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Publication Date
                  </label>
                  <input
                    type="date"
                    name="publicationDate"
                    value={formData.publicationDate}
                    onChange={handleChange}
                    className="flex w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Impact Factor
                  </label>
                  <input
                    type="number"
                    name="impactFactor"
                    value={formData.impactFactor}
                    onChange={handleChange}
                    step="0.01"
                    className="flex w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Department
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="flex w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Research Area
                  </label>
                  <input
                    type="text"
                    name="researchArea"
                    value={formData.researchArea}
                    onChange={handleChange}
                    className="flex w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Keywords (comma separated)
                </label>
                <input
                  type="text"
                  name="keywords"
                  value={formData.keywords}
                  onChange={handleChange}
                  placeholder="machine learning, AI, deep learning"
                  className="flex w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm"
                />
              </div>
            </div>
          )}

          {/* Step 3: Authors & Metrics */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Co-Authors */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Co-Authors
                </label>

                {/* Existing Co-Authors */}
                {formData.coAuthors.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {formData.coAuthors.map((author, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {author.name}
                            {author.isCorresponding && (
                              <span className="text-xs text-primary ml-2">(Corresponding)</span>
                            )}
                          </p>
                          {author.institution && (
                            <p className="text-xs text-muted-foreground">{author.institution}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveCoAuthor(index)}
                          className="p-1 hover:bg-destructive/10 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Co-Author Form */}
                <div className="p-4 border border-dashed border-border rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newCoAuthor.name}
                      onChange={(e) =>
                        setNewCoAuthor((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Name"
                      className="flex rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    />
                    <input
                      type="email"
                      value={newCoAuthor.email}
                      onChange={(e) =>
                        setNewCoAuthor((prev) => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="Email (optional)"
                      className="flex rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newCoAuthor.institution}
                      onChange={(e) =>
                        setNewCoAuthor((prev) => ({ ...prev, institution: e.target.value }))
                      }
                      placeholder="Institution"
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddCoAuthor}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Funding */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Funding Information
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    name="fundingAgency"
                    value={formData.fundingAgency}
                    onChange={handleChange}
                    placeholder="Funding Agency"
                    className="flex rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    name="fundingAmount"
                    value={formData.fundingAmount}
                    onChange={handleChange}
                    placeholder="Amount"
                    className="flex rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    name="fundingProjectNo"
                    value={formData.fundingProjectNo}
                    onChange={handleChange}
                    placeholder="Project No."
                    className="flex rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Additional Metrics */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Citation Count
                </label>
                <input
                  type="number"
                  name="citationCount"
                  value={formData.citationCount}
                  onChange={handleChange}
                  className="flex w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <Button
            variant="outline"
            onClick={step === 1 ? onClose : handleBack}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          {step < steps.length ? (
            <Button onClick={handleNext}>
              Next
              <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : publication ? (
                'Update Publication'
              ) : (
                'Create Publication'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default PublicationModal
