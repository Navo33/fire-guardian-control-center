import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { UserRepository } from '../models/UserRepository';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

/**
 * @route GET /api/users
 * @desc Get all users (Super Admin only)
 * @access Private
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user is super admin
    if (req.user?.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super Admin role required.',
        error: 'Insufficient permissions'
      });
    }

    const users = await UserRepository.getAllUsers();
    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: users
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/users/stats
 * @desc Get user statistics (Super Admin only)
 * @access Private
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user is super admin
    if (req.user?.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super Admin role required.',
        error: 'Insufficient permissions'
      });
    }

    const stats = await UserRepository.getUserStats();
    res.json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user statistics',
      error: 'Internal server error'
    });
  }
});

/**
 * @route PUT /api/users/:id/status
 * @desc Update user status (lock/unlock) (Super Admin only)
 * @access Private
 */
router.put('/:id/status', 
  authenticateToken,
  [
    body('isLocked')
      .isBoolean()
      .withMessage('isLocked must be a boolean value')
  ],
  async (req: Request, res: Response) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: errors.array()
        });
      }

      // Check if user is super admin
      if (req.user?.user_type !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Super Admin role required.',
          error: 'Insufficient permissions'
        });
      }

      const userId = parseInt(req.params.id);
      const { isLocked } = req.body;

      // Check if user exists
      const user = await UserRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'User does not exist'
        });
      }

      // Prevent self-locking
      if (userId === req.user?.userId && isLocked) {
        return res.status(400).json({
          success: false,
          message: 'Cannot lock your own account',
          error: 'Self-modification not allowed'
        });
      }

      await UserRepository.updateUserStatus(userId, isLocked);
      
      res.json({
        success: true,
        message: `User ${isLocked ? 'locked' : 'unlocked'} successfully`,
        data: { userId, isLocked }
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user status',
        error: 'Internal server error'
      });
    }
  }
);

/**
 * @route DELETE /api/users/:id
 * @desc Soft delete user (Super Admin only)
 * @access Private
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user is super admin
    if (req.user?.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super Admin role required.',
        error: 'Insufficient permissions'
      });
    }

    const userId = parseInt(req.params.id);

    // Check if user exists
    const user = await UserRepository.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'User does not exist'
      });
    }

    // Prevent self-deletion
    if (userId === req.user?.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account',
        error: 'Self-modification not allowed'
      });
    }

    await UserRepository.softDelete(userId);
    
    res.json({
      success: true,
      message: 'User deleted successfully',
      data: { userId }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/users/vendors/stats
 * @desc Get vendor statistics (Super Admin only)
 * @access Private
 */
router.get('/vendors/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user is super admin
    if (req.user?.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super Admin role required.',
        error: 'Insufficient permissions'
      });
    }

    const stats = await UserRepository.getVendorStats();
    res.json({
      success: true,
      message: 'Vendor statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('Error getting vendor stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve vendor statistics',
      error: 'Internal server error'
    });
  }
});

export default router;