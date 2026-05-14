/**
 * Document Formatter Service
 * 
 * This service is responsible for transforming structured database records
 * (like publications, user profiles) into human-readable text blocks that
 * provide optimal context for the LLM during vector search (RAG).
 */

class DocumentFormatter {
  /**
   * Formats a publication record into a natural language string.
   * @param {Object} publication - The populated publication object from Prisma.
   * @returns {string} The formatted text context.
   */
  formatPublication(publication) {
    if (!publication) return '';

    const lines = [];

    // Faculty Author Details
    if (publication.author) {
      const authorName = `${publication.author.firstName} ${publication.author.lastName}`.trim();
      lines.push(`Faculty: ${authorName}`);
    }

    // Co-Authors
    if (publication.coAuthors && publication.coAuthors.length > 0) {
      const coAuthorNames = publication.coAuthors.map(ca => ca.name).join(', ');
      lines.push(`Co-Authors: ${coAuthorNames}`);
    }

    // Department & Research Area
    if (publication.department) lines.push(`Department: ${publication.department}`);
    if (publication.researchArea) lines.push(`Research Area: ${publication.researchArea}`);

    // Core Publication Details
    lines.push(`Publication Title: ${publication.title}`);
    
    // Format publication type nicely (e.g. JOURNAL_ARTICLE -> Journal Article)
    if (publication.publicationType) {
      const typeStr = publication.publicationType.replace(/_/g, ' ').toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
      lines.push(`Publication Type: ${typeStr}`);
    }

    // Venue details
    if (publication.journalName) lines.push(`Journal: ${publication.journalName}`);
    if (publication.conferenceName) lines.push(`Conference: ${publication.conferenceName}`);
    if (publication.publisher) lines.push(`Publisher: ${publication.publisher}`);

    // Date/Year
    if (publication.publicationDate) {
      const year = new Date(publication.publicationDate).getFullYear();
      lines.push(`Year: ${year}`);
    } else if (publication.publishedDate) {
      const year = new Date(publication.publishedDate).getFullYear();
      lines.push(`Year: ${year}`);
    }

    // Metrics
    if (publication.citationCount !== undefined) {
      lines.push(`Citation Count: ${publication.citationCount}`);
    }
    if (publication.impactFactor) lines.push(`Impact Factor: ${publication.impactFactor}`);
    if (publication.quartile) lines.push(`Quartile: ${publication.quartile}`);
    
    // Status
    if (publication.status) {
      lines.push(`Status: ${publication.status}`);
    }

    // Keywords
    if (publication.keywords && publication.keywords.length > 0) {
      lines.push(`Keywords: ${publication.keywords.join(', ')}`);
    }

    // Abstract (usually keep it at the end because it's long)
    if (publication.abstract) {
      lines.push(`Abstract: ${publication.abstract}`);
    }

    return lines.join('\n');
  }

  /**
   * Formats a faculty profile into a natural language string.
   * @param {Object} user - The populated user object representing a faculty member.
   * @returns {string} The formatted text context.
   */
  formatFacultyProfile(user) {
    if (!user) return '';

    const lines = [];
    const name = `${user.firstName} ${user.lastName}`.trim();
    lines.push(`Faculty Name: ${name}`);
    
    if (user.designation) lines.push(`Designation: ${user.designation}`);
    if (user.department) lines.push(`Department: ${user.department}`);
    
    return lines.join('\n');
  }
}

export default new DocumentFormatter();
