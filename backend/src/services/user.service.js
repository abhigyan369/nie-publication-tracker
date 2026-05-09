import prisma from '../config/database.config.js'
import { ApiError } from '../utils/response.util.js'

class UserService {
  async getAllUsers(filters) {
    const { page, limit, search, role, department } = filters
    const skip = (page - 1) * limit

    const where = {}

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (role) where.role = role
    if (department) where.department = department

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          department: true,
          designation: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ])

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        publications: {
          select: {
            id: true,
            title: true,
            status: true,
            publicationType: true,
            publicationDate: true,
          },
        },
      },
    })

    if (!user) {
      throw ApiError.notFound('User not found')
    }

    return user
  }

  async updateUser(userId, data, currentUser) {
    // Users can only update their own profile, admins can update anyone
    if (currentUser.id !== userId && currentUser.role !== 'ADMIN') {
      throw ApiError.forbidden('You can only update your own profile')
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw ApiError.notFound('User not found')
    }

    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        designation: true,
      },
    })
  }

  async deleteUser(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw ApiError.notFound('User not found')
    }

    await prisma.user.delete({ where: { id: userId } })
  }
}

export default new UserService()
