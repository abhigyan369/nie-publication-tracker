import prisma from '../config/database.config.js'
import { ApiError } from '../utils/response.util.js'

class DepartmentService {
  async getAllDepartments() {
    return prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
  }

  async getDepartmentById(departmentId) {
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        faculty: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    })

    if (!department) {
      throw ApiError.notFound('Department not found')
    }

    return department
  }

  async createDepartment(data) {
    const existing = await prisma.department.findFirst({
      where: { OR: [{ name: data.name }, { code: data.code }] },
    })

    if (existing) {
      throw ApiError.conflict('Department with this name or code already exists')
    }

    return prisma.department.create({ data })
  }

  async updateDepartment(departmentId, data) {
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    })

    if (!department) {
      throw ApiError.notFound('Department not found')
    }

    return prisma.department.update({
      where: { id: departmentId },
      data,
    })
  }

  async deleteDepartment(departmentId) {
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    })

    if (!department) {
      throw ApiError.notFound('Department not found')
    }

    // Soft delete
    return prisma.department.update({
      where: { id: departmentId },
      data: { isActive: false },
    })
  }
}

export default new DepartmentService()
