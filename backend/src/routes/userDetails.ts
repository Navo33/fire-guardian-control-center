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

    const userDetails = await UserRepository.getUserDetailById(userId);
    
    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'User does not exist'
      });
    }

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
    const { first_name, last_name, email } = req.body;

    // Check if user exists
    const user = await UserRepository.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'User does not exist'
      });
    }

    // Update user basic information
    const updatedUser = await UserRepository.updateUserInfo(userId, {
      first_name,
      last_name,
      email
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

export default router;
