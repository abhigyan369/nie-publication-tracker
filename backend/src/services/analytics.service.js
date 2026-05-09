import prisma from '../config/database.config.js'
import { ApiError } from '../utils/response.util.js'
import logger from '../utils/logger.util.js'

class AnalyticsService {
  /**
   * Get comprehensive dashboard overview
   */
  async getDashboardOverview(userId = null, filters = {}) {
    const { startDate, endDate, department } = filters
    const where = this.buildWhereClause(userId, { startDate, endDate, department })

    const [
      totalPublications,
      publishedCount,
      pendingCount,
      rejectedCount,
      totalCitations,
      avgImpactFactor,
      quartileDistribution,
      typeDistribution,
      yearlyTrends,
    ] = await Promise.all([
      prisma.publication.count({ where: { ...where, isDeleted: false } }),
      prisma.publication.count({ where: { ...where, status: 'PUBLISHED', isDeleted: false } }),
      prisma.publication.count({ where: { ...where, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] }, isDeleted: false } }),
      prisma.publication.count({ where: { ...where, status: 'REJECTED', isDeleted: false } }),
      prisma.publication.aggregate({ where: { ...where, isDeleted: false }, _sum: { citationCount: true } }),
      prisma.publication.aggregate({
        where: { ...where, impactFactor: { not: null }, isDeleted: false },
        _avg: { impactFactor: true },
      }),
      this.getQuartileDistribution(where),
      this.getTypeDistribution(where),
      this.getYearlyTrends(where),
    ])

    // Calculate acceptance rate
    const totalReviewed = publishedCount + rejectedCount
    const acceptanceRate = totalReviewed > 0 ? ((publishedCount / totalReviewed) * 100).toFixed(1) : 0

    return {
      overview: {
        totalPublications,
        publishedCount,
        pendingCount,
        rejectedCount,
        totalCitations: totalCitations._sum.citationCount || 0,
        avgImpactFactor: avgImpactFactor._avg.impactFactor || 0,
        acceptanceRate,
      },
      quartileDistribution,
      typeDistribution,
      yearlyTrends,
    }
  }

  /**
   * Get department-wise analytics
   */
  async getDepartmentAnalytics(filters = {}) {
    const { startDate, endDate } = filters
    const where = this.buildWhereClause(null, { startDate, endDate })

    // Get publications grouped by department
    const publications = await prisma.publication.findMany({
      where: { ...where, isDeleted: false, department: { not: null } },
      select: {
        department: true,
        status: true,
        citationCount: true,
        impactFactor: true,
        publicationType: true,
      },
    })

    // Aggregate by department
    const departmentStats = publications.reduce((acc, pub) => {
      const dept = pub.department || 'Unassigned'
      if (!acc[dept]) {
        acc[dept] = {
          department: dept,
          total: 0,
          published: 0,
          pending: 0,
          rejected: 0,
          citations: 0,
          impactFactorSum: 0,
          impactFactorCount: 0,
          types: {},
        }
      }

      acc[dept].total++
      acc[dept].citations += pub.citationCount || 0

      if (pub.impactFactor) {
        acc[dept].impactFactorSum += pub.impactFactor
        acc[dept].impactFactorCount++
      }

      if (pub.status === 'PUBLISHED') acc[dept].published++
      if (['SUBMITTED', 'UNDER_REVIEW'].includes(pub.status)) acc[dept].pending++
      if (pub.status === 'REJECTED') acc[dept].rejected++

      if (!acc[dept].types[pub.publicationType]) {
        acc[dept].types[pub.publicationType] = 0
      }
      acc[dept].types[pub.publicationType]++

      return acc
    }, {})

    // Calculate averages and format
    return Object.values(departmentStats).map((dept) => ({
      department: dept.department,
      totalPublications: dept.total,
      published: dept.published,
      pending: dept.pending,
      rejected: dept.rejected,
      totalCitations: dept.citations,
      avgImpactFactor: dept.impactFactorCount > 0
        ? (dept.impactFactorSum / dept.impactFactorCount).toFixed(2)
        : 0,
      publicationsByType: Object.entries(dept.types).map(([type, count]) => ({
        type,
        count,
      })),
    })).sort((a, b) => b.totalPublications - a.totalPublications)
  }

  /**
   * Get monthly publication trends
   */
  async getMonthlyTrends(filters = {}) {
    const { startDate, endDate, department } = filters
    const where = this.buildWhereClause(null, { startDate, endDate, department })

    const publications = await prisma.publication.findMany({
      where: { ...where, isDeleted: false, publicationDate: { not: null } },
      select: {
        publicationDate: true,
        status: true,
        citationCount: true,
      },
    })

    // Group by month
    const monthlyData = publications.reduce((acc, pub) => {
      if (pub.publicationDate) {
        const month = new Date(pub.publicationDate).toISOString().slice(0, 7)
        if (!acc[month]) {
          acc[month] = { month, count: 0, citations: 0, published: 0 }
        }
        acc[month].count++
        acc[month].citations += pub.citationCount || 0
        if (pub.status === 'PUBLISHED') acc[month].published++
      }
      return acc
    }, {})

    // Fill in missing months and sort
    const sortedMonths = Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12) // Last 12 months

    return sortedMonths
  }

  /**
   * Get yearly trends (last 5 years)
   */
  async getYearlyTrends(where) {
    const fiveYearsAgo = new Date()
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)

    const publications = await prisma.publication.findMany({
      where: {
        ...where,
        isDeleted: false,
        publicationDate: { gte: fiveYearsAgo },
      },
      select: {
        publicationDate: true,
        status: true,
        citationCount: true,
        impactFactor: true,
      },
    })

    // Group by year
    const yearlyData = publications.reduce((acc, pub) => {
      if (pub.publicationDate) {
        const year = new Date(pub.publicationDate).getFullYear().toString()
        if (!acc[year]) {
          acc[year] = {
            year,
            total: 0,
            published: 0,
            citations: 0,
            impactFactorSum: 0,
            impactFactorCount: 0,
          }
        }
        acc[year].total++
        acc[year].citations += pub.citationCount || 0
        if (pub.status === 'PUBLISHED') acc[year].published++

        if (pub.impactFactor) {
          acc[year].impactFactorSum += pub.impactFactor
          acc[year].impactFactorCount++
        }
      }
      return acc
    }, {})

    return Object.values(yearlyData)
      .sort((a, b) => a.year.localeCompare(b.year))
      .map((year) => ({
        year: year.year,
        total: year.total,
        published: year.published,
        citations: year.citations,
        avgImpactFactor: year.impactFactorCount > 0
          ? (year.impactFactorSum / year.impactFactorCount).toFixed(2)
          : 0,
      }))
  }

  /**
   * Get citation analysis
   */
  async getCitationAnalysis(filters = {}) {
    const { startDate, endDate, department } = filters
    const where = this.buildWhereClause(null, { startDate, endDate, department })

    const publications = await prisma.publication.findMany({
      where: { ...where, isDeleted: false, citationCount: { gt: 0 } },
      select: {
        id: true,
        title: true,
        citationCount: true,
        author: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { citationCount: 'desc' },
      take: 20,
    })

    // Calculate citation statistics
    const allCitations = publications.map((p) => p.citationCount)
    const maxCitations = Math.max(...allCitations, 1)
    const totalCitations = allCitations.reduce((a, b) => a + b, 0)
    const avgCitations = allCitations.length > 0 ? totalCitations / allCitations.length : 0

    // Distribution buckets
    const distribution = {
      '0-10': 0,
      '11-50': 0,
      '51-100': 0,
      '100+': 0,
    }

    allCitations.forEach((count) => {
      if (count <= 10) distribution['0-10']++
      else if (count <= 50) distribution['11-50']++
      else if (count <= 100) distribution['51-100']++
      else distribution['100+']++
    })

    return {
      topPublications: publications.slice(0, 10),
      distribution: Object.entries(distribution).map(([range, count]) => ({
        range,
        count,
      })),
      statistics: {
        totalCitations,
        avgCitations: avgCitations.toFixed(1),
        maxCitations,
        publicationsWithCitations: allCitations.length,
      },
    }
  }

  /**
   * Get quartile distribution
   */
  async getQuartileDistribution(where) {
    const publications = await prisma.publication.findMany({
      where: { ...where, isDeleted: false, quartile: { not: null } },
      select: { quartile: true },
    })

    const distribution = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
    publications.forEach((pub) => {
      if (pub.quartile) distribution[pub.quartile]++
    })

    return Object.entries(distribution).map(([quartile, count]) => ({
      quartile,
      count,
    }))
  }

  /**
   * Get publication type distribution
   */
  async getTypeDistribution(where) {
    const publications = await prisma.publication.groupBy({
      by: ['publicationType'],
      where: { ...where, isDeleted: false },
      _count: { id: true },
    })

    return publications.map((type) => ({
      type: type.publicationType,
      count: type._count.id,
    }))
  }

  /**
   * Get faculty leaderboard
   */
  async getFacultyLeaderboard(filters = {}) {
    const { startDate, endDate, department, limit = 10 } = filters
    const where = this.buildWhereClause(null, { startDate, endDate, department })

    const publications = await prisma.publication.findMany({
      where: { ...where, isDeleted: false },
      select: {
        authorId: true,
        status: true,
        citationCount: true,
        impactFactor: true,
        author: {
          select: {
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
    })

    // Aggregate by author
    const authorStats = publications.reduce((acc, pub) => {
      const authorId = pub.authorId
      if (!acc[authorId]) {
        acc[authorId] = {
          authorId,
          name: `${pub.author.firstName} ${pub.author.lastName}`,
          department: pub.author.department,
          total: 0,
          published: 0,
          citations: 0,
          impactFactorSum: 0,
          impactFactorCount: 0,
        }
      }

      acc[authorId].total++
      acc[authorId].citations += pub.citationCount || 0
      if (pub.status === 'PUBLISHED') acc[authorId].published++

      if (pub.impactFactor) {
        acc[authorId].impactFactorSum += pub.impactFactor
        acc[authorId].impactFactorCount++
      }

      return acc
    }, {})

    // Calculate score and sort
    return Object.values(authorStats)
      .map((author) => ({
        ...author,
        avgImpactFactor: author.impactFactorCount > 0
          ? (author.impactFactorSum / author.impactFactorCount).toFixed(2)
          : 0,
        // Composite score: weighted sum of publications, citations, and impact factor
        score: (author.published * 10) + (author.citations) + (author.impactFactorCount > 0 ? author.impactFactorSum / author.impactFactorCount * 5 : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  /**
   * Get research area analytics
   */
  async getResearchAreaAnalytics(filters = {}) {
    const { startDate, endDate } = filters
    const where = this.buildWhereClause(null, { startDate, endDate })

    const publications = await prisma.publication.findMany({
      where: { ...where, isDeleted: false, researchArea: { not: null } },
      select: {
        researchArea: true,
        status: true,
        citationCount: true,
      },
    })

    // Group by research area
    const areaStats = publications.reduce((acc, pub) => {
      const area = pub.researchArea || 'Unassigned'
      if (!acc[area]) {
        acc[area] = {
          researchArea: area,
          total: 0,
          published: 0,
          citations: 0,
        }
      }

      acc[area].total++
      acc[area].citations += pub.citationCount || 0
      if (pub.status === 'PUBLISHED') acc[area].published++

      return acc
    }, {})

    return Object.values(areaStats)
      .sort((a, b) => b.total - a.total)
      .slice(0, 15)
  }

  /**
   * Get funding analytics
   */
  async getFundingAnalytics(filters = {}) {
    const { startDate, endDate } = filters
    const where = this.buildWhereClause(null, { startDate, endDate })

    const publications = await prisma.publication.findMany({
      where: { ...where, isDeleted: false, fundingAgency: { not: null } },
      select: {
        fundingAgency: true,
        fundingAmount: true,
        fundingProjectNo: true,
        citationCount: true,
        impactFactor: true,
        status: true,
      },
    })

    // Group by funding agency
    const agencyStats = publications.reduce((acc, pub) => {
      const agency = pub.fundingAgency || 'Unknown'
      if (!acc[agency]) {
        acc[agency] = {
          agency: agency,
          count: 0,
          totalAmount: 0,
          citations: 0,
          impactFactorSum: 0,
          impactFactorCount: 0,
          published: 0,
        }
      }

      acc[agency].count++
      acc[agency].totalAmount += pub.fundingAmount || 0
      acc[agency].citations += pub.citationCount || 0

      if (pub.impactFactor) {
        acc[agency].impactFactorSum += pub.impactFactor
        acc[agency].impactFactorCount++
      }

      if (pub.status === 'PUBLISHED') acc[agency].published++

      return acc
    }, {})

    return Object.values(agencyStats)
      .map((agency) => ({
        agency: agency.agency,
        publications: agency.count,
        totalFunding: agency.totalAmount,
        avgFunding: agency.count > 0 ? (agency.totalAmount / agency.count).toFixed(0) : 0,
        citations: agency.citations,
        avgImpactFactor: agency.impactFactorCount > 0
          ? (agency.impactFactorSum / agency.impactFactorCount).toFixed(2)
          : 0,
        published: agency.published,
      }))
      .sort((a, b) => b.totalFunding - a.totalFunding)
  }

  /**
   * Get acceptance/rejection ratio
   */
  async getAcceptanceRatio(filters = {}) {
    const { startDate, endDate, department } = filters
    const where = this.buildWhereClause(null, { startDate, endDate, department })

    const [published, rejected, underReview, revisionRequested] = await Promise.all([
      prisma.publication.count({ where: { ...where, status: 'PUBLISHED', isDeleted: false } }),
      prisma.publication.count({ where: { ...where, status: 'REJECTED', isDeleted: false } }),
      prisma.publication.count({ where: { ...where, status: 'UNDER_REVIEW', isDeleted: false } }),
      prisma.publication.count({ where: { ...where, status: 'REVISION_REQUESTED', isDeleted: false } }),
    ])

    const total = published + rejected
    const acceptanceRate = total > 0 ? ((published / total) * 100).toFixed(1) : 0
    const rejectionRate = total > 0 ? ((rejected / total) * 100).toFixed(1) : 0

    return {
      published,
      rejected,
      underReview,
      revisionRequested,
      acceptanceRate,
      rejectionRate,
      data: [
        { name: 'Accepted', value: published, color: '#22c55e' },
        { name: 'Rejected', value: rejected, color: '#ef4444' },
        { name: 'Under Review', value: underReview, color: '#f59e0b' },
        { name: 'Revision', value: revisionRequested, color: '#3b82f6' },
      ],
    }
  }

  // Helper: Build where clause from filters
  buildWhereClause(userId, filters = {}) {
    const where = {}
    if (userId) where.authorId = userId

    if (filters.startDate || filters.endDate) {
      where.publicationDate = {}
      if (filters.startDate) where.publicationDate.gte = new Date(filters.startDate)
      if (filters.endDate) where.publicationDate.lte = new Date(filters.endDate)
    }

    if (filters.department) {
      where.department = { contains: filters.department, mode: 'insensitive' }
    }

    return where
  }
}

export default new AnalyticsService()
