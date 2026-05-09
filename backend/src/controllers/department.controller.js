import departmentService from '../services/department.service.js'
import { ApiResponse } from '../utils/response.util.js'

class DepartmentController {
  async getAllDepartments(req, res, next) {
    try {
      const departments = await departmentService.getAllDepartments()

      return ApiResponse.success(res, departments)
    } catch (error) {
      next(error)
    }
  }

  async getDepartmentById(req, res, next) {
    try {
      const department = await departmentService.getDepartmentById(req.params.id)

      return ApiResponse.success(res, department)
    } catch (error) {
      next(error)
    }
  }

  async createDepartment(req, res, next) {
    try {
      const department = await departmentService.createDepartment(req.body)

      return ApiResponse.created(res, department, 'Department created successfully')
    } catch (error) {
      next(error)
    }
  }

  async updateDepartment(req, res, next) {
    try {
      const department = await departmentService.updateDepartment(req.params.id, req.body)

      return ApiResponse.success(res, department, 'Department updated successfully')
    } catch (error) {
      next(error)
    }
  }

  async deleteDepartment(req, res, next) {
    try {
      await departmentService.deleteDepartment(req.params.id)

      return ApiResponse.success(res, null, 'Department deleted successfully')
    } catch (error) {
      next(error)
    }
  }
}

export default new DepartmentController()
