import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { UserRepository } from '../models/UserRepository';

const router = express.Router();

/**
 * @route GET /api/user-details/:id
 * @desc Get detailed information for a specific user (role-specific)
 * @access Private
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Validate userId
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
        error: 'User ID must be a valid positive number'
      });
    }

    console.log(`Fetching details for user ID: ${userId}`);
    const userDetails = await UserRepository.getUserDetailById(userId);
    
    if (!userDetails) {
      console.log(`User not found with ID: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'User does not exist or has been deleted'
      });
    }

    console.log(`Successfully retrieved details for user: ${userDetails.first_name} ${userDetails.last_name} (${userDetails.user_type})`);
    res.json({
      success: true,
      message: 'User details retrieved successfully',
      data: userDetails
    });
  } catch (error) {
    console.error('Error getting user details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user details',
      error: 'Internal server error'
    });
  }
});

/**
 * @route PUT /api/user-details/:id
 * @desc Update user details
 * @access Private
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { first_name, last_name } = req.body;

    // Check if user exists
    const user = await UserRepository.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'User does not exist'
      });
    }

    // Update user basic information (email cannot be modified)
    const updatedUser = await UserRepository.updateUserInfo(userId, {
      first_name,
      last_name
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: 'Internal server error'
    });
  }
});

/**
 * @route POST /api/user-details/:id/reset-password
 * @desc Request password reset for a user (Admin only)
 * @access Private
 */
router.post('/:id/reset-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
        error: 'Insufficient permissions'
      });
    }

    const userId = parseInt(req.params.id);

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id, email FROM "user" WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'User does not exist'
      });
    }

    // Generate reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store reset token
    await pool.query(
      `INSERT INTO password_reset (user_id, reset_token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, resetToken, expiresAt]
    );

    // TODO: Send email with reset link
    // For now, we'll just return the token (in production, this should be sent via email)

    res.json({
      success: true,
      message: 'Password reset link generated successfully',
      data: {
        resetToken, // Remove this in production
        expiresAt
      }
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/user-details/:id/deletion-check
 * @desc Check if user can be deleted (Admin only)
 * @access Private
 */
router.get('/:id/deletion-check', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
        error: 'Insufficient permissions'
      });
    }

    const userId = parseInt(req.params.id);
    
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
        error: 'User ID must be a valid positive number'
      });
    }

    const deletionCheck = await UserRepository.checkUserDeletionConstraints(userId);

    res.json({
      success: true,
      message: 'User deletion check completed',
      data: deletionCheck
    });
  } catch (error) {
    console.error('Error checking user deletion constraints:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check user deletion constraints',
      error: 'Internal server error'
    });
  }
});

/**
 * @route DELETE /api/user-details/:id
 * @desc Delete user (Admin only)
 * @access Private
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
        error: 'Insufficient permissions'
      });
    }

    const userId = parseInt(req.params.id);
    
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
        error: 'User ID must be a valid positive number'
      });
    }

    // Check deletion constraints first
    const deletionCheck = await UserRepository.checkUserDeletionConstraints(userId);
    
    if (!deletionCheck.canDelete) {
      return res.status(400).json({
        success: false,
        message: deletionCheck.message,
        error: 'User cannot be deleted due to existing constraints',
        data: deletionCheck
      });
    }

    // Perform deletion
    await UserRepository.deleteUser(userId);

    res.json({
      success: true,
      message: `User deleted successfully: ${deletionCheck.message}`,
      data: {
        userId,
        userType: deletionCheck.userType
      }
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

export default router;
