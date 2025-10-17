/**
 * System Settings Routes
 * Handles system-wide configuration settings (admin only)
 */

import express, { Request, Response } from 'express';
import { SystemSettingsRepository } from '../models/SystemSettingsRepository';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  
  if (user.userType !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  
  next();
};

/**
 * Get all system settings
 * GET /api/settings
 */
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const settings = await SystemSettingsRepository.getAllSettings();

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system settings'
    });
  }
});

/**
 * Get security settings
 * GET /api/settings/security
 */
router.get('/security', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const securitySettings = await SystemSettingsRepository.getSecuritySettings();

    res.json({
      success: true,
      data: securitySettings
    });
  } catch (error) {
    console.error('Error fetching security settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security settings'
    });
  }
});

/**
 * Get a specific setting by key
 * GET /api/settings/:key
 */
router.get('/:key', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    const setting = await SystemSettingsRepository.getSettingByKey(key);

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch setting'
    });
  }
});

/**
 * Update a system setting
 * PUT /api/settings/:key
 */
router.put('/:key', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const userId = (req as any).user.userId;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Setting value is required'
      });
    }

    // Validate setting value based on key
    if (key === 'session_timeout_minutes' || 
        key === 'password_expiry_days' || 
        key === 'password_min_length' ||
        key === 'max_failed_login_attempts' ||
        key === 'account_lock_duration_minutes') {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 0) {
        return res.status(400).json({
          success: false,
          message: 'Value must be a non-negative number'
        });
      }
    }

    if (key === 'require_password_change_on_first_login') {
      if (value !== 'true' && value !== 'false') {
        return res.status(400).json({
          success: false,
          message: 'Value must be "true" or "false"'
        });
      }
    }

    const updatedSetting = await SystemSettingsRepository.updateSetting(key, {
      settingValue: String(value),
      updatedBy: userId
    });

    if (!updatedSetting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: updatedSetting
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update setting'
    });
  }
});

/**
 * Update multiple settings at once
 * PUT /api/settings
 */
router.put('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    const userId = (req as any).user.userId;

    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Settings array is required'
      });
    }

    // Validate settings format
    for (const setting of settings) {
      if (!setting.key || setting.value === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Each setting must have a key and value'
        });
      }
    }

    const updatedSettings = await SystemSettingsRepository.updateMultipleSettings(
      settings,
      userId
    );

    res.json({
      success: true,
      message: `${updatedSettings.length} setting(s) updated successfully`,
      data: updatedSettings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
});

export default router;
