import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create Admin user
  const adminPassword = await bcrypt.hash('Admin@123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nie.edu' },
    update: {},
    create: {
      email: 'admin@nie.edu',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMIN',
      department: 'Administration',
      designation: 'System Administrator',
      isActive: true,
      isEmailVerified: true,
    },
  })
  console.log('Created admin:', admin.email)

  // Create HOD user
  const hodPassword = await bcrypt.hash('Hod@1234', 12)
  const hod = await prisma.user.upsert({
    where: { email: 'hod@nie.edu' },
    update: {},
    create: {
      email: 'hod@nie.edu',
      password: hodPassword,
      firstName: 'Department',
      lastName: 'Head',
      role: 'HOD',
      department: 'Computer Science',
      designation: 'Head of Department',
      isActive: true,
      isEmailVerified: true,
    },
  })
  console.log('Created HOD:', hod.email)

  // Create Faculty user
  const facultyPassword = await bcrypt.hash('Faculty@123', 12)
  const faculty = await prisma.user.upsert({
    where: { email: 'faculty@nie.edu' },
    update: {},
    create: {
      email: 'faculty@nie.edu',
      password: facultyPassword,
      firstName: 'John',
      lastName: 'Faculty',
      role: 'FACULTY',
      department: 'Computer Science',
      designation: 'Associate Professor',
      isActive: true,
      isEmailVerified: true,
    },
  })
  console.log('Created faculty:', faculty.email)

  // Create Reviewer user
  const reviewerPassword = await bcrypt.hash('Reviewer@123', 12)
  const reviewer = await prisma.user.upsert({
    where: { email: 'reviewer@nie.edu' },
    update: {},
    create: {
      email: 'reviewer@nie.edu',
      password: reviewerPassword,
      firstName: 'Review',
      lastName: 'Manager',
      role: 'REVIEWER',
      department: 'Research',
      designation: 'Publication Reviewer',
      isActive: true,
      isEmailVerified: true,
    },
  })
  console.log('Created reviewer:', reviewer.email)

  // Create departments
  const departments = [
    { name: 'Computer Science', code: 'CS' },
    { name: 'Information Technology', code: 'IT' },
    { name: 'Electronics', code: 'EC' },
    { name: 'Mechanical', code: 'ME' },
    { name: 'Civil', code: 'CE' },
    { name: 'Chemistry', code: 'CH' },
    { name: 'Physics', code: 'PH' },
    { name: 'Mathematics', code: 'MA' },
  ]

  let csDeptId
  for (const dept of departments) {
    const created = await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: { name: dept.name, code: dept.code },
    })
    if (dept.name === 'Computer Science') {
      csDeptId = created.id
    }
  }
  console.log('Created departments')

  // Create sample publications
  const publications = [
    {
      title: 'Deep Learning for Image Recognition: A Comprehensive Survey',
      abstract: 'This paper presents a comprehensive survey of deep learning techniques for image recognition tasks.',
      publicationType: 'JOURNAL_ARTICLE',
      journalName: 'IEEE Transactions on Pattern Analysis',
      publisher: 'IEEE',
      doi: 'https://doi.org/10.1109/TPAMI.2024.1234567',
      volume: '45',
      issue: '3',
      pages: '123-145',
      publicationDate: new Date('2024-01-15'),
      status: 'PUBLISHED',
      citationCount: 85,
      impactFactor: 16.5,
      quartile: 'Q1',
      scopusIndexed: true,
      webOfScienceIndexed: true,
      department: 'Computer Science',
      researchArea: 'Artificial Intelligence',
      authorId: faculty.id,
    },
    {
      title: 'Machine Learning in Healthcare: Challenges and Opportunities',
      abstract: 'An exploration of ML applications in healthcare systems.',
      publicationType: 'JOURNAL_ARTICLE',
      journalName: 'Journal of Medical Systems',
      publisher: 'Springer',
      doi: 'https://doi.org/10.1007/s10916-024-00123-4',
      volume: '48',
      issue: '2',
      pages: '45-67',
      publicationDate: new Date('2024-02-20'),
      status: 'PUBLISHED',
      citationCount: 42,
      impactFactor: 4.2,
      quartile: 'Q2',
      scopusIndexed: true,
      webOfScienceIndexed: false,
      department: 'Computer Science',
      researchArea: 'Machine Learning',
      authorId: faculty.id,
    },
    {
      title: 'Novel Approaches to Network Security in IoT',
      abstract: 'This paper proposes novel security mechanisms for Internet of Things networks.',
      publicationType: 'CONFERENCE_PAPER',
      conferenceName: 'International Conference on Security',
      publisher: 'ACM',
      doi: 'https://doi.org/10.1145/1234567.1234568',
      pages: '234-245',
      publicationDate: new Date('2024-03-10'),
      status: 'UNDER_REVIEW',
      citationCount: 0,
      impactFactor: 0,
      scopusIndexed: true,
      webOfScienceIndexed: false,
      department: 'Information Technology',
      researchArea: 'Cybersecurity',
      authorId: hod.id,
    },
  ]

  for (const pub of publications) {
  await prisma.publication.upsert({
    where: { doi: pub.doi },
    update: {},
    create: pub,
  })
}
  console.log('Created sample publications')

  console.log('Seeding completed!')
  console.log('\nDefault credentials:')
  console.log('Admin:    admin@nie.edu / Admin@123')
  console.log('HOD:      hod@nie.edu / Hod@1234')
  console.log('Faculty:  faculty@nie.edu / Faculty@123')
  console.log('Reviewer: reviewer@nie.edu / Reviewer@123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })