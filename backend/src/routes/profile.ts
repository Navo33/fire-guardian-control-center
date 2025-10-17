/**
 * Profile Routes
 * Handles user profile management and password changes
 */

import express, { Request, Response } from 'express';
import { ProfileRepository } from '../models/ProfileRepository';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

/**
 * Get current user's profile
 * GET /api/profile
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const profile = await ProfileRepository.getProfile(userId);

    if (!profile) {
      return res.status(404).json({ 
        success: false, 
        message: 'Profile not found' 
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch profile' 
    });
  }
});

/**
 * Update current user's profile
 * PUT /api/profile
 */
router.put('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { firstName, lastName, phone, avatarUrl } = req.body;

    // Validate input
    if (firstName !== undefined && typeof firstName !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'First name must be a string'
      });
    }

    if (lastName !== undefined && typeof lastName !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Last name must be a string'
      });
    }

    if (phone !== undefined && phone !== null) {
      if (typeof phone !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Phone must be a string'
        });
      }
      
      // Validate Sri Lankan phone format (+94XXXXXXXXX)
      const phoneRegex = /^\+94\d{9}$/;
      if (phone && !phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Phone must be in Sri Lankan format: +94XXXXXXXXX (e.g., +94771234567)'
        });
      }
    }

    if (avatarUrl !== undefined && avatarUrl !== null && typeof avatarUrl !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Avatar URL must be a string'
      });
    }

    const updatedProfile = await ProfileRepository.updateProfile(userId, {
      firstName,
      lastName,
      phone,
      avatarUrl
    });

    if (!updatedProfile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

/**
 * Change password
 * POST /api/profile/change-password
 */
router.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Current password is required'
      });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    if (!confirmPassword || typeof confirmPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Confirm password is required'
      });
    }

    // Check if new password and confirm password match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match'
      });
    }

    // Change password
    const result = await ProfileRepository.changePassword(userId, currentPassword, newPassword);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        errors: result.errors
      });
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

/**
 * Get password policy
 * GET /api/profile/password-policy
 */
router.get('/password-policy', authenticateToken, async (req: Request, res: Response) => {
  try {
    const policy = await ProfileRepository.getPasswordPolicy();

    res.json({
      success: true,
      data: policy
    });
  } catch (error) {
    console.error('Error fetching password policy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch password policy'
    });
  }
});

/**
 * Check if password is expired
 * GET /api/profile/password-expired
 */
router.get('/password-expired', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const isExpired = await ProfileRepository.isPasswordExpired(userId);

    res.json({
      success: true,
      data: {
        isExpired
      }
    });
  } catch (error) {
    console.error('Error checking password expiry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check password expiry'
    });
  }
});

export default router;
