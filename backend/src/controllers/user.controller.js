import userService from '../services/user.service.js'
import { ApiResponse } from '../utils/response.util.js'

class UserController {
  async getAllUsers(req, res, next) {
    try {
      const { page, limit, search, role, department } = req.query

      const result = await userService.getAllUsers({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search,
        role,
        department,
      })

      return ApiResponse.paginated(res, result.users, result.pagination)
    } catch (error) {
      next(error)
    }
  }

  async getUserById(req, res, next) {
    try {
      const user = await userService.getUserById(req.params.id)

      return ApiResponse.success(res, user)
    } catch (error) {
      next(error)
    }
  }

  async updateUser(req, res, next) {
    try {
      const user = await userService.updateUser(req.params.id, req.body, req.user)

      return ApiResponse.success(res, user, 'User updated successfully')
    } catch (error) {
      next(error)
    }
  }

  async deleteUser(req, res, next) {
    try {
      await userService.deleteUser(req.params.id)

      return ApiResponse.success(res, null, 'User deleted successfully')
    } catch (error) {
      next(error)
    }
  }
}

export default new UserController()
